import { EventEmitter } from "events";
import type { Manager } from "coco-cashu-core";
import type { ServiceLifecycle } from "../types/service-lifecycle.js";
import { BaseService } from "./BaseService.js";

/**
 * Centralized event service for handling all Coco Cashu events
 * Provides comprehensive event logging and cross-service coordination
 */
export class EventService extends BaseService {
  private manager: Manager | null = null;
  private eventEmitter = new EventEmitter();

  /**
   * Initialize event service with Coco Cashu manager
   */
  async initialize(manager: Manager): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.manager = manager;
    this.setupEventListeners();
    this.initialized = true;
    this.markReady();

    console.error(
      "EventService initialized with comprehensive event monitoring",
    );
  }

  /**
   * Set up listeners for all Coco Cashu core events
   */
  private setupEventListeners(): void {
    if (!this.manager) return;

    // Mint events
    this.manager.on("mint:added", (payload) => {
      this.logEvent("mint:added", payload);
    });

    this.manager.on("mint:updated", (payload) => {
      this.logEvent("mint:updated", payload);
    });

    // Counter events
    this.manager.on("counter:updated", (payload) => {
      this.logEvent("counter:updated", payload);
    });

    // Proof events
    this.manager.on("proofs:saved", (payload) => {
      this.logEvent("proofs:saved", payload);
    });

    this.manager.on("proofs:state-changed", (payload) => {
      this.logEvent("proofs:state-changed", payload);
    });

    this.manager.on("proofs:deleted", (payload) => {
      this.logEvent("proofs:deleted", payload);
    });

    this.manager.on("proofs:wiped", (payload) => {
      this.logEvent("proofs:wiped", payload);
    });

    // Mint quote events
    this.manager.on("mint-quote:state-changed", (payload) => {
      this.logEvent("mint-quote:state-changed", payload);
    });

    this.manager.on("mint-quote:created", (payload) => {
      this.logEvent("mint-quote:created", payload);
    });

    this.manager.on("mint-quote:added", (payload) => {
      this.logEvent("mint-quote:added", payload);
    });

    this.manager.on("mint-quote:requeue", (payload) => {
      this.logEvent("mint-quote:requeue", payload);
    });

    this.manager.on("mint-quote:redeemed", (payload) => {
      this.logEvent("mint-quote:redeemed", payload);
    });

    // Melt quote events
    this.manager.on("melt-quote:created", (payload) => {
      this.logEvent("melt-quote:created", payload);
    });

    this.manager.on("melt-quote:state-changed", (payload) => {
      this.logEvent("melt-quote:state-changed", payload);
    });

    this.manager.on("melt-quote:paid", (payload) => {
      this.logEvent("melt-quote:paid", payload);
    });

    // Token operations events
    this.manager.on("send:created", (payload) => {
      this.logEvent("send:created", payload);
    });

    this.manager.on("receive:created", (payload) => {
      this.logEvent("receive:created", payload);
    });

    // History events
    this.manager.on("history:updated", (payload) => {
      this.logEvent("history:updated", payload);
    });
  }

  /**
   * Log event for debugging and monitoring
   */
  private logEvent(eventName: string, payload: any): void {
    console.error(`[EventService] ${eventName}:`, {
      timestamp: new Date().toISOString(),
      ...payload,
    });
  }

  /**
   * Subscribe to specific event types
   */
  subscribe<T>(eventName: string, callback: (payload: T) => void): () => void {
    this.eventEmitter.on(eventName, callback);
    return () => this.eventEmitter.off(eventName, callback);
  }

  /**
   * Wait for specific event with timeout
   */
  waitForEvent<T>(
    eventName: string,
    predicate?: (payload: T) => boolean,
    timeoutMs: number = 30000,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.eventEmitter.off(eventName, handler);
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeoutMs);

      const handler = (payload: T) => {
        if (!predicate || predicate(payload)) {
          clearTimeout(timeout);
          this.eventEmitter.off(eventName, handler);
          resolve(payload);
        }
      };

      this.eventEmitter.on(eventName, handler);
    });
  }

  /**
   * Cleanup event listeners
   */
  async cleanup(): Promise<void> {
    this.eventEmitter.removeAllListeners();
    this.manager = null;
    this.resetState();
  }
}
