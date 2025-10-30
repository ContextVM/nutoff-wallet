import { Manager, type MintQuote, type MeltQuote } from "coco-cashu-core";
import { SqliteRepositories } from "coco-cashu-sqlite3";
import { ServiceUtils } from "../utils/ServiceUtils.js";
import { BaseService } from "./BaseService.js";

export class QuoteService extends BaseService {
  private manager: Manager | null = null;
  private repositories: SqliteRepositories | null = null;

  async initialize(
    manager: Manager,
    repositories: SqliteRepositories,
  ): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.manager = manager;
    this.repositories = repositories;

    // Enable watchers and processors for automatic quote monitoring
    await this.enableQuoteWatchers();

    this.initialized = true;
    this.markReady();
    console.error("QuoteService initialized successfully");
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

      console.error("Quote watchers and processors enabled successfully");
    }, "enable quote watchers");
  }

  async checkQuoteStatus(
    quoteId: string,
    mintUrl: string,
  ): Promise<MintQuote | MeltQuote | null> {
    ServiceUtils.validateDependencies(
      { repositories: this.repositories },
      "Quote service",
    );

    return await ServiceUtils.withServiceError(
      async () => {
        const targetMintUrl = mintUrl;

        // Try to get mint quote first
        const mintQuote =
          await this.repositories!.mintQuoteRepository.getMintQuote(
            targetMintUrl,
            quoteId,
          );
        if (mintQuote) return mintQuote;

        // If not found, try to get melt quote
        const meltQuote =
          await this.repositories!.meltQuoteRepository.getMeltQuote(
            targetMintUrl,
            quoteId,
          );

        return meltQuote;
      },
      "check quote status",
      { quoteId, mintUrl },
    );
  }

  async cleanup(): Promise<void> {
    // Unsubscribe all active subscriptions
    this.manager = null;
    this.repositories = null;
    this.resetState();
  }
}
