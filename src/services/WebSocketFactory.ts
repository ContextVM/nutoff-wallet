import type { WebSocketFactory } from "coco-cashu-core";

/**
 * WebSocket factory implementation for Node.js environment
 * This provides WebSocket support for Coco Cashu's real-time subscriptions
 */
export const webSocketFactory: WebSocketFactory = (url: string) =>
  new WebSocket(url);
