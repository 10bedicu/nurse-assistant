import { NextRequest, NextResponse } from "next/server";
import { getServerProject } from "../server";
import { parseBody } from "@/utils/parse-data";
import {
  projectSerializer,
  projectUpdateSchema,
} from "@/utils/schemas/project";
import prisma from "@/prisma/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const project = await getServerProject(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  const parsedBody = await parseBody(request, projectUpdateSchema);

  if (!parsedBody.success) {
    return NextResponse.json(parsedBody.errors, { status: 400 });
  }

  // If this project is being set as current, unset all others
  if (parsedBody.data.current) {
    await prisma.project.updateMany({
      where: {
        current: true,
        NOT: { id: projectId },
      },
      data: { current: false },
    });
  }

  const updateData: any = {};

  if (parsedBody.data.name !== undefined)
    updateData.name = parsedBody.data.name;
  if (parsedBody.data.promptId !== undefined)
    updateData.promptId = parsedBody.data.promptId;
  if (parsedBody.data.llmModel !== undefined)
    updateData.llmModel = parsedBody.data.llmModel;
  if (parsedBody.data.topP !== undefined)
    updateData.topP = parsedBody.data.topP;
  if (parsedBody.data.topK !== undefined)
    updateData.topK = parsedBody.data.topK;
  if (parsedBody.data.temperature !== undefined)
    updateData.temperature = parsedBody.data.temperature;
  if (parsedBody.data.current !== undefined)
    updateData.current = parsedBody.data.current;

  if (parsedBody.data.contextIds !== undefined) {
    updateData.contexts = {
      set: parsedBody.data.contextIds.map((id) => ({ id })),
    };
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
    include: {
      prompt: true,
      contexts: true,
    },
  });

  return NextResponse.json(projectSerializer(updatedProject));
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  await prisma.project.delete({
    where: { id: projectId },
  });

  return NextResponse.json({}, { status: 200 });
}
