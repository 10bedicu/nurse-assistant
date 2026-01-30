import { getServerSuites } from "@/app/api/tests/suites/server";
import Client from "./client";

export default async function Page() {
  const suites = await getServerSuites({ limit: 20, offset: 0 });

  return <Client suites={suites} />;
}
