import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { comment?: string } | null;
  const comment = body?.comment?.trim();

  console.log("[sentiment] Sentiment route called");
  console.log("[sentiment] ANTHROPIC_API_KEY present:", !!process.env.ANTHROPIC_API_KEY);
  console.log("[sentiment] comment received:", comment);

  if (!comment) {
    return NextResponse.json({ sentiment: "neutral", topics: [] });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  // Note: api.anthropic.com may be blocked on some local networks — this will work on Vercel even if it times out in dev.
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `Analyze the sentiment of this customer feedback comment. Be accurate - if the customer expresses disappointment, frustration, anger, complaints about service quality, damaged items, rudeness, or says they won't return, that is NEGATIVE sentiment. Only return "positive" if the feedback is genuinely happy. Return "neutral" only for factual comments with no clear emotion.

Respond with ONLY raw JSON, no markdown, no code fences, no explanation:
{"sentiment":"positive"|"neutral"|"negative","topics":["topic1","topic2","topic3"]}

Use at most 3 topics, each 2-3 words.

Feedback to analyze: "${comment.replace(/"/g, "'")}"`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[sentiment] Claude API error:", res.status, err);
      return NextResponse.json({ sentiment: "neutral", topics: [] });
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    const text = data.content.find((c) => c.type === "text")?.text ?? "{}";
    console.log("[sentiment] raw Claude response:", text);

    // Strip markdown code fences in case the model wraps the JSON anyway
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as { sentiment?: string; topics?: string[] };
    console.log("[sentiment] parsed:", parsed);
    return NextResponse.json({
      sentiment: parsed.sentiment ?? "neutral",
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 3) : [],
    });
  } catch (err) {
    console.error("[sentiment] error:", err);
    return NextResponse.json({ sentiment: "neutral", topics: [] });
  }
}
