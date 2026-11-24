import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ── Auth ───────────────────────────────────────────────────────────────────────

function verifySecret(header: string | null): boolean {
  const secret = process.env.KPI_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(secret));
  } catch {
    return false;
  }
}

// ── Route ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!verifySecret(req.headers.get("x-webhook-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const eventType: string = body?.type ?? "";

  switch (eventType) {
    // handlers will be added here one by one
    default:
      return NextResponse.json({ error: `Unknown event type: ${eventType}` }, { status: 400 });
  }
}
