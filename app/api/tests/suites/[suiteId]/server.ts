import prisma from "@/prisma/prisma";
import { testSuiteSerializer } from "@/utils/schemas/tests";

export async function getServerSuite(id: string) {
  const suite = await prisma.testSuite.findUnique({
    where: { id },
  });

  if (!suite) {
    return null;
  }

  return testSuiteSerializer(suite);
}
