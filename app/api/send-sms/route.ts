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

type PhoneResult = { phone: string; skipSms: boolean };

function normalizePhone(raw: string): PhoneResult {
  const stripped = raw.replace(/[\s\-()]/g, "");
  if (stripped.startsWith("0"))    return { phone: "+254" + stripped.slice(1), skipSms: false };
  if (stripped.startsWith("+254")) return { phone: stripped,                   skipSms: false };
  if (stripped.startsWith("+"))    return { phone: stripped,                   skipSms: true  }; // international — skip AT SMS
  return { phone: "+" + stripped, skipSms: false };
}

export async function POST(request: NextRequest) {
  // ── Env check ──────────────────────────────────────────────────────────────
  console.log("[send-sms] AT_API_KEY present:", !!process.env.AT_API_KEY);
  console.log("[send-sms] AT_USERNAME:", process.env.AT_USERNAME);

  const body = await request.json().catch(() => null);

  if (!body?.to || (!body?.trackingUrl && !body?.message)) {
    console.log("[send-sms] Bad request — missing to or (trackingUrl / message). Body:", body);
    return NextResponse.json(
      { error: "Missing required fields: to, and either trackingUrl or message" },
      { status: 400 }
    );
  }

  const { phone: to, skipSms } = normalizePhone(String(body.to));
  if (skipSms) {
    console.log("[send-sms] Skipping international number:", to);
    return NextResponse.json({ success: true, skipped: true, reason: "international_number" });
  }
  const message: string = body.message
    ? String(body.message)
    : (() => {
        const name = (body.businessName as string | undefined)?.trim() || "Peleka";
        return `Your order from ${name} is on the way! Track your delivery here: ${body.trackingUrl}`;
      })();

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
