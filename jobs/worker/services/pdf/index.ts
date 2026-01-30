/**
 * PDF Processing Service
 *
 * Handles loading PDF files and converting them to base64 for LLM context.
 * Supports both text contexts and file-based contexts.
 */
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve } from "path";
import type { TestContextData, ContextItem } from "../../types";

/**
 * Load all contexts from TestContext records
 * Returns a combined string of all context data
 */
export async function loadContexts(
  contexts: TestContextData[]
): Promise<string> {
  const contextParts: string[] = [];

  for (const ctx of contexts) {
    try {
      if (ctx.text) {
        // Direct text context
        contextParts.push(`[Text Context]\n${ctx.text}`);
        console.log(`[PDF] Loaded text context: ${ctx.id}`);
      }

      if (ctx.filePath) {
        // File-based context (PDF)
        const content = await loadFileAsText(ctx.filePath);
        contextParts.push(`[File: ${ctx.filePath}]\n${content}`);
        console.log(`[PDF] Loaded file context: ${ctx.filePath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[PDF] Failed to load context ${ctx.id}: ${errorMessage}`);
      // Include error in context so LLM knows about missing data
      contextParts.push(
        `[Error loading context ${ctx.id}]: ${errorMessage}`
      );
    }
  }

  return contextParts.join("\n\n---\n\n");
}

/**
 * Load PDF contexts as base64 for multimodal LLMs
 * Returns an array of context items suitable for LLM APIs
 */
export async function loadContextsAsBase64(
  contexts: TestContextData[]
): Promise<ContextItem[]> {
  const items: ContextItem[] = [];

  for (const ctx of contexts) {
    try {
      if (ctx.text) {
        items.push({
          type: "text",
          content: ctx.text,
        });
      }

      if (ctx.filePath) {
        const base64 = await loadPdfAsBase64(ctx.filePath);
        items.push({
          type: "file",
          mimeType: "application/pdf",
          data: base64,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[PDF] Failed to load context ${ctx.id}: ${errorMessage}`);
    }
  }

  return items;
}

/**
 * Load a file and return its content as text
 * For PDFs, returns base64-encoded content with a marker
 */
async function loadFileAsText(filePath: string): Promise<string> {
  const fullPath = resolveFilePath(filePath);

  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const buffer = await readFile(fullPath);

  // Check if it's a PDF by extension or magic bytes
  if (filePath.toLowerCase().endsWith(".pdf") || isPdfBuffer(buffer)) {
    // For PDFs, return base64 with marker for LLM processing
    const base64 = buffer.toString("base64");
    return `[PDF Base64 Content - ${buffer.length} bytes]\n${base64}`;
  }

  // For text files, return as-is
  return buffer.toString("utf-8");
}

/**
 * Load a PDF file and return as base64
 */
export async function loadPdfAsBase64(filePath: string): Promise<string> {
  const fullPath = resolveFilePath(filePath);

  if (!existsSync(fullPath)) {
    throw new Error(`PDF file not found: ${fullPath}`);
  }

  const buffer = await readFile(fullPath);
  return buffer.toString("base64");
}

/**
 * Resolve file path - handles both absolute and relative paths
 * Relative paths are resolved from the public/files directory
 */
function resolveFilePath(filePath: string): string {
  // If absolute path, use as-is
  if (filePath.startsWith("/")) {
    return filePath;
  }

  // Check multiple possible locations
  const possiblePaths = [
    // Relative to public/files
    join(process.cwd(), "public", "files", filePath),
    // Relative to public
    join(process.cwd(), "public", filePath),
    // Relative to project root
    join(process.cwd(), filePath),
    // Resolve as-is
    resolve(filePath),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Default to public/files location
  return possiblePaths[0];
}

/**
 * Check if a buffer is a PDF by checking magic bytes
 */
function isPdfBuffer(buffer: Buffer): boolean {
  // PDF magic bytes: %PDF
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46 // F
  );
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
