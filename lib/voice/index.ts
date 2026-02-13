import type { VoiceEngine, VoiceEngineCallbacks } from "./types";
import { OpenAIVoiceEngine } from "./openai-engine";
import { SarvamVoiceEngine } from "./sarvam-engine";
import { LLMS } from "@/utils/constants";

export type { VoiceEngine, VoiceEngineCallbacks };

export async function createVoiceEngine(
  callbacks: VoiceEngineCallbacks,
  modelId?: string,
): Promise<VoiceEngine> {
  let provider = "openai"; // Default provider

  // If modelId is provided, use voice provider from model config
  if (modelId && modelId in LLMS) {
    const modelConfig = LLMS[modelId as keyof typeof LLMS];
    if ("voiceProvider" in modelConfig && modelConfig.voiceProvider) {
      provider = modelConfig.voiceProvider;
    }
  } else if (modelId) {
    console.warn(
      `Model ${modelId} not found in LLMS config, using default provider`,
    );
  }

  if (provider === "sarvam") {
    return new SarvamVoiceEngine(callbacks);
  }

  return new OpenAIVoiceEngine(callbacks);
}
