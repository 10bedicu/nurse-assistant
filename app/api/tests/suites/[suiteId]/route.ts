import { NextRequest, NextResponse } from "next/server";
import { getServerSuite } from "./server";
import { testRunQueue } from "@/jobs/queue";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ suiteId: string }> },
) {
  const { suiteId } = await params;
  const suite = await getServerSuite(suiteId);

  if (!suite) {
    return NextResponse.json(
      { error: "Test suite not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(suite);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ suiteId: string }> },
) {
  const { suiteId } = await params;

  // Add job to the queue
  const job = await testRunQueue.add("run-test", {
    suiteId,
  });

  return NextResponse.json({
    message: "Test run queued",
    jobId: job.id,
  });
}
