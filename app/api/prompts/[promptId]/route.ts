import { NextRequest, NextResponse } from "next/server";
import { getServerPrompt } from "../server";
import { parseBody } from "@/utils/parse-data";
import { promptSerializer, promptUpdateSchema } from "@/utils/schemas/project";
import prisma from "@/prisma/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ promptId: string }> },
) {
  const { promptId } = await params;
  const prompt = await getServerPrompt(promptId);

  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  return NextResponse.json(prompt);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ promptId: string }> },
) {
  const { promptId } = await params;

  const parsedBody = await parseBody(request, promptUpdateSchema);

  if (!parsedBody.success) {
    return NextResponse.json(parsedBody.errors, { status: 400 });
  }

  const updateData: any = {};

  if (parsedBody.data.name !== undefined)
    updateData.name = parsedBody.data.name;
  if (parsedBody.data.content !== undefined)
    updateData.content = parsedBody.data.content;

  const updatedPrompt = await prisma.prompt.update({
    where: { id: promptId },
    data: updateData,
  });

  return NextResponse.json(promptSerializer(updatedPrompt));
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ promptId: string }> },
) {
  const { promptId } = await params;

  await prisma.prompt.delete({
    where: { id: promptId },
  });

  return NextResponse.json({}, { status: 200 });
}
