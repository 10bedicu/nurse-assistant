import { NextRequest, NextResponse } from "next/server";
import { getServerContextById } from "./server";
import { parseBody } from "@/utils/parse-data";
import {
  contextSerializer,
  contextCreateSchema,
} from "@/utils/schemas/context";
import prisma from "@/prisma/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contextId: string }> },
) {
  const { contextId } = await params;
  const context = await getServerContextById(contextId);

  if (!context) {
    return NextResponse.json({ error: "Context not found" }, { status: 404 });
  }

  return NextResponse.json(context);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ contextId: string }> },
) {
  const { contextId } = await params;

  const parsedBody = await parseBody(request, contextCreateSchema);

  if (!parsedBody.success) {
    return NextResponse.json(parsedBody.errors, { status: 400 });
  }

  const updatedContext = await prisma.context.update({
    where: { id: contextId },
    data: {
      name: parsedBody.data.name,
      text: parsedBody.data.text,
      filePath: parsedBody.data.filePath,
    },
  });

  return NextResponse.json(contextSerializer(updatedContext));
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ contextId: string }> },
) {
  const { contextId } = await params;

  await prisma.context.delete({
    where: { id: contextId },
  });

  return NextResponse.json({}, { status: 200 });
}
