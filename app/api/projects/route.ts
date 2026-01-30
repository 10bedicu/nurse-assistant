import { parseBody, parseQueryParams } from "@/utils/parse-data";
import { limitOffsetSchema } from "@/utils/schemas/base";
import { NextRequest, NextResponse } from "next/server";
import { getServerProjects } from "./server";
import {
  projectCreateSchema,
  projectSerializer,
} from "@/utils/schemas/project";
import prisma from "@/prisma/prisma";

export async function GET(request: NextRequest) {
  const queryParams = parseQueryParams(request, limitOffsetSchema);

  if (!queryParams.success) {
    return NextResponse.json(queryParams.errors, { status: 400 });
  }

  const data = await getServerProjects(queryParams.data);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const parsedBody = await parseBody(request, projectCreateSchema);

  if (!parsedBody.success) {
    return NextResponse.json(parsedBody.errors, { status: 400 });
  }

  // If this project is being set as current, unset all others
  if (parsedBody.data.current) {
    await prisma.project.updateMany({
      where: { current: true },
      data: { current: false },
    });
  }

  const newProject = await prisma.project.create({
    data: {
      name: parsedBody.data.name,
      promptId: parsedBody.data.promptId,
      llmModel: parsedBody.data.llmModel,
      topP: parsedBody.data.topP,
      topK: parsedBody.data.topK,
      temperature: parsedBody.data.temperature,
      current: parsedBody.data.current,
      contexts: {
        connect: parsedBody.data.contextIds.map((id) => ({ id })),
      },
    },
    include: {
      prompt: true,
      contexts: true,
    },
  });

  return NextResponse.json(projectSerializer(newProject), { status: 201 });
}
