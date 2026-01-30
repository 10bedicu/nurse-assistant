/**
 * Google AI Provider for AI SDK
 * Supports Gemini 1.5, Gemini 2, etc.
 */
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function getGoogleModel(modelId: string, apiKey: string) {
  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelId);
}

export function getGoogleEmbeddingModel(modelId: string, apiKey: string) {
  const google = createGoogleGenerativeAI({ apiKey });
  return google.textEmbeddingModel(modelId);
}
