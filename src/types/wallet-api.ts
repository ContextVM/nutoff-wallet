import { z } from "zod";

// ============================================================================
// Wallet Configuration Types
// ============================================================================

export const CocoWalletConfigSchema = z.object({
  seed: z.string(),
  databasePath: z.string(),
});

export type CocoWalletConfig = z.infer<typeof CocoWalletConfigSchema>;

export const PayInvoiceParamsSchema = z.object({
  invoice: z.string(),
  mintUrl: z.string(),
});

export const MakeInvoiceParamsSchema = z.object({
  amount: z.number().min(0, { message: "Amount cannot be negative" }),
  mintUrl: z.string().optional(),
});

export const ListTransactionsParamsSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export const GetBalanceParamsSchema = z.object({});

export const MintQuoteSchema = z.object({
  quote: z.string().optional(),
  request: z.string().optional(),
  amount: z.number().nullable().optional(),
  state: z.enum(["UNPAID", "PAID", "ISSUED"]).optional(),
  expiry: z.number().optional(),
  mintUrl: z.string().optional(),
  unit: z.string().optional(),
  pubkey: z.string().optional().nullable(),
  paid: z.boolean().optional(),
});

export const MeltQuoteSchema = z.object({
  quote: z.string(),
  request: z.string(),
  amount: z.number(),
  fee_reserve: z.number(),
  state: z.enum(["UNPAID", "PENDING", "PAID"]),
  expiry: z.number(),
  payment_preimage: z.string().nullable(),
  change: z
    .array(
      z.object({
        id: z.string(),
        amount: z.number(),
        C_: z.string(),
        dleq: z
          .object({
            s: z.string(),
            e: z.string(),
            r: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  unit: z.string(),
  mintUrl: z.string(),
  error: z.string().optional(),
  code: z.number().optional(),
  detail: z.string().optional(),
});

export const TransactionFiltersSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export const BalanceResultSchema = z.object({
  total: z.number(),
  breakdown: z.record(z.number()).optional(),
});

// Coco Cashu HistoryEntry Types
export const HistoryEntrySchema = z.discriminatedUnion("type", [
  // MintHistoryEntry
  z.object({
    id: z.string(),
    createdAt: z.number(),
    mintUrl: z.string(),
    unit: z.string(),
    metadata: z.record(z.string()).optional(),
    type: z.literal("mint"),
    paymentRequest: z.string(),
    quoteId: z.string(),
    state: z.enum(["UNPAID", "PAID", "ISSUED"]),
    amount: z.number(),
  }),
  // MeltHistoryEntry
  z.object({
    id: z.string(),
    createdAt: z.number(),
    mintUrl: z.string(),
    unit: z.string(),
    metadata: z.record(z.string()).optional(),
    type: z.literal("melt"),
    quoteId: z.string(),
    state: z.enum(["UNPAID", "PAID"]),
    amount: z.number(),
  }),
  // SendHistoryEntry
  z.object({
    id: z.string(),
    createdAt: z.number(),
    mintUrl: z.string(),
    unit: z.string(),
    metadata: z.record(z.string()).optional(),
    type: z.literal("send"),
    amount: z.number(),
    token: z
      .object({
        token: z
          .array(
            z.object({
              mint: z.string(),
              proofs: z.array(
                z.object({
                  id: z.string(),
                  amount: z.number(),
                  secret: z.string(),
                  C: z.string(),
                }),
              ),
            }),
          )
          .optional(),
      })
      .optional(),
  }),
  // ReceiveHistoryEntry
  z.object({
    id: z.string(),
    createdAt: z.number(),
    mintUrl: z.string(),
    unit: z.string(),
    metadata: z.record(z.string()).optional(),
    type: z.literal("receive"),
    amount: z.number(),
  }),
]);

// ============================================================================
// Type Exports
// ============================================================================

// NWC Request Types
export type PayInvoiceParams = z.infer<typeof PayInvoiceParamsSchema>;
export type MakeInvoiceParams = z.infer<typeof MakeInvoiceParamsSchema>;
export type ListTransactionsParams = z.infer<
  typeof ListTransactionsParamsSchema
>;
export type GetBalanceParams = z.infer<typeof GetBalanceParamsSchema>;

// Coco Cashu Types
export type MintQuote = z.infer<typeof MintQuoteSchema>;
export type MeltQuote = z.infer<typeof MeltQuoteSchema>;
export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;
export type BalanceResult = z.infer<typeof BalanceResultSchema>;
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

// Mint Management Types
export type AddMintParams = z.infer<typeof AddMintParamsSchema>;
export type ListMintsParams = z.infer<typeof ListMintsParamsSchema>;
export type TrustMintParams = z.infer<typeof TrustMintParamsSchema>;
export type UntrustMintParams = z.infer<typeof UntrustMintParamsSchema>;
export type RemoveMintParams = z.infer<typeof RemoveMintParamsSchema>;
export type MintInfo = z.infer<typeof MintInfoSchema>;
export type MintsListResult = z.infer<typeof MintsListResultSchema>;

// ============================================================================
// Error Types
// ============================================================================

export function createWalletApiError(
  code: string,
  message: string,
  originalError?: Error,
): Error {
  const error = new Error(message);
  (error as any).code = code;
  if (originalError) {
    (error as any).originalError = originalError;
  }
  return error;
}

export function createQuoteNotFoundError(quoteId: string): Error {
  return createWalletApiError("QUOTE_NOT_FOUND", `Quote ${quoteId} not found`);
}

// ============================================================================
// Mint Management Types
// ============================================================================

export const AddMintParamsSchema = z.object({
  mintUrl: z.string(),
  trusted: z.boolean().optional(),
});

export const ListMintsParamsSchema = z.object({
  filter: z.enum(["all", "trusted", "untrusted"]).optional(),
});

export const TrustMintParamsSchema = z.object({
  mintUrl: z.string(),
});

export const UntrustMintParamsSchema = z.object({
  mintUrl: z.string(),
});

export const RemoveMintParamsSchema = z.object({
  mintUrl: z.string(),
});

export const MintInfoSchema = z.object({
  mintUrl: z.string(),
  trusted: z.boolean(),
  lastChecked: z.number().optional().nullable(),
});

export const MintsListResultSchema = z.object({
  mints: z.array(MintInfoSchema),
  total: z.number(),
  trusted: z.number(),
  untrusted: z.number(),
});

// ============================================================================
// Mint Management Error Functions
// ============================================================================

export function createMintNotTrustedError(mintUrl: string): Error {
  return createWalletApiError(
    "MINT_NOT_TRUSTED",
    `Mint ${mintUrl} is not trusted`,
  );
}

export function createMintInvalidUrlError(mintUrl: string): Error {
  return createWalletApiError(
    "MINT_INVALID_URL",
    `Invalid mint URL: ${mintUrl}`,
  );
}

export function createMintAddFailedError(
  mintUrl: string,
  reason?: string,
): Error {
  return createWalletApiError(
    "MINT_ADD_FAILED",
    `Failed to add mint ${mintUrl}${reason ? `: ${reason}` : ""}`,
  );
}

export function createMintAlreadyExistsError(mintUrl: string): Error {
  return createWalletApiError(
    "MINT_ALREADY_EXISTS",
    `Mint ${mintUrl} already exists`,
  );
}

export function createMintListFailedError(reason?: string): Error {
  return createWalletApiError(
    "MINT_LIST_FAILED",
    `Failed to list mints${reason ? `: ${reason}` : ""}`,
  );
}

export function createMintTrustFailedError(
  mintUrl: string,
  reason?: string,
): Error {
  return createWalletApiError(
    "MINT_TRUST_FAILED",
    `Failed to trust mint ${mintUrl}${reason ? `: ${reason}` : ""}`,
  );
}

export function createMintNotFoundError(mintUrl: string): Error {
  return createWalletApiError("MINT_NOT_FOUND", `Mint ${mintUrl} not found`);
}

export function createMintUntrustFailedError(
  mintUrl: string,
  reason?: string,
): Error {
  return createWalletApiError(
    "MINT_UNTRUST_FAILED",
    `Failed to untrust mint ${mintUrl}${reason ? `: ${reason}` : ""}`,
  );
}

export function createMintRemoveFailedError(
  mintUrl: string,
  reason?: string,
): Error {
  return createWalletApiError(
    "MINT_REMOVE_FAILED",
    `Failed to remove mint ${mintUrl}${reason ? `: ${reason}` : ""}`,
  );
}

// ============================================================================
// Cashu Token Operations Types
// ============================================================================

export const ReceiveCashuParamsSchema = z.object({
  token: z.string(),
});

export const SendCashuParamsSchema = z.object({
  amount: z.number().min(1, { message: "Amount must be positive" }),
  mintUrl: z.string().optional(),
});

export const ReceiveCashuResultSchema = z.object({
  success: z.boolean(),
});

export const SendCashuResultSchema = z.object({
  token: z.string(),
  amount: z.number(),
  mintUrl: z.string(),
});

// ============================================================================
// Cashu Token Operations Error Functions
// ============================================================================

export function createReceiveCashuFailedError(reason?: string): Error {
  return createWalletApiError(
    "RECEIVE_CASHU_FAILED",
    `Failed to receive Cashu tokens${reason ? `: ${reason}` : ""}`,
  );
}

export function createSendCashuFailedError(reason?: string): Error {
  return createWalletApiError(
    "SEND_CASHU_FAILED",
    `Failed to send Cashu tokens${reason ? `: ${reason}` : ""}`,
  );
}

export function createInvalidTokenError(): Error {
  return createWalletApiError("INVALID_TOKEN", "Invalid Cashu token format");
}

export function createInsufficientBalanceError(mintUrl: string): Error {
  return createWalletApiError(
    "INSUFFICIENT_BALANCE",
    `Insufficient balance in mint ${mintUrl}`,
  );
}
