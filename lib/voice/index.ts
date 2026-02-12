import type { VoiceEngine, VoiceEngineCallbacks } from "./types";
import { OpenAIVoiceEngine } from "./openai-engine";
import { SarvamVoiceEngine } from "./sarvam-engine";

export type { VoiceEngine, VoiceEngineCallbacks };

// Cache for the provider configuration to avoid repeated API calls
let providerCache: { value: string; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getConfiguredProvider(): Promise<string> {
  // Return cached value if still valid
  if (
    providerCache &&
    Date.now() - providerCache.timestamp < CACHE_DURATION
  ) {
    return providerCache.value;
  }

  try {
    // Try to fetch from database config first
    const response = await fetch("/api/config/voice-provider", {
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json();
      if (data.provider) {
        providerCache = { value: data.provider, timestamp: Date.now() };
        return data.provider;
      }
    }
  } catch (error) {
    console.warn("Failed to fetch voice provider config:", error);
  }

  // Fall back to environment variable
  const envProvider = process.env.NEXT_PUBLIC_VOICE_PROVIDER || "openai";
  providerCache = { value: envProvider, timestamp: Date.now() };
  return envProvider;
}

export async function createVoiceEngine(
  callbacks: VoiceEngineCallbacks,
): Promise<VoiceEngine> {
  const provider = await getConfiguredProvider();

  if (provider === "sarvam") {
    return new SarvamVoiceEngine(callbacks);
  }

  return new OpenAIVoiceEngine(callbacks);
}
