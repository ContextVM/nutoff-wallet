import { initializeCoco, type Manager } from "coco-cashu-core";
import { SqliteRepositories } from "coco-cashu-sqlite3";
import { Database } from "sqlite3";
import * as bip39 from "@scure/bip39";

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
} from "../types/wallet-api.js";
import { createWalletApiError } from "../types/wallet-api.js";
import {
  type MeltQuoteResponse,
  type MintQuoteResponse,
  type Token,
} from "@cashu/cashu-ts";
import { QuoteService } from "./QuoteService.js";
import { EventService } from "./EventService.js";
import type { ServiceLifecycle } from "../types/service-lifecycle.js";
import { ServiceUtils } from "../utils/ServiceUtils.js";
import { getDefaultMintUrl } from "../utils/MintUtils.js";
import { webSocketFactory } from "./WebSocketFactory.js";

export class WalletService implements ServiceLifecycle {
  private manager: Manager | null = null;
  private database: Database | null = null;
  private quoteService: QuoteService = new QuoteService();
  private eventService: EventService = new EventService();
  private repositories: SqliteRepositories | null = null;

  getManager(): Manager | null {
    return this.manager;
  }

  getRepositories(): SqliteRepositories | null {
    return this.repositories;
  }

  getEventService(): EventService {
    return this.eventService;
  }

  getQuoteService(): QuoteService {
    return this.quoteService;
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

      // Initialize Coco using the proper API from docs/node-example.md:68-72
      // This automatically enables watchers and processors with proper defaults
      this.manager = await initializeCoco({
        repo: this.repositories,
        seedGetter,
        webSocketFactory,
      });

      // Initialize event service with manager
      await this.eventService.initialize(this.manager);

      // Initialize quote service with manager
      await this.quoteService.initialize(this.manager, this.repositories);

      console.error(
        "WalletService initialized successfully with WebSocket subscriptions and event monitoring",
      );
    } catch (error) {
      throw createWalletApiError(
        "WALLET_INIT_FAILED",
        `Failed to initialize wallet: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
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
        console.error(`Mint ${mintUrl}: balance ${balance}`);
        if (balance !== undefined) {
          total += balance;
        }
      }

      console.error("Total balance calculated:", total);

      return {
        total: total,
        breakdown: balances,
      };
    }, "get balance");
  }

  async addTrustedMint(mintUrl: string): Promise<void> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        // Add and trust the mint
        await manager.mint.addMint(mintUrl, { trusted: true });
        console.error(`Added and trusted mint: ${mintUrl}`);
      },
      "add trusted mint",
      { mintUrl },
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
      return trustedMints.map((mint: { mintUrl: string }) => {
        return mint.mintUrl;
      });
    }, "get all trusted mints");
  }

  async restore(mintUrl?: string): Promise<void> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        if (mintUrl) {
          // Restore specific mint
          await manager.wallet.restore(mintUrl);
        } else {
          // Restore all trusted mints
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

  async createMintQuote(
    mintUrl: string,
    amount: number,
  ): Promise<MintQuoteResponse> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );
    return await manager.quotes.createMintQuote(mintUrl, amount);
  }

  async createMeltQuote(
    mintUrl: string,
    invoice: string,
  ): Promise<MeltQuoteResponse> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );
    return await manager.quotes.createMeltQuote(mintUrl, invoice);
  }

  async payMeltQuote(mintUrl: string, quoteId: string): Promise<void> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );
    await manager.quotes.payMeltQuote(mintUrl, quoteId);
  }

  async redeemMintQuote(mintUrl: string, quoteId: string): Promise<void> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );
    await manager.quotes.redeemMintQuote(mintUrl, quoteId);
  }

  public async resolveMintUrl(mintUrl?: string): Promise<string> {
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
    ServiceUtils.validateDependencies(
      { repositories: this.repositories },
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
        const mints: MintInfo[] = await Promise.all(
          filteredMints.map(async (mint) => {
            return {
              mintUrl: mint.mintUrl,
              trusted: mint.trusted,
              lastChecked: mint.updatedAt,
            };
          }),
        );

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
    ServiceUtils.validateDependencies(
      { repositories: this.repositories },
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        // Use existing Coco Cashu Manager method to trust mint
        await manager.mint.trustMint(params.mintUrl);

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
      "trust mint",
      { mintUrl: params.mintUrl },
    );
  }

  async untrustMint(params: UntrustMintParams): Promise<MintInfo> {
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );
    ServiceUtils.validateDependencies(
      { repositories: this.repositories },
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
    const manager = ServiceUtils.validateServiceInitialized(
      this.manager,
      "Wallet service",
    );
    ServiceUtils.validateDependencies(
      { repositories: this.repositories },
      "Wallet service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        // Use existing Coco Cashu Manager method to remove mint
        await this.repositories!.mintRepository.deleteMint(params.mintUrl);
      },
      "remove mint",
      { mintUrl: params.mintUrl },
    );
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
        // Use Coco Cashu Manager's receive method
        await manager.wallet.receive(token);

        // TODO: To get the amount we should use the proper coco cashu core event
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
          token: token,
          amount,
          mintUrl: targetMintUrl,
        };
      },
      "send tokens",
      { amount, mintUrl },
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
    await this.quoteService.cleanup();
    await this.eventService.cleanup();
    this.manager = null;
  }
}
