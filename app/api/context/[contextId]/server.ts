import prisma from "@/prisma/prisma";
import { contextSerializer } from "@/utils/schemas/context";

export async function getServerContextById(id: string) {
  const context = await prisma.context.findUnique({
    where: { id },
  });

  if (!context) return null;

  return contextSerializer(context);
}
