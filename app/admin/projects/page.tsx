import { getServerProjects } from "@/app/api/projects/server";
import { getServerPrompts } from "@/app/api/prompts/server";
import { getServerContext } from "@/app/api/context/server";
import Client from "./client";

export default async function Page() {
  const [projects, prompts, contexts] = await Promise.all([
    getServerProjects({ limit: 20, offset: 0 }),
    getServerPrompts(),
    getServerContext(),
  ]);

  return <Client projects={projects} prompts={prompts} contexts={contexts} />;
}
