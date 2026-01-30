/**
 * BLEU Score Implementation
 *
 * BLEU (Bilingual Evaluation Understudy) is a metric for evaluating
 * machine-generated text against reference text.
 *
 * Score ranges from 0 to 1, where:
 * - 1.0 = perfect match
 * - 0.0 = no n-gram overlap
 *
 * Implementation follows the standard BLEU algorithm with:
 * - N-gram precision (1-gram to 4-gram by default)
 * - Brevity penalty for short outputs
 * - Geometric mean of precisions
 */

/**
 * Calculate BLEU score between candidate and reference text
 *
 * @param candidate - Generated/predicted text
 * @param reference - Expected/ground truth text
 * @param maxN - Maximum n-gram size (default: 4)
 * @returns BLEU score between 0 and 1
 */
export function calculateBleuScore(
  candidate: string,
  reference: string,
  maxN: number = 4
): number {
  // Tokenize both texts
  const candidateTokens = tokenize(candidate);
  const referenceTokens = tokenize(reference);

  // Handle edge cases
  if (candidateTokens.length === 0) {
    return 0;
  }

  if (referenceTokens.length === 0) {
    return 0;
  }

  // Calculate modified precision for each n-gram size
  const precisions: number[] = [];

  for (let n = 1; n <= maxN; n++) {
    const candidateNgrams = getNgrams(candidateTokens, n);
    const referenceNgrams = getNgrams(referenceTokens, n);

    if (candidateNgrams.length === 0) {
      // No n-grams of this size possible
      continue;
    }

    // Count matching n-grams (with clipping)
    const precision = calculateClippedPrecision(candidateNgrams, referenceNgrams);
    precisions.push(precision);
  }

  // If no valid precisions, return 0
  if (precisions.length === 0) {
    return 0;
  }

  // Check if any precision is 0 (would make geometric mean 0)
  if (precisions.some((p) => p === 0)) {
    // Use smoothing: add small epsilon to zero precisions
    const smoothedPrecisions = precisions.map((p) => (p === 0 ? 0.001 : p));
    const geometricMean = calculateGeometricMean(smoothedPrecisions);
    const bp = calculateBrevityPenalty(candidateTokens.length, referenceTokens.length);
    return bp * geometricMean;
  }

  // Calculate geometric mean of precisions
  const geometricMean = calculateGeometricMean(precisions);

  // Calculate brevity penalty
  const bp = calculateBrevityPenalty(candidateTokens.length, referenceTokens.length);

  // Final BLEU score
  return bp * geometricMean;
}

/**
 * Tokenize text into words
 * - Lowercases
 * - Removes punctuation
 * - Splits on whitespace
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Replace punctuation with space
    .split(/\s+/) // Split on whitespace
    .filter((token) => token.length > 0); // Remove empty tokens
}

/**
 * Generate n-grams from tokens
 */
function getNgrams(tokens: string[], n: number): string[] {
  if (tokens.length < n) {
    return [];
  }

  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(" "));
  }
  return ngrams;
}

/**
 * Calculate clipped precision
 * For each candidate n-gram, count is clipped to max reference count
 */
function calculateClippedPrecision(
  candidateNgrams: string[],
  referenceNgrams: string[]
): number {
  // Count n-grams in reference
  const refCounts = new Map<string, number>();
  for (const ngram of referenceNgrams) {
    refCounts.set(ngram, (refCounts.get(ngram) || 0) + 1);
  }

  // Count n-grams in candidate
  const candCounts = new Map<string, number>();
  for (const ngram of candidateNgrams) {
    candCounts.set(ngram, (candCounts.get(ngram) || 0) + 1);
  }

  // Calculate clipped count
  let clippedCount = 0;
  for (const [ngram, candCount] of candCounts) {
    const refCount = refCounts.get(ngram) || 0;
    clippedCount += Math.min(candCount, refCount);
  }

  return clippedCount / candidateNgrams.length;
}

/**
 * Calculate geometric mean of precisions
 */
function calculateGeometricMean(values: number[]): number {
  if (values.length === 0) return 0;

  // Use log sum to avoid floating point issues with many small numbers
  const logSum = values.reduce((sum, val) => sum + Math.log(val), 0);
  return Math.exp(logSum / values.length);
}

/**
 * Calculate brevity penalty
 * Penalizes candidate texts that are shorter than reference
 */
function calculateBrevityPenalty(candidateLength: number, referenceLength: number): number {
  if (candidateLength >= referenceLength) {
    return 1.0;
  }

  return Math.exp(1 - referenceLength / candidateLength);
}

/**
 * Calculate sentence-level BLEU with smoothing
 * Better for single sentence evaluation
 */
export function calculateSmoothBleuScore(
  candidate: string,
  reference: string,
  maxN: number = 4
): number {
  const candidateTokens = tokenize(candidate);
  const referenceTokens = tokenize(reference);

  if (candidateTokens.length === 0 || referenceTokens.length === 0) {
    return 0;
  }

  const precisions: number[] = [];

  for (let n = 1; n <= maxN; n++) {
    const candidateNgrams = getNgrams(candidateTokens, n);
    const referenceNgrams = getNgrams(referenceTokens, n);

    if (candidateNgrams.length === 0) {
      // Smoothing: use 1/(2^n) for missing n-grams
      precisions.push(1 / Math.pow(2, n));
      continue;
    }

    let precision = calculateClippedPrecision(candidateNgrams, referenceNgrams);

    // Add-k smoothing for zero precisions
    if (precision === 0) {
      precision = 1 / Math.pow(2, n);
    }

    precisions.push(precision);
  }

  const geometricMean = calculateGeometricMean(precisions);
  const bp = calculateBrevityPenalty(candidateTokens.length, referenceTokens.length);

  return bp * geometricMean;
}
