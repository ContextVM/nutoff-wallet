import { createWalletApiError } from "../types/wallet-api.js";
import type { ServiceLifecycle } from "../types/service-lifecycle.js";

/**
 * Base service class providing consistent lifecycle patterns
 * All services should extend this class for consistent initialization and cleanup
 */
export abstract class BaseService implements ServiceLifecycle {
  protected initialized = false;
  protected readyState = false;

  /**
   * Initialize the service - must be implemented by subclasses
   */
  abstract initialize(...args: any[]): Promise<void>;

  /**
   * Cleanup the service - must be implemented by subclasses
   */
  abstract cleanup(): Promise<void>;

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if service is ready for operations
   * Default implementation considers service ready when initialized
   * Subclasses can override for more specific readiness checks
   */
  isReady(): boolean {
    return this.initialized && this.readyState;
  }

  /**
   * Mark service as ready
   */
  protected markReady(): void {
    this.readyState = true;
  }

  /**
   * Mark service as not ready
   */
  protected markNotReady(): void {
    this.readyState = false;
  }

  /**
   * Validate that service is ready for operations
   */
  protected validateReady(operationName: string): void {
    if (!this.isReady()) {
      throw createWalletApiError(
        "SERVICE_NOT_READY",
        `${this.constructor.name} is not ready for operation: ${operationName}`,
      );
    }
  }

  /**
   * Validate that service is initialized
   */
  protected validateInitialized(operationName: string): void {
    if (!this.initialized) {
      throw createWalletApiError(
        "SERVICE_NOT_INITIALIZED",
        `${this.constructor.name} is not initialized for operation: ${operationName}`,
      );
    }
  }

  /**
   * Reset service state
   */
  protected resetState(): void {
    this.initialized = false;
    this.readyState = false;
  }
}
