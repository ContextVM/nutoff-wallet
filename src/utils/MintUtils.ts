import { createWalletApiError } from "../types/wallet-api.js";
import type { Manager } from "coco-cashu-core";

export async function getDefaultMintUrl(manager: Manager): Promise<string> {
  const trustedMints = await manager.mint.getAllTrustedMints();

  if (trustedMints.length === 0) {
    throw createWalletApiError(
      "NO_TRUSTED_MINTS",
      "No trusted mints available",
    );
  }

  const firstMint = trustedMints[0];
  if (!firstMint) {
    throw createWalletApiError(
      "NO_TRUSTED_MINTS",
      "No trusted mints available",
    );
  }

  return firstMint.mintUrl;
}
