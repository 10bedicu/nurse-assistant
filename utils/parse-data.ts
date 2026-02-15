import { NextRequest } from "next/server";
import type { z } from "zod";
import { zodErrorSerializer } from "./schemas/base";

function __parseData<T extends z.ZodTypeAny>(data: unknown, schema: T) {
  const parsedFilters = schema.safeParse(data);

  if (!parsedFilters.success) {
    return {
      success: false as const,
      errors: zodErrorSerializer(parsedFilters.error),
      error: parsedFilters.error,
    };
  }

  return {
    success: true as const,
    data: parsedFilters.data,
    errors: null,
  };
}
export function parseQueryParams<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T,
) {
  const queryParams = Object.fromEntries(
    new URL(request.url).searchParams.entries(),
  );

  return __parseData(queryParams, schema);
}

export async function parseBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T,
) {
  const parsedBody = await request.json();
  return __parseData(parsedBody, schema);
}
