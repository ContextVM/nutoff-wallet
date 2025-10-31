import { z } from "zod";
import type { WalletService } from "../services/WalletService.js";

// MCP Server Configuration
export const McpServerConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
});

export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

// Server Configuration
export const ServerConfigSchema = z.object({
  wallet: z.object({
    seed: z.string(),
    databasePath: z.string(),
    defaultMint: z.string().optional(),
    trustedMints: z.array(z.string()),
  }),
  mcp: McpServerConfigSchema,
  logging: z
    .object({
      level: z.enum(["debug", "info", "warn", "error"]),
    })
    .optional(),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

// Tool Handler Types
export interface ToolHandlerContext {
  walletService: WalletService;
}

// MCP Error Types - Simplified
function createMcpError(code: string, message: string): Error {
  const error = new Error(message);
  (error as any).code = code;
  return error;
}

export function createToolExecutionError(message: string): Error {
  return createMcpError("TOOL_EXECUTION_ERROR", message);
}

export function createConfigurationError(message: string): Error {
  return createMcpError("CONFIGURATION_ERROR", message);
}

// Default Configuration
export const DEFAULT_SERVER_CONFIG: Partial<ServerConfig> = {
  mcp: {
    name: "cashu-wallet-mcp-server",
    version: "1.0.0",
    description: "MCP server for Cashu wallet operations using Coco Cashu",
  },
  logging: {
    level: "info" as const,
  },
};

// Environment Variables Schema
export const EnvConfigSchema = z.object({
  COCO_SEED: z.string().optional(),
  COCO_DATABASE_PATH: z.string().default("./coco.db"),
  COCO_DEFAULT_MINT: z.string().optional(),
  MCP_SERVER_NAME: z.string().default("cashu-wallet-mcp-server"),
  MCP_SERVER_VERSION: z.string().default("1.0.0"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type EnvConfig = z.infer<typeof EnvConfigSchema>;
