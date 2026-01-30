/**
 * LLM-as-Judge Scoring
 *
 * Uses an LLM to evaluate the quality of generated answers
 * against expected answers. Provides a score (0-1) and reasoning.
 *
 * Evaluation criteria:
 * - Factual accuracy
 * - Completeness
 * - Relevance
 * - Coherence
 */
import { generateObject } from "ai";
import { z } from "zod";
import { parseModelString, getModel } from "../llm";

export type LlmJudgeResult = {
  score: number; // 0-1 scale
  reason: string; // Explanation for the score
};

/**
 * Zod schema for structured LLM judge response
 */
const llmJudgeResponseSchema = z.object({
  score: z.number().min(0).max(1).describe("Overall score between 0.0 and 1.0"),
  breakdown: z.object({
    accuracy: z.number().min(0).max(1).describe("Factual accuracy score 0.0-1.0"),
    completeness: z.number().min(0).max(1).describe("Completeness score 0.0-1.0"),
    relevance: z.number().min(0).max(1).describe("Relevance score 0.0-1.0"),
    coherence: z.number().min(0).max(1).describe("Coherence score 0.0-1.0"),
  }).describe("Breakdown of scores by criteria"),
  reason: z.string().describe("2-3 sentence explanation of the score"),
});

/**
 * Judge prompt template (without JSON format instructions - handled by structured output)
 */
const JUDGE_PROMPT = `You are an expert evaluator assessing the quality of AI-generated answers.

Your task is to compare a GENERATED ANSWER against an EXPECTED ANSWER for a given QUESTION.

Evaluate based on these criteria:
1. **Factual Accuracy**: Does the generated answer contain correct information?
2. **Completeness**: Does it cover all key points from the expected answer?
3. **Relevance**: Does it directly address the question?
4. **Coherence**: Is it well-structured and easy to understand?

---

QUESTION:
{question}

---

EXPECTED ANSWER:
{expectedAnswer}

---

GENERATED ANSWER:
{generatedAnswer}

---

Scoring guide:
- 0.9-1.0: Excellent - Nearly identical or better than expected
- 0.7-0.9: Good - Covers main points with minor gaps
- 0.5-0.7: Fair - Partially correct but missing key information
- 0.3-0.5: Poor - Significant errors or omissions
- 0.0-0.3: Very Poor - Mostly incorrect or irrelevant`;

/**
 * Calculate LLM-as-judge score using structured output
 *
 * @param question - The original question
 * @param generatedAnswer - The LLM's generated answer
 * @param expectedAnswer - The expected/reference answer
 * @param judgeModel - Model to use for judging (defaults to env var or gpt-4o-mini)
 */
export async function calculateLlmJudgeScore(
  question: string,
  generatedAnswer: string,
  expectedAnswer: string,
  judgeModel?: string
): Promise<LlmJudgeResult> {
  // Determine which model to use for judging
  const modelString =
    judgeModel || process.env.LLM_JUDGE_MODEL || "openai:gpt-4o-mini";

  console.log(`[LLM-Judge] Using model: ${modelString}`);

  try {
    const config = parseModelString(modelString);
    const model = getModel(config);

    // Build the evaluation prompt
    const prompt = JUDGE_PROMPT.replace("{question}", question)
      .replace("{expectedAnswer}", expectedAnswer)
      .replace("{generatedAnswer}", generatedAnswer);

    // Generate structured evaluation using Zod schema
    const { object } = await generateObject({
      model,
      schema: llmJudgeResponseSchema,
      prompt,
      temperature: 0.1, // Low temperature for consistent evaluation
    });

    // Clamp score to valid range (extra safety)
    const score = Math.max(0, Math.min(1, object.score));

    console.log(`[LLM-Judge] Score: ${score.toFixed(2)}`);

    return {
      score,
      reason: object.reason,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[LLM-Judge] Evaluation failed: ${errorMessage}`);

    // Return a fallback result
    return {
      score: 0.5,
      reason: `Evaluation failed: ${errorMessage}. Defaulting to neutral score.`,
    };
  }
}

/**
 * Batch evaluate multiple answers
 * More efficient for large test suites
 */
export async function batchCalculateLlmJudgeScores(
  evaluations: Array<{
    question: string;
    generatedAnswer: string;
    expectedAnswer: string;
  }>,
  judgeModel?: string
): Promise<LlmJudgeResult[]> {
  // Process in parallel with a limit
  const results = await Promise.all(
    evaluations.map(({ question, generatedAnswer, expectedAnswer }) =>
      calculateLlmJudgeScore(question, generatedAnswer, expectedAnswer, judgeModel)
    )
  );

  return results;
}
