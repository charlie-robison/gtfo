import { NextRequest, NextResponse } from "next/server";

const OPENCLAW_URL =
  process.env.OPENCLAW_URL ??
  "https://cathodically-percolable-keaton.ngrok-free.dev/v1/responses";

const OPENCLAW_TOKEN =
  process.env.OPENCLAW_TOKEN ??
  "2f9966c337d88718b426df605894d5d87701a6a812005d5d";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(OPENCLAW_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENCLAW_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.text();

  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
