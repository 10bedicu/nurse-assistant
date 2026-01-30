import { getServerPrompts } from "@/app/api/prompts/server";
import Client from "./client";

export default async function Page() {
  const prompts = await getServerPrompts();

  return <Client prompts={prompts} />;
}
