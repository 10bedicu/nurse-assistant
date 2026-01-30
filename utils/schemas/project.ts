import { Context, Project, Prompt } from "@/prisma/client";
import z from "zod";
import { contextSerializer } from "./context";
import { LLMS } from "../constants";

export function promptSerializer(prompt: Prompt) {
  return {
    id: prompt.id,
    name: prompt.name,
    content: prompt.content,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
  };
}

export type PromptSerialized = ReturnType<typeof promptSerializer>;

export function projectSerializer(
  project: Project & { prompt: Prompt; contexts: Context[] },
) {
  return {
    id: project.id,
    name: project.name,
    promptId: project.promptId,
    prompt: promptSerializer(project.prompt),
    llmModel: project.llmModel,
    topP: project.topP,
    topK: project.topK,
    temperature: project.temperature,
    current: project.current,
    contexts: project.contexts.map(contextSerializer),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export type ProjectSerialized = ReturnType<typeof projectSerializer>;

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(255),
  promptId: z.string(),
  llmModel: z.enum(Object.keys(LLMS) as [string, ...string[]]),
  topP: z.number().min(0).max(1),
  topK: z.number().int().min(0),
  temperature: z.number().min(0).max(2),
  current: z.boolean().optional().default(false),
  contextIds: z.array(z.string()).optional().default([]),
});

export type ProjectCreatePayload = z.infer<typeof projectCreateSchema>;

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  promptId: z.string().optional(),
  llmModel: z.enum(Object.keys(LLMS) as [string, ...string[]]).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(0).optional(),
  temperature: z.number().min(0).max(2).optional(),
  current: z.boolean().optional(),
  contextIds: z.array(z.string()).optional(),
});

export type ProjectUpdatePayload = z.infer<typeof projectUpdateSchema>;

export const promptCreateSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.string().min(1),
});

export type PromptCreatePayload = z.infer<typeof promptCreateSchema>;

export const promptUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
});

export type PromptUpdatePayload = z.infer<typeof promptUpdateSchema>;
