import Client from "./client";
import { getServerTestRuns } from "@/app/api/tests/runs/server";

export default async function Page() {
  const runs = await getServerTestRuns({ limit: 20, offset: 0 });

  return <Client runs={runs} />;
}
