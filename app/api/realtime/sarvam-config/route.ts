import { NextResponse } from "next/server";

export async function GET() {
  const hasApiKey = Boolean(process.env.NEXT_PUBLIC_SARVAM_API_KEY);

  return NextResponse.json({
    configured: hasApiKey,
  });
}
