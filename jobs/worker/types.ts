/**
 * Shared types for the test run worker
 */
import type { Prisma } from "@/prisma/client";

// Type for TestRun with all required relations loaded
export type TestRunWithRelations = Prisma.TestRunGetPayload<{
  include: {
    suite: {
      include: {
        testCases: true;
        contexts: true;
      };
    };
  };
}>;

// Type for a single test case from the suite (updated for multimodal)
export type TestCaseData = {
  id: string;
  questionText: string | null;
  questionAudioPath: string | null;
  questionImagePath: string | null;
  expectedAnswer: string;
};

// Type for a single context from the suite (renamed from TestContext)
export type ContextData = {
  id: string;
  name: string;
  text: string | null;
  filePath: string | null;
};

// Legacy alias for backward compatibility
export type TestContextData = ContextData;

// Parameters for LLM text generation
export type LLMGenerateParams = {
  model: string; // Format: "provider:model-id" e.g., "openai:gpt-4o"
  prompt: string; // System/base prompt from TestRun
  question: string; // The actual question to answer
  context: string; // Combined context from all sources
  temperature: number;
  topP: number;
  topK: number;
};

// Input for score calculation
export type ScoreInput = {
  generatedAnswer: string;
  expectedAnswer: string;
  question: string;
  model: string; // For LLM-as-judge
};

// Result from scoring
export type ScoreResult = {
  bleu: number; // 0-1 BLEU score
  cosine: number; // 0-1 cosine similarity
  llmScore: number; // 0-1 LLM judge score
  llmReason: string; // Explanation from LLM judge
};

// Status for individual test run results
export type TestRunResultStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

// Data shape for creating a TestRunResult
export type TestRunResultInput = {
  runId: string;
  caseId: string;
  status: TestRunResultStatus;
  failReason?: string | null;
  answer: string;
  bleuScore: number;
  cosineSimScore: number;
  llmScore: number;
  llmScoreReason: string;
};

// LLM Provider types
export type ProviderName = "openai" | "anthropic" | "google";

export type ModelConfig = {
  provider: ProviderName;
  modelId: string;
};

// Job data passed from queue
export type TestRunJobData = {
  testRunId: string;
};

// PDF context for multimodal LLMs
export type PDFContext = {
  type: "file";
  mimeType: "application/pdf";
  data: string; // base64 encoded
};

// Text context
export type TextContext = {
  type: "text";
  content: string;
};

export type ContextItem = PDFContext | TextContext;
