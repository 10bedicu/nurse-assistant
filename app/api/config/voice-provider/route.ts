import { NextRequest, NextResponse } from "next/server";

// In-memory storage for voice provider preference
// In production, this would be stored in the database
let voiceProviderConfig: string = process.env.NEXT_PUBLIC_VOICE_PROVIDER || "openai";

export async function GET() {
  try {
    const provider = voiceProviderConfig;

    return NextResponse.json({
      provider,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching voice provider config:", error);
    return NextResponse.json(
      { error: "Failed to fetch voice provider configuration" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json();

    if (!["openai", "sarvam"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid voice provider. Must be 'openai' or 'sarvam'" },
        { status: 400 }
      );
    }

    voiceProviderConfig = provider;

    return NextResponse.json({
      provider: voiceProviderConfig,
      success: true,
      note: "Configuration saved in memory. For production, ensure the Prisma migration has been run to persist to database.",
    });
  } catch (error) {
    console.error("Error updating voice provider config:", error);
    return NextResponse.json(
      { error: "Failed to update voice provider configuration" },
      { status: 500 }
    );
  }
}
