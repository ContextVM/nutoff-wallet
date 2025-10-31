import type z from "zod";
import type {
  AddMintParamsSchema,
  BalanceResultSchema,
  GetBalanceParamsSchema,
  ListMintsParamsSchema,
  ListTransactionsParamsSchema,
  MakeInvoiceParamsSchema,
  MintInfoSchema,
  MintQuoteSchema,
  MintsListResultSchema,
  PayInvoiceParamsSchema,
  ReceiveCashuParamsSchema,
  ReceiveCashuResultSchema,
  RemoveMintParamsSchema,
  SendCashuParamsSchema,
  SendCashuResultSchema,
  TrustMintParamsSchema,
  UntrustMintParamsSchema,
} from "../types/wallet-api";
import type { ToolHandlerContext } from "../types/mcp";
import type { HistoryEntry, MeltQuote, MintQuote } from "coco-cashu-core";
import { getEncodedToken, type MeltQuoteResponse } from "@cashu/cashu-ts";

export async function handlePayInvoice(
  params: z.infer<typeof PayInvoiceParamsSchema>,
  context: ToolHandlerContext,
): Promise<MeltQuoteResponse> {
  const { invoice, mintUrl } = params;

  const manager = context.walletService.getManager();
  if (!manager) {
    throw new Error("Wallet service not initialized");
  }

  const targetMintUrl =
    mintUrl || (await context.walletService.getDefaultMint());

  const meltQuote = await manager.quotes.createMeltQuote(
    targetMintUrl,
    invoice,
  );
  await manager.quotes.payMeltQuote(targetMintUrl, meltQuote.quote);

  return meltQuote;
}

export async function handleMakeInvoice(
  params: z.infer<typeof MakeInvoiceParamsSchema>,
  context: ToolHandlerContext,
): Promise<z.infer<typeof MintQuoteSchema>> {
  const { amount, mintUrl } = params;

  const manager = context.walletService.getManager();
  if (!manager) {
    throw new Error("Wallet service not initialized");
  }

  const targetMintUrl =
    mintUrl || (await context.walletService.getDefaultMint());

  const mintQuote = await manager.quotes.createMintQuote(targetMintUrl, amount);

  return mintQuote;
}

export async function handleLookupQuote(
  params: { quoteId: string; mintUrl?: string },
  context: ToolHandlerContext,
): Promise<z.infer<typeof MintQuoteSchema> | null> {
  const { quoteId, mintUrl } = params;

  const targetMintUrl =
    mintUrl || (await context.walletService.getDefaultMint());

  const quote = await context.walletService.checkQuoteStatus(
    quoteId,
    targetMintUrl,
  );

  return quote as MintQuote;
}

export async function handleListTransactions(
  params: z.infer<typeof ListTransactionsParamsSchema>,
  context: ToolHandlerContext,
): Promise<HistoryEntry[]> {
  const { limit, offset } = params;

  const transactions = await context.walletService.listTransactions({
    limit,
    offset,
  });

  return transactions;
}

export async function handleGetBalance(
  params: z.infer<typeof GetBalanceParamsSchema>,
  context: ToolHandlerContext,
): Promise<z.infer<typeof BalanceResultSchema>> {
  const balance = await context.walletService.getBalance();

  return balance;
}

export async function handleAddMint(
  params: z.infer<typeof AddMintParamsSchema>,
  context: ToolHandlerContext,
): Promise<z.infer<typeof MintInfoSchema>> {
  return await context.walletService.addMint(params);
}

export async function handleListMints(
  params: z.infer<typeof ListMintsParamsSchema>,
  context: ToolHandlerContext,
): Promise<z.infer<typeof MintsListResultSchema>> {
  return await context.walletService.listMints(params);
}

export async function handleTrustMint(
  params: z.infer<typeof TrustMintParamsSchema>,
  context: ToolHandlerContext,
): Promise<z.infer<typeof MintInfoSchema>> {
  return await context.walletService.trustMint(params);
}

export async function handleUntrustMint(
  params: z.infer<typeof UntrustMintParamsSchema>,
  context: ToolHandlerContext,
): Promise<z.infer<typeof MintInfoSchema>> {
  return await context.walletService.untrustMint(params);
}

export async function handleRemoveMint(
  params: z.infer<typeof RemoveMintParamsSchema>,
  context: ToolHandlerContext,
): Promise<void> {
  await context.walletService.removeMint(params);
}

// ============================================================================
// Cashu Token Operations Handlers
// ============================================================================

export async function handleReceiveCashu(
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

export async function handleSendCashu(
  params: z.infer<typeof SendCashuParamsSchema>,
  context: ToolHandlerContext,
): Promise<z.infer<typeof SendCashuResultSchema>> {
  const { amount, mintUrl } = params;
  const targetMintUrl =
    mintUrl || (await context.walletService.getDefaultMint());
  const result = await context.walletService.sendTokens(amount, targetMintUrl);
  const encodedToken = getEncodedToken(result.token);
  return {
    token: encodedToken,
    amount: result.amount,
    mintUrl: targetMintUrl,
  };
}
