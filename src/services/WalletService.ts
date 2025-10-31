import {
  initializeCoco,
  type HistoryEntry,
  type Manager,
  type MeltQuote,
  type MintQuote,
} from "coco-cashu-core";
import { SqliteRepositories } from "coco-cashu-sqlite3";
import { Database } from "sqlite3";
import * as bip39 from "@scure/bip39";
import { type Token } from "@cashu/cashu-ts";

import type {
  CocoWalletConfig,
  BalanceResult,
  AddMintParams,
  ListMintsParams,
  TrustMintParams,
  UntrustMintParams,
  RemoveMintParams,
  MintInfo,
  MintsListResult,
  TransactionFilters,
} from "../types/wallet-api.js";
import { createWalletApiError } from "../types/wallet-api.js";
import { ServiceUtils } from "../utils/ServiceUtils.js";
import { getDefaultMintUrl } from "../utils/MintUtils.js";
import { webSocketFactory } from "./WebSocketFactory.js";

export class WalletService {
  private manager: Manager | null = null;
  private database: Database | null = null;
  private repositories: SqliteRepositories | null = null;

  getManager(): Manager | null {
    return this.manager;
  }

  getRepositories(): SqliteRepositories | null {
    return this.repositories;
  }

  async initialize(config: CocoWalletConfig): Promise<void> {
    try {
      // Initialize database
      this.database = new Database(config.databasePath);
      this.repositories = new SqliteRepositories({ database: this.database });
      await this.repositories.init();

      // Create seed getter function
      const seedGetter = async (): Promise<Uint8Array> => {
        return bip39.mnemonicToSeedSync(config.seed);
      };

      this.manager = await initializeCoco({
        repo: this.repositories,
        seedGetter,
        webSocketFactory,
      });

      await this.enableQuoteWatchers();
    } catch (error) {
      throw createWalletApiError(
        "WALLET_INIT_FAILED",
        `Failed to initialize wallet: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  private async enableQuoteWatchers(): Promise<void> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Quote service",
    );

    return await ServiceUtils.withServiceError(async () => {
      // Enable mint quote watcher for real-time updates
      await manager.enableMintQuoteWatcher();

      // Enable mint quote processor for automatic redemption
      await manager.enableMintQuoteProcessor();

      // Enable proof state watcher for comprehensive state tracking
      await manager.enableProofStateWatcher();
    }, "enable quote watchers");
  }

  async getBalance(): Promise<BalanceResult> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(async () => {
      const balances = await manager.wallet.getBalances();

      // Calculate total balance across all mints
      let total = 0;
      for (const mintUrl in balances) {
        const balance = balances[mintUrl];
        if (balance !== undefined) {
          total += balance;
        }
      }

      return {
        total,
        breakdown: balances,
      };
    }, "get balance");
  }

  async restore(mintUrl?: string): Promise<void> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        if (mintUrl) {
          await manager.wallet.restore(mintUrl);
        } else {
          const trustedMints = await this.getAllTrustedMints();
          for (const mint of trustedMints) {
            await manager.wallet.restore(mint);
          }
        }
      },
      "restore wallet",
      { mintUrl },
    );
  }

  async getDefaultMint(): Promise<string> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );
    return await getDefaultMintUrl(manager);
  }

  isInitialized(): boolean {
    return this.manager !== null;
  }

  isReady(): boolean {
    return this.isInitialized();
  }

  async resolveMintUrl(mintUrl?: string): Promise<string> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );
    return mintUrl || (await getDefaultMintUrl(manager));
  }

  // ============================================================================
  // Mint Management Methods
  // ============================================================================

  async addMint(params: AddMintParams): Promise<MintInfo> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        // Use existing Coco Cashu Manager method to add mint
        const result = await manager.mint.addMint(params.mintUrl, {
          trusted: params.trusted ?? false,
        });

        // Convert Coco Cashu Mint object to our MintInfo schema
        return {
          mintUrl: result.mint.mintUrl,
          trusted: result.mint.trusted,
          lastChecked: result.mint.updatedAt,
        };
      },
      "add mint",
      { mintUrl: params.mintUrl, trusted: params.trusted },
    );
  }

  async listMints(params: ListMintsParams = {}): Promise<MintsListResult> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        // Use existing Coco Cashu Manager method to get all mints
        const allMints = await manager.mint.getAllMints();

        // Filter based on the requested filter
        let filteredMints = allMints;
        if (params.filter === "trusted") {
          filteredMints = allMints.filter((mint) => mint.trusted);
        } else if (params.filter === "untrusted") {
          filteredMints = allMints.filter((mint) => !mint.trusted);
        }

        // Convert Coco Cashu Mint objects to our MintInfo schema
        const mints: MintInfo[] = filteredMints.map((mint) => ({
          mintUrl: mint.mintUrl,
          trusted: mint.trusted,
          lastChecked: mint.updatedAt,
        }));

        const trustedCount = allMints.filter((mint) => mint.trusted).length;
        const untrustedCount = allMints.filter((mint) => !mint.trusted).length;

        return {
          mints,
          total: allMints.length,
          trusted: trustedCount,
          untrusted: untrustedCount,
        };
      },
      "list mints",
      { filter: params.filter },
    );
  }

  async trustMint(params: TrustMintParams): Promise<MintInfo> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        await manager.mint.trustMint(params.mintUrl);

        return {
          mintUrl: params.mintUrl,
          trusted: true,
        };
      },
      "trust mint",
      { mintUrl: params.mintUrl },
    );
  }

  async untrustMint(params: UntrustMintParams): Promise<MintInfo> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        // Use existing Coco Cashu Manager method to untrust mint
        await manager.mint.untrustMint(params.mintUrl);

        // Get the updated mint info
        const mint = await this.repositories!.mintRepository.getMintByUrl(
          params.mintUrl,
        );

        return {
          mintUrl: mint.mintUrl,
          trusted: mint.trusted,
          lastChecked: mint.updatedAt,
        };
      },
      "untrust mint",
      { mintUrl: params.mintUrl },
    );
  }

  async removeMint(params: RemoveMintParams): Promise<void> {
    return await ServiceUtils.withServiceError(
      async () => {
        // Use existing Coco Cashu Manager method to remove mint
        await this.repositories!.mintRepository.deleteMint(params.mintUrl);
      },
      "remove mint",
      { mintUrl: params.mintUrl },
    );
  }

  async getAllTrustedMints(): Promise<string[]> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(async () => {
      const trustedMints = await manager.mint.getAllTrustedMints();
      // Extract URLs from mint objects
      return trustedMints.map((mint) => mint.mintUrl);
    }, "get all trusted mints");
  }

  // ============================================================================
  // Cashu Token Operations
  // ============================================================================
  async receiveTokens(token: string): Promise<{
    success: boolean;
  }> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        await manager.wallet.receive(token);

        return {
          success: true,
        };
      },
      "receive tokens",
      { tokenLength: token.length },
    );
  }

  async sendTokens(
    amount: number,
    mintUrl?: string,
  ): Promise<{
    token: Token;
    amount: number;
    mintUrl: string;
  }> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        const targetMintUrl = await this.resolveMintUrl(mintUrl);

        // Use Coco Cashu Manager's send method
        const token = await manager.wallet.send(targetMintUrl, amount);

        return {
          token,
          amount,
          mintUrl: targetMintUrl,
        };
      },
      "send tokens",
      { amount, mintUrl },
    );
  }

  // ============================================================================
  // Transaction Management Methods
  // ============================================================================

  async listTransactions(
    filters: TransactionFilters = {},
  ): Promise<HistoryEntry[]> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Transaction service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        // Get paginated history entries from the database
        const limit = filters.limit || 100;
        const offset = filters.offset || 0;

        const historyEntries = await manager.history.getPaginatedHistory(
          offset,
          limit,
        );

        return historyEntries;
      },
      "list transactions",
      { limit: filters.limit, offset: filters.offset },
    );
  }

  async getTransaction(quoteId: string): Promise<HistoryEntry | null> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Transaction service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        // Search through recent history entries for matching payment hash
        const historyEntries = await manager.history.getPaginatedHistory(
          0,
          100,
        );

        for (const entry of historyEntries) {
          // Check if this entry has a matching quoteId (which serves as payment_hash)
          if (
            (entry.type === "mint" || entry.type === "melt") &&
            entry.quoteId === quoteId
          ) {
            return entry;
          }
        }

        return null;
      },
      "get transaction",
      { quoteId },
    );
  }

  async checkQuoteStatus(
    quoteId: string,
    mintUrl: string,
  ): Promise<MintQuote | MeltQuote | null> {
    return await ServiceUtils.withServiceError(
      async () => {
        // Try to get mint quote first
        const mintQuote =
          await this.repositories!.mintQuoteRepository.getMintQuote(
            mintUrl,
            quoteId,
          );
        if (mintQuote) return mintQuote;

        // If not found, try to get melt quote
        const meltQuote =
          await this.repositories!.meltQuoteRepository.getMeltQuote(
            mintUrl,
            quoteId,
          );

        return meltQuote;
      },
      "check quote status",
      { quoteId, mintUrl },
    );
  }

  async cleanup(): Promise<void> {
    if (this.database) {
      this.database.close((err) => {
        if (err) {
          console.error("Error closing database:", err);
        }
      });
      this.database = null;
    }
    this.manager = null;
  }
}
