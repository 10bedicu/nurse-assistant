import { getServerSuites } from "@/app/api/tests/suites/server";
import Client from "./client";
import { getServerSuite } from "@/app/api/tests/suites/[suiteId]/server";
import { notFound } from "next/navigation";
import { getServerContext } from "@/app/api/context/server";

export default async function Page({
  params,
}: {
  params: Promise<{ suiteId: string }>;
}) {
  const { suiteId } = await params;

  const suite = await getServerSuite(suiteId);
  const contexts = await getServerContext();

  if (!suite) notFound();

  return <Client suite={suite} contexts={contexts} />;
}
