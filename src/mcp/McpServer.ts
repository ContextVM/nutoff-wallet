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
import { TransactionService } from "../services/TransactionService.js";
import { McpToolFactory } from "./McpToolFactory.js";
import type { HistoryEntry, MintQuote } from "coco-cashu-core";
import type { MeltQuote } from "../types/wallet-api.js";
import { getEncodedToken } from "@cashu/cashu-ts";

// TODO: Still needing tools to create cashu tokens
export class CashuMcpServer {
  private server: McpServer;
  private walletService: WalletService;
  private transactionService: TransactionService;
  private transport: StdioServerTransport | null = null;

  constructor(config: McpServerConfig) {
    this.server = new McpServer({
      name: config.name,
      version: config.version,
    });

    // Initialize services
    this.walletService = new WalletService();
    this.transactionService = new TransactionService();

    // Register all NWC tools
    this.registerWalletTools();
  }

  private registerWalletTools(): void {
    const context: ToolHandlerContext = {
      walletService: this.walletService,
      transactionService: this.transactionService,
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
      McpToolFactory.createToolHandler(
        this.handlePayInvoice.bind(this),
        context,
      ),
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
      McpToolFactory.createToolHandler(
        this.handleMakeInvoice.bind(this),
        context,
      ),
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
      McpToolFactory.createToolHandler(
        this.handleLookupQuote.bind(this),
        context,
      ),
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
      McpToolFactory.createArrayToolHandler(
        this.handleListTransactions.bind(this),
        context,
        "transactions",
      ),
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
      McpToolFactory.createToolHandler(
        this.handleGetBalance.bind(this),
        context,
      ),
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
      McpToolFactory.createToolHandler(this.handleAddMint.bind(this), context),
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
      McpToolFactory.createToolHandler(
        this.handleListMints.bind(this),
        context,
      ),
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
      McpToolFactory.createToolHandler(
        this.handleTrustMint.bind(this),
        context,
      ),
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
      McpToolFactory.createToolHandler(
        this.handleUntrustMint.bind(this),
        context,
      ),
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
      McpToolFactory.createSuccessToolHandler(
        this.handleRemoveMint.bind(this),
        context,
      ),
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
      McpToolFactory.createToolHandler(
        this.handleReceiveCashu.bind(this),
        context,
      ),
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
      McpToolFactory.createToolHandler(
        this.handleSendCashu.bind(this),
        context,
      ),
    );
  }

  private async handlePayInvoice(
    params: z.infer<typeof PayInvoiceParamsSchema>,
    context: ToolHandlerContext,
  ): Promise<MeltQuote> {
    const { invoice, mintUrl } = params;

    // Get manager directly for streamlined operations
    const manager = context.walletService.getManager();
    if (!manager) {
      throw new Error("Wallet service not initialized");
    }

    // Resolve mint URL
    const targetMintUrl =
      mintUrl || (await context.walletService.getDefaultMint());

    // Create and pay melt quote directly using Manager
    const meltQuote = await manager.quotes.createMeltQuote(
      targetMintUrl,
      invoice,
    );
    await manager.quotes.payMeltQuote(targetMintUrl, meltQuote.quote);

    // Return the melt quote directly (no need to check status again)
    return meltQuote as MeltQuote;
  }

  private async handleMakeInvoice(
    params: z.infer<typeof MakeInvoiceParamsSchema>,
    context: ToolHandlerContext,
  ): Promise<z.infer<typeof MintQuoteSchema>> {
    const { amount, mintUrl } = params;

    // Get manager directly for streamlined operations
    const manager = context.walletService.getManager();
    if (!manager) {
      throw new Error("Wallet service not initialized");
    }

    // Resolve mint URL and create mint quote directly
    const targetMintUrl =
      mintUrl || (await context.walletService.getDefaultMint());
    const mintQuote = await manager.quotes.createMintQuote(
      targetMintUrl,
      amount,
    );

    return mintQuote;
  }

  private async handleLookupQuote(
    params: { quoteId: string },
    context: ToolHandlerContext,
  ): Promise<z.infer<typeof MintQuoteSchema> | null> {
    const { quoteId } = params;

    // Use the quote service directly for streamlined operations
    const quote = await context.walletService
      .getQuoteService()
      .checkQuoteStatus(quoteId);

    // Return MintQuote as a plain object for MCP compatibility
    return quote as MintQuote;
  }

  private async handleListTransactions(
    params: z.infer<typeof ListTransactionsParamsSchema>,
    context: ToolHandlerContext,
  ): Promise<HistoryEntry[]> {
    const { limit, offset } = params;

    const transactions = await context.transactionService.listTransactions({
      limit,
      offset,
    });

    return transactions;
  }

  private async handleGetBalance(
    params: z.infer<typeof GetBalanceParamsSchema>,
    context: ToolHandlerContext,
  ): Promise<z.infer<typeof BalanceResultSchema>> {
    const balance = await context.walletService.getBalance();

    return balance;
  }

  private async handleAddMint(
    params: z.infer<typeof AddMintParamsSchema>,
    context: ToolHandlerContext,
  ): Promise<z.infer<typeof MintInfoSchema>> {
    return await context.walletService.addMint(params);
  }

  private async handleListMints(
    params: z.infer<typeof ListMintsParamsSchema>,
    context: ToolHandlerContext,
  ): Promise<z.infer<typeof MintsListResultSchema>> {
    return await context.walletService.listMints(params);
  }

  private async handleTrustMint(
    params: z.infer<typeof TrustMintParamsSchema>,
    context: ToolHandlerContext,
  ): Promise<z.infer<typeof MintInfoSchema>> {
    return await context.walletService.trustMint(params);
  }

  private async handleUntrustMint(
    params: z.infer<typeof UntrustMintParamsSchema>,
    context: ToolHandlerContext,
  ): Promise<z.infer<typeof MintInfoSchema>> {
    return await context.walletService.untrustMint(params);
  }

  private async handleRemoveMint(
    params: z.infer<typeof RemoveMintParamsSchema>,
    context: ToolHandlerContext,
  ): Promise<void> {
    await context.walletService.removeMint(params);
  }

  // ============================================================================
  // Cashu Token Operations Handlers
  // ============================================================================

  private async handleReceiveCashu(
    params: z.infer<typeof ReceiveCashuParamsSchema>,
    context: ToolHandlerContext,
  ): Promise<z.infer<typeof ReceiveCashuResultSchema>> {
    const { token } = params;
    const result = await context.walletService.receiveTokens(token);
    // Convert the current result to match the expected schema
    return {
      success: result.success,
    };
  }

  private async handleSendCashu(
    params: z.infer<typeof SendCashuParamsSchema>,
    context: ToolHandlerContext,
  ): Promise<z.infer<typeof SendCashuResultSchema>> {
    const { amount, mintUrl } = params;
    const targetMintUrl =
      mintUrl || (await context.walletService.getDefaultMint());
    const result = await context.walletService.sendTokens(
      amount,
      targetMintUrl,
    );
    const encodedToken = getEncodedToken(result.token);
    // Convert Token object to string for MCP transport
    return {
      token: encodedToken,
      amount: result.amount,
      mintUrl: targetMintUrl,
    };
  }

  async initializeWallet(config: {
    seed: string;
    databasePath: string;
    trustedMints: string[];
  }): Promise<void> {
    await this.walletService.initialize(config);

    // Initialize transaction service with the manager from wallet service
    const manager = this.walletService.getManager();
    if (manager) {
      await this.transactionService.initialize(manager);
    }

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
