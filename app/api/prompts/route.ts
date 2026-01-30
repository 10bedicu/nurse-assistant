import { parseBody } from "@/utils/parse-data";
import { NextRequest, NextResponse } from "next/server";
import { getServerPrompts } from "./server";
import { promptCreateSchema, promptSerializer } from "@/utils/schemas/project";
import prisma from "@/prisma/prisma";

export async function GET() {
  const prompts = await getServerPrompts();
  return NextResponse.json(prompts);
}

export async function POST(request: NextRequest) {
  const parsedBody = await parseBody(request, promptCreateSchema);

  if (!parsedBody.success) {
    return NextResponse.json(parsedBody.errors, { status: 400 });
  }

  const newPrompt = await prisma.prompt.create({
    data: {
      name: parsedBody.data.name,
      content: parsedBody.data.content,
    },
  });

  return NextResponse.json(promptSerializer(newPrompt), { status: 201 });
}
