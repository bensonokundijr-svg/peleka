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

async function fbSet(path: string, data: unknown) {
  if (!DB_URL || !DB_SECRET) return;
  await fetch(`${DB_URL}/${path}.json?auth=${DB_SECRET}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {});
}

async function fbDelete(path: string) {
  if (!DB_URL || !DB_SECRET) return;
  await fetch(`${DB_URL}/${path}.json?auth=${DB_SECRET}`, { method: "DELETE" }).catch(() => {});
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
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
    deliveredAt?: number;
    scheduledFor?: number; // legacy — kept for backward compat
    ownerUid: string;
    customerPhone: string;
    customerName: string;
    businessName: string;
    deliveryId: string;
  };

  type BusinessProfile = { feedbackDelay?: number };

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
  const profileCache = new Map<string, BusinessProfile>();

  async function getProfile(ownerUid: string): Promise<BusinessProfile> {
    if (profileCache.has(ownerUid)) return profileCache.get(ownerUid)!;
    const p = await fbGet<BusinessProfile>(`businesses/${ownerUid}/profile`);
    const result = p ?? {};
    profileCache.set(ownerUid, result);
    return result;
  }

  let processed = 0;
  let sent = 0;

  for (const [deliveryId, item] of Object.entries(queue)) {
    const profile = await getProfile(item.ownerUid);
    const feedbackDelay = profile.feedbackDelay ?? 120; // default 2 hours

    // User opted out — remove silently, no notification
    if (feedbackDelay === 0) {
      await fbDelete(`feedback-queue/${deliveryId}`);
      continue;
    }

    // Compute due time: new entries use deliveredAt + delay; legacy entries baked scheduledFor already
    const dueAt = item.deliveredAt != null
      ? item.deliveredAt + feedbackDelay * 60_000
      : (item.scheduledFor ?? 0);

    if (dueAt > now) continue; // Not yet due — leave in queue

    processed++;
    const firstName = item.customerName.split(" ")[0] || item.customerName;
    const name = item.businessName || "Peleka";
    const feedbackUrl = `${appUrl}/feedback/${deliveryId}`;
    const message = `Hi ${firstName}, how was your delivery from ${name}? Rate your experience: ${feedbackUrl}`;

    // Normalize phone — skip AT SMS for international (+non-254), use WhatsApp notification instead
    const rawPhone = item.customerPhone.replace(/[\s\-()]/g, "");
    let normalized: string;
    let skipSms = false;
    if (rawPhone.startsWith("0"))    { normalized = "+254" + rawPhone.slice(1); }
    else if (rawPhone.startsWith("+254")) { normalized = rawPhone; }
    else if (rawPhone.startsWith("+"))    { normalized = rawPhone; skipSms = true; }
    else                                  { normalized = "+" + rawPhone; }

    if (skipSms) {
      await fbSet(`businesses/${item.ownerUid}/notifications/${deliveryId}`, {
        type: "feedback_sms_failed",
        customerName: item.customerName,
        customerPhone: item.customerPhone,
        deliveryId,
        feedbackUrl,
        createdAt: Date.now(),
      });
      await fbDelete(`feedback-queue/${deliveryId}`);
      continue;
    }

    try {
      await at.SMS.send({ to: [normalized], message, from: process.env.AT_SENDER_ID });
      sent++;
    } catch (err) {
      console.error(`[feedback-sms] SMS failed for ${deliveryId}:`, err);
      await fbSet(`businesses/${item.ownerUid}/notifications/${deliveryId}`, {
        type: "feedback_sms_failed",
        customerName: item.customerName,
        customerPhone: item.customerPhone,
        deliveryId,
        feedbackUrl,
        createdAt: Date.now(),
      });
    }

    await fbDelete(`feedback-queue/${deliveryId}`);
  }

  return NextResponse.json({ processed, sent });
}
