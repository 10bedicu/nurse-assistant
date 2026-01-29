import { getServerSuites } from "@/app/api/tests/suites/server";
import Client from "./client";
import { getServerSuite } from "@/app/api/tests/suites/[suiteId]/server";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ suiteId: string }>;
}) {
  const { suiteId } = await params;

  const suite = await getServerSuite(suiteId);

  if (!suite) notFound();

  return <Client suite={suite} />;
}
