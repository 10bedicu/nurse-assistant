/**
 * OpenAI Provider for AI SDK
 * Supports GPT-4, GPT-4o, GPT-3.5, etc.
 */
import { createOpenAI } from "@ai-sdk/openai";

export function getOpenAIModel(modelId: string, apiKey: string) {
  const openai = createOpenAI({ apiKey });
  return openai(modelId);
}

export function getOpenAIEmbeddingModel(modelId: string, apiKey: string) {
  const openai = createOpenAI({ apiKey });
  return openai.embedding(modelId);
}
