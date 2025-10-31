# Cashu Wallet MCP Server

A ContextVM server providing a Cashu wallet using the Coco Cashu TypeScript library.

## Project Overview

This server enables secure Bitcoin Lightning, and Cashu payments through the Cashu protocol, offering a complete wallet interface to manage mints, pay invoices, make invoices, send cashu tokens, receive cashu tokens, etc. It integrates with the Coco Cashu deterministic wallet architecture for reliable key management and transaction processing.

## Tech Stack

- **Runtime**: Bun.js
- **Core Libraries**: 
  - `coco-cashu-core` & `coco-cashu-sqlite3` - Deterministic wallet operations
  - `@cashu/cashu-ts` - Cashu protocol implementation
  - `@modelcontextprotocol/sdk` - MCP server framework
- **Database**: SQLite with automatic quote processing
- **Security**: BIP-39 mnemonic seed phrases with secure auto-generation

## Security Considerations

### Wallet Seed Management
- **Auto-generation**: If no `COCO_SEED` is provided, a secure 12-word BIP-39 mnemonic is automatically generated and saved to `.env`
- **Backup Required**: The generated seed is displayed once - losing it means losing access to your funds
- **Manual Setup**: You can provide your own seed via `COCO_SEED` environment variable

### Server Authentication
- **Private Key**: `SERVER_PRIVATE_KEY` (hex format) is required for Nostr transport
- **Risk**: If not set, a new key is generated each startup, preventing persistent server identity
- **Allowed Keys**: `ALLOWED_PUBLIC_KEYS` restricts wallet access; empty = open to anyone (not recommended)

### Security Best Practices
1. Always set `ALLOWED_PUBLIC_KEYS` to specific public keys. This pubkeys will have access to all the wallet operations.
2. Securely backup your `COCO_SEED` mnemonic.
3. Set a persistent `SERVER_PRIVATE_KEY` for stable server identity
4. Keep your `.env` file secure and never commit it

## Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd nutoff-wallet

# Install dependencies
bun install

# Run the server
bun run start
```

On first run:
- A secure seed phrase will be generated and displayed
- The seed is automatically saved to `.env`
- Save the seed securely - it's your wallet backup

## Configuration

Copy `.env.example` to `.env` and customize:

```bash
# Essential security settings
COCO_SEED="your bip39 mnemonic"  # Auto-generated if empty
SERVER_PRIVATE_KEY="hex_key"     # Required for Nostr transport
ALLOWED_PUBLIC_KEYS="client_pubkey1,client_pubkey2"  # Restrict access
SERVER_RELAYS="wss://relay.example.org"  # Nostr relays for the server
```

## Usage

```bash
# Run built server
bun run start
```