#!/usr/bin/env bun

import { CashuMcpServer } from "./mcp/McpServer.js";
import { ConfigService } from "./config/ConfigService.js";
import { WalletService } from "./services/WalletService.js";

async function main() {
  try {
    console.error("Starting Cashu Wallet MCP Server...");

    // Load configuration
    const configService = new ConfigService();
    const config = await configService.loadConfig();

    // Initialize MCP server
    const mcpServer = new CashuMcpServer(config);

    // Initialize wallet with configuration
    await mcpServer.initializeWallet({
      seed: config.wallet.seed,
      databasePath: config.wallet.databasePath,
    });

    // Start the MCP server
    await mcpServer.start();

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.error("Received SIGINT, shutting down gracefully...");
      await mcpServer.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.error("Received SIGTERM, shutting down gracefully...");
      await mcpServer.stop();
      process.exit(0);
    });

    process.on("uncaughtException", (error) => {
      console.error("Uncaught exception:", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled rejection at:", promise, "reason:", reason);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start Cashu Wallet MCP Server:", error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CashuMcpServer, ConfigService, WalletService };
