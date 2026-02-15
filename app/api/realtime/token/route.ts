import { LLMS } from "@/utils/constants";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // projectId is optional - not used for token generation but may be needed for future features
    const body = await req.json().catch(() => ({}));
    const { projectId } = body;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OPENAI_API_KEY environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error: API key not found" },
        { status: 500 },
      );
    }

    // Generate ephemeral token from OpenAI
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model:
              Object.keys(LLMS)
                .find((key) => {
                  const config = LLMS[key as keyof typeof LLMS];
                  return "realtime" in config && config.realtime === true;
                })
                ?.split(":")[1] || "NA",
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return NextResponse.json(
        {
          error: `OpenAI API error: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("OpenAI response:", data);

    if (!data.value) {
      console.error("No value (token) in response:", data);
      return NextResponse.json(
        { error: "Invalid response from OpenAI API" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      token: data.value,
      expires_at: data.expires_at,
    });
  } catch (error) {
    console.error("Error generating ephemeral token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 },
    );
  }
}
