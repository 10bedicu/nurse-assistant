import prisma from "@/prisma/prisma";
import { projectSerializer } from "@/utils/schemas/project";
import { LimitOffset } from "@/utils/schemas/base";

export async function getServerProjects(filters: LimitOffset) {
  const projects = await prisma.project.findMany({
    take: filters.limit + 1,
    skip: filters.offset,
    include: {
      prompt: true,
      contexts: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const hasMore = projects.length > filters.limit;

  return {
    limit: filters.limit,
    offset: filters.offset,
    hasMore,
    results: projects.slice(0, filters.limit).map(projectSerializer),
  };
}

export async function getServerProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      prompt: true,
      contexts: true,
    },
  });

  if (!project) return null;

  return projectSerializer(project);
}
