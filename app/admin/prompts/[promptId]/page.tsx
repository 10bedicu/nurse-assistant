import { getServerPrompt } from "@/app/api/prompts/server";
import Client from "./client";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const { promptId } = await params;

  const prompt = await getServerPrompt(promptId);

  if (!prompt) notFound();

  return <Client prompt={prompt} />;
}
