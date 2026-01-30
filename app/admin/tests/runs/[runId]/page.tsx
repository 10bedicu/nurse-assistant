import { getServerSuites } from "@/app/api/tests/suites/server";
import Client from "./client";
import { getServerTestRun } from "@/app/api/tests/runs/[runId]/server";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const run = await getServerTestRun(runId);

  if (!run) notFound();

  return <Client run={run} />;
}
