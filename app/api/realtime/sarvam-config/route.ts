import { NextResponse } from "next/server";

export async function GET() {
  const hasApiKey = Boolean(process.env.SARVAM_API_KEY);

  return NextResponse.json({
    configured: hasApiKey,
  });
}
