import { getServerSuites } from "@/app/api/tests/suites/server";
import Client from "./client";
import { getServerContext } from "@/app/api/context/server";

export default async function Page() {
  const context = await getServerContext();

  return <Client context={context} />;
}
