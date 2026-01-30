/**
 * Anthropic Provider for AI SDK
 * Supports Claude 3, Claude 3.5, Claude 4, etc.
 */
import { createAnthropic } from "@ai-sdk/anthropic";

export function getAnthropicModel(modelId: string, apiKey: string) {
  const anthropic = createAnthropic({ apiKey });
  return anthropic(modelId);
}
