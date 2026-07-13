import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) return NextResponse.json({ error: "Missing url param" }, { status: 400 });

  const isTwilio = url.startsWith("https://api.twilio.com/");
  const isR2     = url.includes(".r2.dev/");

  if (!isTwilio && !isR2) {
    return NextResponse.json({ error: "Invalid recording URL" }, { status: 400 });
  }

  const fetchHeaders: Record<string, string> = {};

  if (isTwilio) {
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token) {
      fetchHeaders["Authorization"] = `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
    }
  }

  // Forward Range header so browser can seek
  const range = req.headers.get("range");
  if (range) fetchHeaders["Range"] = range;

  const res = await fetch(url, { headers: fetchHeaders });

  if (!res.ok && res.status !== 206) {
    return NextResponse.json({ error: `Twilio returned ${res.status}` }, { status: res.status });
  }

  const responseHeaders: Record<string, string> = {
    "Content-Type":  res.headers.get("Content-Type")  ?? "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
  };

  // Forward length + range headers so browser can show duration and seek
  const contentLength = res.headers.get("Content-Length");
  const contentRange  = res.headers.get("Content-Range");
  if (contentLength) responseHeaders["Content-Length"] = contentLength;
  if (contentRange)  responseHeaders["Content-Range"]  = contentRange;

  return new NextResponse(res.body, { status: res.status, headers: responseHeaders });
}
