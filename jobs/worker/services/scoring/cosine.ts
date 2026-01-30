/**
 * Cosine Similarity Implementation
 *
 * Provides two approaches:
 * 1. TF-IDF based (fast, no API calls) - default fallback
 * 2. Embedding based (more accurate, requires API) - preferred
 *
 * Score ranges from 0 to 1, where:
 * - 1.0 = identical meaning
 * - 0.0 = no similarity
 */
import { generateEmbedding } from "../llm";

/**
 * Calculate cosine similarity using embeddings (preferred method)
 * Uses LLM embeddings for semantic similarity
 */
export async function calculateEmbeddingCosineSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  try {
    console.log("[Cosine] Generating embeddings for similarity calculation");

    // Generate embeddings for both texts
    const [embedding1, embedding2] = await Promise.all([
      generateEmbedding(text1),
      generateEmbedding(text2),
    ]);

    // Calculate cosine similarity between embedding vectors
    const similarity = cosineSimilarity(embedding1, embedding2);

    console.log(`[Cosine] Embedding similarity: ${similarity.toFixed(4)}`);
    return similarity;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.warn(
      `[Cosine] Embedding similarity failed, falling back to TF-IDF: ${errorMessage}`
    );

    // Fallback to TF-IDF based similarity
    return calculateTfIdfCosineSimilarity(text1, text2);
  }
}

/**
 * Calculate cosine similarity using TF-IDF (fallback method)
 * Fast and works without API calls
 */
export function calculateTfIdfCosineSimilarity(
  text1: string,
  text2: string
): number {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  if (tokens1.length === 0 || tokens2.length === 0) {
    return 0;
  }

  // Build vocabulary from both texts
  const vocabulary = [...new Set([...tokens1, ...tokens2])];

  // Create TF vectors
  const vec1 = createTfVector(tokens1, vocabulary);
  const vec2 = createTfVector(tokens2, vocabulary);

  // Calculate cosine similarity
  return cosineSimilarity(vec1, vec2);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Tokenize text for TF-IDF
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Create TF (Term Frequency) vector
 */
function createTfVector(tokens: string[], vocabulary: string[]): number[] {
  const freqMap = new Map<string, number>();

  for (const token of tokens) {
    freqMap.set(token, (freqMap.get(token) || 0) + 1);
  }

  // Normalize by total tokens
  const totalTokens = tokens.length;

  return vocabulary.map((term) => {
    const freq = freqMap.get(term) || 0;
    return freq / totalTokens;
  });
}

/**
 * Calculate Jaccard similarity (simpler alternative)
 * Good for short texts or keywords
 */
export function calculateJaccardSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));

  if (tokens1.size === 0 && tokens2.size === 0) {
    return 1; // Both empty = identical
  }

  // Calculate intersection
  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));

  // Calculate union
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Combined similarity score
 * Weights embedding similarity higher when available
 */
export async function calculateCombinedSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  try {
    // Try embedding-based similarity first (more accurate)
    const embeddingSim = await calculateEmbeddingCosineSimilarity(text1, text2);

    // Also calculate TF-IDF for robustness
    const tfIdfSim = calculateTfIdfCosineSimilarity(text1, text2);

    // Weighted combination (favor embeddings)
    return 0.7 * embeddingSim + 0.3 * tfIdfSim;
  } catch {
    // Fallback to TF-IDF only
    return calculateTfIdfCosineSimilarity(text1, text2);
  }
}
