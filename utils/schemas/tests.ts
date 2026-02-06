import {
  Context,
  TestCase,
  TestRun,
  TestRunResult,
  TestSuite,
} from "@/prisma/client";
import z from "zod";
import { contextSerializer } from "./context";
import { LLMS } from "../constants";

export function testCaseSerializer(testCase: TestCase) {
  return {
    id: testCase.id,
    questionText: testCase.questionText,
    questionAudioPath: testCase.questionAudioPath,
    questionImagePath: testCase.questionImagePath,
    expectedAnswer: testCase.expectedAnswer,
    createdAt: testCase.createdAt,
    updatedAt: testCase.updatedAt,
  };
}

export type TestCaseSerialized = ReturnType<typeof testCaseSerializer>;

export function testSuiteSerializer(
  suite: TestSuite & { testCases: TestCase[]; contexts: Context[] },
) {
  return {
    id: suite.id,
    name: suite.name,
    createdAt: suite.createdAt,
    updatedAt: suite.updatedAt,
    testCases: suite.testCases.map(testCaseSerializer),
    contexts: suite.contexts.map(contextSerializer),
  };
}

export type TestSuiteSerialized = ReturnType<typeof testSuiteSerializer>;

export function testRunResultSerializer(testRunResult: TestRunResult) {
  return {
    id: testRunResult.id,
    caseId: testRunResult.caseId,
    status: testRunResult.status,
    failReason: testRunResult.failReason,
    answer: testRunResult.answer,
    bleuScore: testRunResult.bleuScore,
    cosineSimScore: testRunResult.cosineSimScore,
    llmScore: testRunResult.llmScore,
    llmScoreReason: testRunResult.llmScoreReason,
    createdAt: testRunResult.createdAt,
    answeredAt: testRunResult.answeredAt,
    scoredAt: testRunResult.scoredAt,
  };
}

export type TestRunResultSerialized = ReturnType<
  typeof testRunResultSerializer
>;

export function testRunSerializer(
  testRun: TestRun & {
    suite: TestSuite & {
      testCases: TestCase[];
      contexts: Context[];
    };

    testRunResults: TestRunResult[];
  },
) {
  return {
    id: testRun.id,
    suite: testSuiteSerializer(testRun.suite),
    llmModel: testRun.llmModel,
    topP: testRun.topP,
    topK: testRun.topK,
    temperature: testRun.temperature,
    prompt: testRun.prompt,
    createdAt: testRun.createdAt,
    updatedAt: testRun.updatedAt,
    completedAt: testRun.completedAt,
    runs: testRun.testRunResults.map(testRunResultSerializer),
  };
}

export type TestRunSerialized = ReturnType<typeof testRunSerializer>;

export const testSuiteCreateSchema = z.object({
  name: z.string().min(1).max(255),
  contextIds: z.array(z.cuid()).optional(),
});

export type TestSuiteCreatePayload = z.infer<typeof testSuiteCreateSchema>;

export const testSuiteUpdateSchema = z.object({
  name: z.string().min(1).max(255),
  contextIds: z.array(z.cuid()),
});

export type TestSuiteUpdatePayload = z.infer<typeof testSuiteUpdateSchema>;

export const testCaseCreateSchema = z
  .object({
    expectedAnswer: z.string().min(1),
  })
  .and(
    z.union([
      z.object({ questionText: z.string().min(1) }),
      z.object({ questionAudioPath: z.string().min(1) }),
      z.object({ questionImagePath: z.string().min(1) }),
    ]),
  );

export type TestCaseCreatePayload = z.infer<typeof testCaseCreateSchema>;

export const testRunCreateSchema = z.object({
  llmModel: z.enum(Object.keys(LLMS) as (keyof typeof LLMS)[]),
  prompt: z.string().min(1),
  temperature: z.number().min(0).max(1),
  topP: z.number().min(0).max(1),
  topK: z.number().min(0),
});

export type TestRunCreatePayload = z.infer<typeof testRunCreateSchema>;

// Schema for importing questions from JSON
export const testCaseImportItemSchema = z
  .object({
    questionText: z.string().optional(),
    questionAudioPath: z.string().optional(),
    questionImagePath: z.string().optional(),
    expectedAnswer: z.string().min(1),
  })
  .refine(
    (data) =>
      data.questionText || data.questionAudioPath || data.questionImagePath,
    {
      message:
        "At least one of questionText, questionAudioPath, or questionImagePath is required",
    },
  );

export const testCasesImportSchema = z.object({
  questions: z
    .array(testCaseImportItemSchema)
    .min(1, "At least one question is required"),
});

export type TestCasesImportPayload = z.infer<typeof testCasesImportSchema>;
