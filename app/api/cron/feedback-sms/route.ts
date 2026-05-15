import { NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AfricasTalking = require("africastalking") as (config: {
  apiKey: string;
  username: string;
}) => {
  SMS: {
    send: (opts: { to: string[]; message: string; from?: string }) => Promise<unknown>;
  };
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Firebase REST helpers (bypasses client auth — requires database secret) ──

const DB_URL = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "").replace(/\/$/, "");
const DB_SECRET = process.env.FIREBASE_DATABASE_SECRET ?? "";

async function fbGet<T>(path: string): Promise<T | null> {
  if (!DB_URL || !DB_SECRET) return null;
  try {
    const res = await fetch(`${DB_URL}/${path}.json?auth=${DB_SECRET}`);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch { return null; }
}

async function fbDelete(path: string) {
  if (!DB_URL || !DB_SECRET) return;
  await fetch(`${DB_URL}/${path}.json?auth=${DB_SECRET}`, { method: "DELETE" }).catch(() => {});
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Vercel signs cron requests with CRON_SECRET in the Authorization header
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!DB_URL || !DB_SECRET) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_FIREBASE_DATABASE_URL or FIREBASE_DATABASE_SECRET not set" },
      { status: 500 }
    );
  }

  type QueueEntry = {
    scheduledFor: number;
    ownerUid: string;
    customerPhone: string;
    customerName: string;
    businessName: string;
    deliveryId: string;
  };

  const queue = await fbGet<Record<string, QueueEntry>>("feedback-queue");
  if (!queue) return NextResponse.json({ processed: 0, sent: 0 });

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const at = AfricasTalking({
    apiKey: process.env.AT_API_KEY!,
    username: process.env.AT_USERNAME!,
  });

  const now = Date.now();
  const due = Object.entries(queue).filter(([, item]) => item.scheduledFor <= now);

  let sent = 0;
  for (const [deliveryId, item] of due) {
    const firstName = item.customerName.split(" ")[0] || item.customerName;
    const name = item.businessName || "Peleka";
    const feedbackUrl = `${appUrl}/feedback/${deliveryId}`;
    const message = `Hi ${firstName}, how was your delivery from ${name}? Rate your experience: ${feedbackUrl}`;

    try {
      const phone = item.customerPhone.replace(/\s+/g, "");
      const normalized = phone.startsWith("0") ? "+254" + phone.slice(1) : phone.startsWith("+") ? phone : "+" + phone;
      await at.SMS.send({ to: [normalized], message, from: process.env.AT_SENDER_ID });
      sent++;
    } catch (err) {
      console.error(`[feedback-sms] SMS failed for ${deliveryId}:`, err);
    }

    // Always remove from queue whether SMS succeeded or not to avoid retries
    await fbDelete(`feedback-queue/${deliveryId}`);
  }

  return NextResponse.json({ processed: due.length, sent });
}
