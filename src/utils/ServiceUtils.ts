import type { Manager } from "coco-cashu-core";
import { createWalletApiError } from "../types/wallet-api.js";

/**
 * Shared utility functions for service initialization and validation
 */
export class ServiceUtils {
  /**
   * Validate that required dependencies are initialized
   */
  static validateDependencies<T>(
    dependencies: Record<string, T | null>,
    serviceName: string,
  ): void {
    const missingDeps = Object.entries(dependencies)
      .filter(([_, value]) => value === null || value === undefined)
      .map(([name]) => name);

    if (missingDeps.length > 0) {
      throw createWalletApiError(
        "SERVICE_NOT_INITIALIZED",
        `${serviceName} dependencies not initialized: ${missingDeps.join(", ")}`,
      );
    }
  }

  /**
   * Standardize parameter ordering for mint-related operations
   * Always use: mintUrl first, then other parameters
   */
  static standardizeMintParams(
    mintUrl?: string,
    ...otherParams: any[]
  ): [string, ...any[]] {
    if (!mintUrl) {
      throw createWalletApiError(
        "MINT_URL_REQUIRED",
        "Mint URL is required for this operation",
      );
    }
    return [mintUrl, ...otherParams];
  }

  /**
   * Create consistent error handling wrapper for service methods
   */
  static async withServiceError<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const contextInfo = context
        ? ` (${Object.entries(context)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")})`
        : "";
      throw createWalletApiError(
        `${operationName.toUpperCase()}_FAILED`,
        `Failed to ${operationName}${contextInfo}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Validate that a service is properly initialized and return the manager
   */
  static validateServiceInitialized(
    manager: Manager | null,
    serviceName: string,
  ): Manager {
    if (!manager) {
      throw createWalletApiError(
        "WALLET_NOT_INITIALIZED",
        `${serviceName} not initialized`,
      );
    }
    return manager;
  }
}
