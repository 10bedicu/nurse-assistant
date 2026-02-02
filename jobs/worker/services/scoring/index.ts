/**
 * Scoring Service - Orchestrates all scoring methods
 *
 * Combines multiple scoring approaches:
 * 1. BLEU Score - N-gram precision based
 * 2. Cosine Similarity - Embedding or TF-IDF based
 * 3. LLM-as-Judge - AI evaluation with reasoning
 */
import { calculateBleuScore, calculateSmoothBleuScore } from "./bleu";
import {
  calculateEmbeddingCosineSimilarity,
  calculateTfIdfCosineSimilarity,
} from "./cosine";
import { calculateLlmJudgeScore } from "./llm-judge";
import type { ScoreInput, ScoreResult } from "../../types";

/**
 * Calculate all scores for a generated answer
 *
 * @param input - Contains generated answer, expected answer, question, and model
 * @returns Combined scores from all methods
 */
export async function calculateScores(input: ScoreInput): Promise<ScoreResult> {
  const { generatedAnswer, expectedAnswer, question, model } = input;

  console.log(`[Scoring] Calculating scores for answer (${generatedAnswer.length} chars)`);

  // Calculate BLEU score (fast, synchronous)
  const bleuStart = Date.now();
  const bleu = calculateSmoothBleuScore(generatedAnswer, expectedAnswer);
  console.log(`[Scoring] BLEU: ${bleu.toFixed(4)} (${Date.now() - bleuStart}ms)`);

  // Calculate cosine similarity (may use embeddings)
  const cosineStart = Date.now();
  let cosine: number;
  try {
    // Try embedding-based similarity first
    cosine = await calculateEmbeddingCosineSimilarity(generatedAnswer, expectedAnswer);
  } catch (error) {
    // Fall back to TF-IDF
    console.warn("[Scoring] Falling back to TF-IDF cosine similarity");
    cosine = calculateTfIdfCosineSimilarity(generatedAnswer, expectedAnswer);
  }
  console.log(`[Scoring] Cosine: ${cosine.toFixed(4)} (${Date.now() - cosineStart}ms)`);

  // Calculate LLM-as-judge score
  const llmStart = Date.now();
  const llmResult = await calculateLlmJudgeScore(
    question,
    generatedAnswer,
    expectedAnswer
    // Uses default judge model from env
  );
  console.log(
    `[Scoring] LLM Judge: ${llmResult.score.toFixed(4)} (${Date.now() - llmStart}ms)`
  );

  return {
    bleu,
    cosine,
    llmScore: llmResult.score,
    llmReason: llmResult.reason,
  };
}

/**
 * Calculate quick scores (no API calls)
 * Useful for preview or when API is unavailable
 */
export function calculateQuickScores(
  generatedAnswer: string,
  expectedAnswer: string
): { bleu: number; cosine: number } {
  const bleu = calculateSmoothBleuScore(generatedAnswer, expectedAnswer);
  const cosine = calculateTfIdfCosineSimilarity(generatedAnswer, expectedAnswer);

  return { bleu, cosine };
}

/**
 * Calculate weighted aggregate score
 * Combines all scores into a single metric
 */
export function calculateAggregateScore(scores: ScoreResult): number {
  // Weights for each scoring method
  const weights = {
    bleu: 0.2, // BLEU is good for exact matches
    cosine: 0.3, // Cosine captures semantic similarity
    llmScore: 0.5, // LLM judge is most nuanced
  };

  return (
    weights.bleu * scores.bleu +
    weights.cosine * scores.cosine +
    weights.llmScore * scores.llmScore
  );
}

// Re-export individual scoring functions for direct use
export {
  calculateBleuScore,
  calculateSmoothBleuScore,
  calculateRawBleuScore,
  calculateRawSmoothBleuScore,
} from "./bleu";
export {
  calculateEmbeddingCosineSimilarity,
  calculateTfIdfCosineSimilarity,
  calculateJaccardSimilarity,
} from "./cosine";
export { calculateLlmJudgeScore, batchCalculateLlmJudgeScores } from "./llm-judge";
