import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import type { McpServerConfig, ToolHandlerContext } from "../types/mcp.js";
import {
  PayInvoiceParamsSchema,
  MakeInvoiceParamsSchema,
  ListTransactionsParamsSchema,
  GetBalanceParamsSchema,
  MintQuoteSchema,
  MeltQuoteSchema,
  HistoryEntrySchema,
  BalanceResultSchema,
  AddMintParamsSchema,
  ListMintsParamsSchema,
  TrustMintParamsSchema,
  UntrustMintParamsSchema,
  RemoveMintParamsSchema,
  MintsListResultSchema,
  MintInfoSchema,
  ReceiveCashuParamsSchema,
  SendCashuParamsSchema,
  ReceiveCashuResultSchema,
  SendCashuResultSchema,
} from "../types/wallet-api.js";
import { WalletService } from "../services/WalletService.js";
import type { HistoryEntry, MintQuote } from "coco-cashu-core";
import type { MeltQuote } from "../types/wallet-api.js";
import { getEncodedToken } from "@cashu/cashu-ts";
import {
  handleAddMint,
  handleGetBalance,
  handleListMints,
  handleListTransactions,
  handleLookupQuote,
  handleMakeInvoice,
  handlePayInvoice,
  handleReceiveCashu,
  handleRemoveMint,
  handleSendCashu,
  handleTrustMint,
  handleUntrustMint,
} from "./toolHandlers.js";

export class CashuMcpServer {
  private server: McpServer;
  private walletService: WalletService;
  private transport: StdioServerTransport | null = null;

  constructor(config: McpServerConfig) {
    this.server = new McpServer({
      name: config.name,
      version: config.version,
    });

    // Initialize services
    this.walletService = new WalletService();

    // Register all NWC tools
    this.registerWalletTools();
  }

  private registerWalletTools(): void {
    const context: ToolHandlerContext = {
      walletService: this.walletService,
    };

    // Pay Invoice Tool
    this.server.registerTool(
      "pay_invoice",
      {
        title: "Pay Invoice",
        description: "Pay a BOLT11 invoice using Cashu wallet",
        inputSchema: PayInvoiceParamsSchema.shape,
        outputSchema: MeltQuoteSchema.shape,
      },
      async (params) => {
        try {
          const result = await handlePayInvoice(params, context);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredContent: result,
          };
        } catch (error) {
          if (error instanceof Error && "code" in error) {
            throw new Error(`${(error as any).code}: ${error.message}`);
          }
          throw error;
        }
      },
    );

    // Make Invoice Tool
    this.server.registerTool(
      "make_invoice",
      {
        title: "Make Invoice",
        description: "Create an invoice for receiving payments",
        inputSchema: MakeInvoiceParamsSchema.shape,
        outputSchema: MintQuoteSchema.shape,
      },
      async (params) => {
        try {
          const result = await handleMakeInvoice(params, context);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredContent: result,
          };
        } catch (error) {
          if (error instanceof Error && "code" in error) {
            throw new Error(`${(error as any).code}: ${error.message}`);
          }
          throw error;
        }
      },
    );

    // Lookup Quote Tool
    this.server.registerTool(
      "lookup_quote",
      {
        title: "Lookup Quote",
        description: "Check quote status by quote ID",
        inputSchema: {
          quoteId: z.string(),
        },
        outputSchema: MintQuoteSchema.shape || {},
      },
      async (params) => {
        try {
          const result = await handleLookupQuote(params, context);
          const structuredContent = result || {};
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
          if (error instanceof Error && "code" in error) {
            throw new Error(`${(error as any).code}: ${error.message}`);
          }
          throw error;
        }
      },
    );

    // List Transactions Tool
    this.server.registerTool(
      "list_transactions",
      {
        title: "List Transactions",
        description: "List wallet transactions with filtering",
        inputSchema: ListTransactionsParamsSchema.shape,
        outputSchema: {
          transactions: z.array(HistoryEntrySchema),
        },
      },
      async (params) => {
        try {
          const result = await handleListTransactions(params, context);
          const structuredContent = { transactions: result };
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
          if (error instanceof Error && "code" in error) {
            throw new Error(`${(error as any).code}: ${error.message}`);
          }
          throw error;
        }
      },
    );

    // Get Balance Tool
    this.server.registerTool(
      "get_balance",
      {
        title: "Get Balance",
        description: "Get current wallet balance",
        inputSchema: GetBalanceParamsSchema.shape,
        outputSchema: BalanceResultSchema.shape,
      },
      async (params) => {
        try {
          const result = await handleGetBalance(params, context);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredContent: result,
          };
        } catch (error) {
          if (error instanceof Error && "code" in error) {
            throw new Error(`${(error as any).code}: ${error.message}`);
          }
          throw error;
        }
      },
    );

    // Add Mint Tool
    this.server.registerTool(
      "add_mint",
      {
        title: "Add Mint",
        description: "Add a new mint to the wallet with optional trust status",
        inputSchema: AddMintParamsSchema.shape,
        outputSchema: MintInfoSchema.shape,
      },
      async (params) => {
        try {
          const result = await handleAddMint(params, context);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredContent: result,
          };
        } catch (error) {
          if (error instanceof Error && "code" in error) {
            throw new Error(`${(error as any).code}: ${error.message}`);
          }
          throw error;
        }
      },
    );

    // List Mints Tool
    this.server.registerTool(
      "list_mints",
      {
        title: "List Mints",
        description: "List all mints with optional filtering by trust status",
        inputSchema: ListMintsParamsSchema.shape,
        outputSchema: MintsListResultSchema.shape,
      },
      async (params) => {
        try {
          const result = await handleListMints(params, context);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredContent: result,
          };
        } catch (error) {
          if (error instanceof Error && "code" in error) {
            throw new Error(`${(error as any).code}: ${error.message}`);
          }
          throw error;
        }
      },
    );

    // Trust Mint Tool
    this.server.registerTool(
      "trust_mint",
      {
        title: "Trust Mint",
        description: "Mark a mint as trusted for wallet operations",
        inputSchema: TrustMintParamsSchema.shape,
        outputSchema: MintInfoSchema.shape,
      },
      async (params) => {
        try {
          const result = await handleTrustMint(params, context);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredContent: result,
          };
        } catch (error) {
          if (error instanceof Error && "code" in error) {
            throw new Error(`${(error as any).code}: ${error.message}`);
          }
          throw error;
        }
      },
    );

    // Untrust Mint Tool
    this.server.registerTool(
      "untrust_mint",
      {
        title: "Untrust Mint",
        description: "Remove trust from a mint while preserving cached data",
        inputSchema: UntrustMintParamsSchema.shape,
        outputSchema: MintInfoSchema.shape,
      },
      async (params) => {
        try {
          const result = await handleUntrustMint(params, context);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredContent: result,
          };
        } catch (error) {
          if (error instanceof Error && "code" in error) {
            throw new Error(`${(error as any).code}: ${error.message}`);
          }
          throw error;
        }
      },
    );

    // Remove Mint Tool
    this.server.registerTool(
      "remove_mint",
      {
        title: "Remove Mint",
        description: "Remove a mint and all associated data completely",
        inputSchema: RemoveMintParamsSchema.shape,
        outputSchema: {
          success: z.boolean(),
        },
      },
      async (params) => {
        try {
          await handleRemoveMint(params, context);
          const structuredContent = { success: true };
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
          if (error instanceof Error && "code" in error) {
            throw new Error(`${(error as any).code}: ${error.message}`);
          }
          throw error;
        }
      },
    );

    // Receive Cashu Tokens Tool
    this.server.registerTool(
      "receive_cashu",
      {
        title: "Receive Cashu Tokens",
        description: "Receive Cashu tokens by providing a token string",
        inputSchema: ReceiveCashuParamsSchema.shape,
        outputSchema: ReceiveCashuResultSchema.shape,
      },
      async (params) => {
        try {
          const result = await handleReceiveCashu(params, context);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredContent: result,
          };
        } catch (error) {
          if (error instanceof Error && "code" in error) {
            throw new Error(`${(error as any).code}: ${error.message}`);
          }
          throw error;
        }
      },
    );

    // Send Cashu Tokens Tool
    this.server.registerTool(
      "send_cashu",
      {
        title: "Send Cashu Tokens",
        description: "Send Cashu tokens to create a new token for someone else",
        inputSchema: SendCashuParamsSchema.shape,
        outputSchema: SendCashuResultSchema.shape,
      },
      async (params) => {
        try {
          const result = await handleSendCashu(params, context);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
            structuredContent: result,
          };
        } catch (error) {
          if (error instanceof Error && "code" in error) {
            throw new Error(`${(error as any).code}: ${error.message}`);
          }
          throw error;
        }
      },
    );
  }

  async initializeWallet(config: {
    seed: string;
    databasePath: string;
    trustedMints: string[];
  }): Promise<void> {
    await this.walletService.initialize(config);

    console.error(
      "McpServer wallet initialized with consolidated service architecture",
    );
  }

  async start(): Promise<void> {
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    console.error("Cashu MCP Server started");
  }

  async stop(): Promise<void> {
    if (this.transport) {
      if (typeof this.transport.close === "function") {
        await this.transport.close();
      }
    }
    await this.walletService.cleanup();
  }
}
