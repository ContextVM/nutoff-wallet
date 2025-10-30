import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { writeFile, readFile, access } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

import type { ServerConfig, EnvConfig } from "../types/mcp.js";
import {
  ServerConfigSchema,
  EnvConfigSchema,
  DEFAULT_SERVER_CONFIG,
} from "../types/mcp.js";
import { createConfigurationError } from "../types/mcp.js";

export class ConfigService {
  private config: ServerConfig | null = null;

  constructor() {
    // No config path needed - environment variables only
  }

  async loadConfig(): Promise<ServerConfig> {
    try {
      // Load environment variables
      const envConfig = this.loadEnvConfig();

      // Generate secure seed if not provided
      const seed = envConfig.COCO_SEED || (await this.generateSecureSeed());

      // Build configuration from environment variables only
      const mergedConfig: Partial<ServerConfig> = {
        ...DEFAULT_SERVER_CONFIG,
        wallet: {
          seed: seed,
          databasePath: envConfig.COCO_DATABASE_PATH,
          defaultMint: envConfig.COCO_DEFAULT_MINT,
          trustedMints: [], // Trusted mints are managed by WalletService, not config
        },
        mcp: {
          name: envConfig.MCP_SERVER_NAME,
          version: envConfig.MCP_SERVER_VERSION,
          description: DEFAULT_SERVER_CONFIG.mcp!.description,
        },
        logging: {
          level: envConfig.LOG_LEVEL,
        },
      };

      // Validate the configuration
      this.config = ServerConfigSchema.parse(mergedConfig);

      console.error(
        "Configuration loaded successfully from environment variables",
      );
      return this.config;
    } catch (error) {
      throw createConfigurationError(
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getConfig(): ServerConfig {
    if (!this.config) {
      throw createConfigurationError("Configuration not loaded");
    }
    return this.config;
  }

  getDatabasePath(): string {
    return this.getConfig().wallet.databasePath;
  }

  getSeed(): string {
    return this.getConfig().wallet.seed;
  }

  getTrustedMints(): string[] {
    return this.getConfig().wallet.trustedMints;
  }

  isInitialized(): boolean {
    return this.config !== null;
  }

  private loadEnvConfig(): EnvConfig {
    return EnvConfigSchema.parse({
      COCO_SEED: process.env.COCO_SEED,
      COCO_DATABASE_PATH: process.env.COCO_DATABASE_PATH,
      COCO_DEFAULT_MINT: process.env.COCO_DEFAULT_MINT,
      MCP_SERVER_NAME: process.env.MCP_SERVER_NAME,
      MCP_SERVER_VERSION: process.env.MCP_SERVER_VERSION,
      LOG_LEVEL: process.env.LOG_LEVEL,
    });
  }

  private async generateSecureSeed(): Promise<string> {
    // Generate secure 12-word BIP-39 mnemonic using cryptographically-secure RNG
    const mnemonic = bip39.generateMnemonic(wordlist);

    // Validate the generated mnemonic
    const isValid = bip39.validateMnemonic(mnemonic, wordlist);
    if (!isValid) {
      throw createConfigurationError(
        "Failed to generate valid BIP-39 mnemonic",
      );
    }

    console.warn(
      "⚠️  SECURITY WARNING: No COCO_SEED environment variable provided",
    );
    console.warn("⚠️  Generated new secure BIP-39 mnemonic:");
    console.warn("⚠️  =========================================");
    console.warn(`⚠️  ${mnemonic}`);
    console.warn("⚠️  =========================================");
    console.warn("⚠️  IMPORTANT: Save this mnemonic securely!");
    console.warn("⚠️  - Write it down and store in a safe place");
    console.warn("⚠️  - Never share it with anyone");
    console.warn(
      "⚠️  - This is your wallet backup - lose it and lose access to funds",
    );
    console.warn("⚠️  =========================================");

    // Automatically save to .env file for convenience
    await this.saveSeedToEnvFile(mnemonic);

    return mnemonic;
  }

  private async saveSeedToEnvFile(mnemonic: string): Promise<void> {
    const envPath = join(process.cwd(), ".env");

    try {
      let envContent = "";

      // Read existing .env file if it exists
      if (existsSync(envPath)) {
        envContent = await readFile(envPath, "utf-8");

        // Check if COCO_SEED already exists in the file
        if (envContent.includes("COCO_SEED=")) {
          console.warn(
            "⚠️  COCO_SEED already exists in .env file - not overwriting",
          );
          return;
        }
      }

      // Add COCO_SEED to the environment file
      const seedLine = `COCO_SEED="${mnemonic}"\n`;
      const newContent =
        envContent +
        (envContent && !envContent.endsWith("\n") ? "\n" : "") +
        seedLine;

      await writeFile(envPath, newContent, "utf-8");
      console.warn(`✅ Generated seed automatically saved to ${envPath}`);
      console.warn("⚠️  IMPORTANT: Review and secure your .env file!");
    } catch (error) {
      console.warn(`⚠️  Failed to save seed to .env file: ${error}`);
      console.warn(
        "⚠️  Please manually set COCO_SEED environment variable with the generated mnemonic",
      );
    }
  }
}
