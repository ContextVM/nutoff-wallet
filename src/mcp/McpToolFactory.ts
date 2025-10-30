import { z } from "zod";
import type { ToolHandlerContext } from "../types/mcp.js";

/**
 * Factory for creating MCP tool handlers with consistent error handling
 * and response formatting
 */
export class McpToolFactory {
  /**
   * Creates a standardized MCP tool handler with error handling
   */
  static createToolHandler<TParams extends z.ZodTypeAny, TResult>(
    handler: (
      params: z.infer<TParams>,
      context: ToolHandlerContext,
    ) => Promise<TResult>,
    context: ToolHandlerContext,
    options?: {
      transformResult?: (result: TResult) => any;
    },
  ) {
    return async (params: z.infer<TParams>) => {
      try {
        const result = await handler(params, context);

        const structuredContent = options?.transformResult
          ? options.transformResult(result)
          : result;

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(structuredContent, null, 2),
            },
          ],
          structuredContent,
        };
      } catch (error) {
        // Preserve error codes in message for consistent error handling
        if (error instanceof Error && "code" in error) {
          throw new Error(`${(error as any).code}: ${error.message}`);
        }
        throw error;
      }
    };
  }

  /**
   * Creates a tool handler for operations that return arrays
   */
  static createArrayToolHandler<TParams extends z.ZodTypeAny, TItem>(
    handler: (
      params: z.infer<TParams>,
      context: ToolHandlerContext,
    ) => Promise<TItem[]>,
    context: ToolHandlerContext,
    arrayKey: string,
  ) {
    return this.createToolHandler(handler, context, {
      transformResult: (result) => ({ [arrayKey]: result }),
    });
  }

  /**
   * Creates a tool handler for operations that return simple success responses
   */
  static createSuccessToolHandler<TParams extends z.ZodTypeAny>(
    handler: (
      params: z.infer<TParams>,
      context: ToolHandlerContext,
    ) => Promise<void>,
    context: ToolHandlerContext,
  ) {
    return this.createToolHandler(handler, context, {
      transformResult: () => ({ success: true }),
    });
  }
}
