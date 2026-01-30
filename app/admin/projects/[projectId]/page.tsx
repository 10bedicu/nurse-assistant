import { getServerProject } from "@/app/api/projects/server";
import { getServerPrompts } from "@/app/api/prompts/server";
import { getServerContext } from "@/app/api/context/server";
import Client from "./client";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [project, prompts, contexts] = await Promise.all([
    getServerProject(projectId),
    getServerPrompts(),
    getServerContext(),
  ]);

  if (!project) notFound();

  return <Client project={project} prompts={prompts} contexts={contexts} />;
}
