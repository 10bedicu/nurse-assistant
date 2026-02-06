import prisma from "@/prisma/prisma";
import { parseBody } from "@/utils/parse-data";
import {
  testCasesImportSchema,
  testCaseSerializer,
} from "@/utils/schemas/tests";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ suiteId: string }> },
) {
  const { suiteId } = await params;

  // Verify suite exists
  const suite = await prisma.testSuite.findUnique({
    where: { id: suiteId },
  });

  if (!suite) {
    return NextResponse.json(
      { error: "Test suite not found" },
      { status: 404 },
    );
  }

  const parsedBody = await parseBody(request, testCasesImportSchema);

  if (!parsedBody.success) {
    return NextResponse.json(parsedBody.errors, { status: 400 });
  }

  const { questions } = parsedBody.data;

  // Create all test cases
  const createdCases = await prisma.$transaction(
    questions.map((q) =>
      prisma.testCase.create({
        data: {
          questionText: q.questionText || undefined,
          questionAudioPath: q.questionAudioPath || undefined,
          questionImagePath: q.questionImagePath || undefined,
          expectedAnswer: q.expectedAnswer,
          testSuiteId: suiteId,
        },
      }),
    ),
  );

  return NextResponse.json(
    {
      imported: createdCases.length,
      cases: createdCases.map(testCaseSerializer),
    },
    { status: 201 },
  );
}
