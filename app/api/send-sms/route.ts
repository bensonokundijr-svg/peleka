import { NextRequest, NextResponse } from "next/server";

// africastalking ships as CommonJS with no official TS types
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AfricasTalking = require("africastalking") as (config: {
  apiKey: string;
  username: string;
}) => {
  SMS: {
    send: (opts: {
      to: string[];
      message: string;
      from?: string;
    }) => Promise<unknown>;
  };
};

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY!,
  username: process.env.AT_USERNAME!,
});

function normalizePhone(raw: string): string {
  const stripped = raw.replace(/\s+/g, "");
  if (stripped.startsWith("0")) return "+254" + stripped.slice(1);
  if (!stripped.startsWith("+")) return "+" + stripped;
  return stripped;
}

export async function POST(request: NextRequest) {
  // ── Env check ──────────────────────────────────────────────────────────────
  console.log("[send-sms] AT_API_KEY present:", !!process.env.AT_API_KEY);
  console.log("[send-sms] AT_USERNAME:", process.env.AT_USERNAME);

  const body = await request.json().catch(() => null);

  if (!body?.to || !body?.message) {
    console.log("[send-sms] Bad request — missing to or message. Body:", body);
    return NextResponse.json(
      { error: "Missing required fields: to, message" },
      { status: 400 }
    );
  }

  const to = normalizePhone(String(body.to));
  const { message } = body as { message: string };

  // ── Request details ─────────────────────────────────────────────────────────
  console.log("[send-sms] Sending to:", to);
  console.log("[send-sms] Message:", message);

  try {
    const options = {
      to: [to],
      message,
      from: process.env.AT_SENDER_ID,
    };
    const result = await at.SMS.send(options);

    // ── Full SDK response ────────────────────────────────────────────────────
    console.log("[send-sms] SDK response:", JSON.stringify(result, null, 2));

    return NextResponse.json({ success: true, result });
  } catch (err) {
    // ── Full SDK error ───────────────────────────────────────────────────────
    console.error("[send-sms] SDK error:", err);
    const errMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
