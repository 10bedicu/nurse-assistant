import type { VoiceEngine, VoiceEngineCallbacks } from "./types";
import { OpenAIVoiceEngine } from "./openai-engine";
import { SarvamVoiceEngine } from "./sarvam-engine";

export type { VoiceEngine, VoiceEngineCallbacks };

export function createVoiceEngine(
  callbacks: VoiceEngineCallbacks,
): VoiceEngine {
  const provider = process.env.NEXT_PUBLIC_VOICE_PROVIDER || "openai";

  if (provider === "sarvam") {
    return new SarvamVoiceEngine(callbacks);
  }

  return new OpenAIVoiceEngine(callbacks);
}
