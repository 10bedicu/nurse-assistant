import prisma from "@/prisma/prisma";
import { promptSerializer } from "@/utils/schemas/project";

export async function getServerPrompts() {
  const prompts = await prisma.prompt.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return prompts.map(promptSerializer);
}

export async function getServerPrompt(id: string) {
  const prompt = await prisma.prompt.findUnique({
    where: { id },
  });

  if (!prompt) return null;

  return promptSerializer(prompt);
}
