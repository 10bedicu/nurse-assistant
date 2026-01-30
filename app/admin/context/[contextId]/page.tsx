import { getServerContextById } from "@/app/api/context/[contextId]/server";
import Client from "./client";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ contextId: string }>;
}) {
  const { contextId } = await params;

  const context = await getServerContextById(contextId);

  if (!context) notFound();

  return <Client context={context} />;
}
