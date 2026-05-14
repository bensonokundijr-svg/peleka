import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  console.log("[places-autocomplete] called with:", body?.input);

  if (!body?.input) {
    return NextResponse.json({ error: "input required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  console.log("[places-autocomplete] API key present:", !!apiKey);
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      input: body.input,
      locationBias: {
        circle: {
          center: { latitude: -1.2921, longitude: 36.8219 },
          radius: 50000.0,
        },
      },
      includedRegionCodes: ["KE"],
    }),
  });

  console.log("[places-autocomplete] Google API status:", res.status);

  if (!res.ok) {
    const err = await res.text();
    console.error("[places-autocomplete] Google API error:", err);
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  console.log("[places-autocomplete] Google API response:", JSON.stringify(data, null, 2));
  return NextResponse.json(data);
}
