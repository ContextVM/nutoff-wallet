import type { TransactionFilters } from "../types/wallet-api.js";
import type { Manager, HistoryEntry } from "coco-cashu-core";
import { ServiceUtils } from "../utils/ServiceUtils.js";

export class TransactionService {
  private manager: Manager | null = null;

  async initialize(manager: Manager): Promise<void> {
    this.manager = manager;
  }

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
}
