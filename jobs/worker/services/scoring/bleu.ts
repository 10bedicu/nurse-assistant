/**
 * BLEU Score Implementation
 *
 * BLEU (Bilingual Evaluation Understudy) is a metric for evaluating
 * machine-generated text against reference text.
 *
 * Score ranges from 0 to 1, where:
 * - 1.0 = perfect match (excellent similarity)
 * - 0.0 = no n-gram overlap (poor similarity)
 *
 * Implementation follows the standard BLEU algorithm with:
 * - N-gram precision (1-gram to 4-gram by default)
 * - Brevity penalty for short outputs
 * - Geometric mean of precisions
 *
 * For LLM evaluation, raw BLEU scores are normalized using a sigmoid function
 * to spread scores more meaningfully across the 0-1 range, since raw BLEU
 * scores tend to cluster in the 0.1-0.3 range even for semantically good answers.
 *
 * Reference: https://www.geeksforgeeks.org/nlp/nlp-bleu-score-for-evaluating-neural-machine-translation-python/
 *
 * Formula: BLEU = BP * exp(Σ(w_i * ln(p_i)))
 * Where:
 *   - BP = Brevity Penalty = exp(1 - r/c) if c < r, else 1
 *   - w_i = weight for n-gram (typically 0.25 for each)
 *   - p_i = modified n-gram precision (clipped by max reference count)
 */

/**
 * Normalize raw BLEU score using sigmoid function
 *
 * Raw BLEU scores for LLM-generated text tend to be very low (0.1-0.3)
 * even for semantically good answers. This sigmoid normalization spreads
 * scores more meaningfully across the 0-1 range.
 *
 * @param rawScore - Raw BLEU score (0-1)
 * @param midpoint - Center point of sigmoid curve (default: 0.2)
 * @param steepness - How steep the sigmoid curve is (default: 10)
 * @returns Normalized score (0-1) with better distribution
 */
function normalizeWithSigmoid(
  rawScore: number,
  midpoint: number = 0.2,
  steepness: number = 10
): number {
  // Clamp input to 0-1 range
  const clampedScore = Math.max(0, Math.min(1, rawScore));

  // Apply sigmoid: σ(x) = 1 / (1 + e^(-k*(x-m)))
  const sigmoid = 1 / (1 + Math.exp(-steepness * (clampedScore - midpoint)));

  // Normalize to ensure output is exactly 0 at input 0 and 1 at input 1
  const sigmoidAt0 = 1 / (1 + Math.exp(-steepness * (0 - midpoint)));
  const sigmoidAt1 = 1 / (1 + Math.exp(-steepness * (1 - midpoint)));

  // Linear interpolation to map sigmoid output to 0-1
  const normalized = (sigmoid - sigmoidAt0) / (sigmoidAt1 - sigmoidAt0);

  // Final clamp to ensure output is exactly in 0-1 range
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Calculate raw BLEU score (standard algorithm, no normalization)
 *
 * @param candidate - Generated/predicted text
 * @param reference - Expected/ground truth text
 * @param maxN - Maximum n-gram size (default: 4)
 * @returns Raw BLEU score between 0 and 1
 */
export function calculateRawBleuScore(
  candidate: string,
  reference: string,
  maxN: number = 4
): number {
  // Tokenize both texts
  const candidateTokens = tokenize(candidate);
  const referenceTokens = tokenize(reference);

  // Handle edge cases
  if (candidateTokens.length === 0 || referenceTokens.length === 0) {
    return 0;
  }

  // Calculate modified precision for each n-gram size
  const precisions: number[] = [];

  for (let n = 1; n <= maxN; n++) {
    const candidateNgrams = getNgrams(candidateTokens, n);
    const referenceNgrams = getNgrams(referenceTokens, n);

    if (candidateNgrams.length === 0) {
      continue;
    }

    const precision = calculateClippedPrecision(candidateNgrams, referenceNgrams);
    precisions.push(precision);
  }

  if (precisions.length === 0) {
    return 0;
  }

  // Handle zero precisions with smoothing
  if (precisions.some((p) => p === 0)) {
    const smoothedPrecisions = precisions.map((p) => (p === 0 ? 0.001 : p));
    const geometricMean = calculateGeometricMean(smoothedPrecisions);
    const bp = calculateBrevityPenalty(candidateTokens.length, referenceTokens.length);
    return bp * geometricMean;
  }

  const geometricMean = calculateGeometricMean(precisions);
  const bp = calculateBrevityPenalty(candidateTokens.length, referenceTokens.length);

  return bp * geometricMean;
}

/**
 * Calculate BLEU score between candidate and reference text
 * (with sigmoid normalization for better 0-1 distribution)
 *
 * @param candidate - Generated/predicted text
 * @param reference - Expected/ground truth text
 * @param maxN - Maximum n-gram size (default: 4)
 * @returns Normalized BLEU score between 0 and 1
 *          - Closer to 1.0 = excellent match (good)
 *          - Closer to 0.0 = poor match (bad)
 */
export function calculateBleuScore(
  candidate: string,
  reference: string,
  maxN: number = 4
): number {
  const rawScore = calculateRawBleuScore(candidate, reference, maxN);

  // Apply sigmoid normalization for better score distribution
  return normalizeWithSigmoid(rawScore);
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
 * Calculate raw sentence-level BLEU with smoothing (no sigmoid normalization)
 * Better for single sentence evaluation
 */
export function calculateRawSmoothBleuScore(
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

/**
 * Calculate sentence-level BLEU with smoothing and sigmoid normalization
 * Better for single sentence evaluation (LLM evaluation use case)
 *
 * @param candidate - Generated/predicted text
 * @param reference - Expected/ground truth text
 * @param maxN - Maximum n-gram size (default: 4)
 * @returns Normalized BLEU score between 0 and 1
 *          - Closer to 1.0 = excellent match (good)
 *          - Closer to 0.0 = poor match (bad)
 */
export function calculateSmoothBleuScore(
  candidate: string,
  reference: string,
  maxN: number = 4
): number {
  const rawScore = calculateRawSmoothBleuScore(candidate, reference, maxN);

  // Apply sigmoid normalization for better score distribution
  return normalizeWithSigmoid(rawScore);
}
