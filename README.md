# Cashu Wallet MCP Server

A Model Context Protocol (MCP) server that provides a complete NWC (Nostr Wallet Connect) API implementation for Cashu wallets using the Coco Cashu TypeScript library.

## Features

- **Complete NWC API Support**: Implements all standard NWC methods:
  - `pay_invoice` - Pay BOLT11 invoices using melt quotes
  - `make_invoice` - Create invoices for receiving payments using mint quotes
  - `lookup_invoice` - Check invoice/quote status
  - `list_transactions` - List transaction history
  - `get_balance` - Get current wallet balance

- **Coco Cashu Integration**: Leverages the full power of Coco Cashu's deterministic wallet architecture
- **Trust-Based Mint Model**: Secure mint management with explicit trust requirements
- **Event-Driven Architecture**: Real-time updates via WebSockets and polling
- **SQLite Persistence**: Reliable data storage with automatic quote processing
- **MCP Protocol Compliance**: Full compatibility with MCP clients and tools
- **Flexible Configuration**: Environment-based configuration with secure defaults

## Architecture

The server follows a clean, layered architecture:

```
MCP Client → MCP Server → Service Layer → Coco Cashu → SQLite Database
```

### Core Components

- **MCP Server**: Handles protocol communication and tool registration
- **Service Layer**:
  - `WalletService`: Wallet initialization and balance management
  - `QuoteService`: Mint and melt quote operations
  - `TransactionService`: Transaction history and lookup
- **Configuration**: Environment-based configuration with secure defaults

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd cocoloco

# Install dependencies
bun install
```

## Configuration

The server uses environment variables for configuration with sensible defaults. All configuration is optional - if no seed is provided, a secure BIP-39 mnemonic will be automatically generated and saved to a `.env` file.

### Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
# Copy the example file
cp .env.example .env

# Edit the .env file with your preferred values
```

**Available Environment Variables:**

- `COCO_SEED`: BIP-39 mnemonic seed phrase (optional - will be auto-generated if not provided)
- `COCO_DATABASE_PATH`: Database file path (default: `"./coco.db"`)
- `COCO_DEFAULT_MINT`: Default mint URL for operations (optional)
- `MCP_SERVER_NAME`: MCP server name (default: `"cashu-wallet-mcp-server"`)
- `MCP_SERVER_VERSION`: MCP server version (default: `"1.0.0"`)
- `LOG_LEVEL`: Logging level (default: `"info"`)
- `SERVER_PRIVATE_KEY`: Nostr server private key in hex format (required for Nostr transport) If not provided, a new key will be generated each time the server starts
- `SERVER_RELAYS`: Comma-separated Nostr relay URLs (default: `"wss://relay.contextvm.org"`)
- `ALLOWED_PUBLIC_KEYS`: Comma-separated allowed public keys (empty = allow all). Highly recommended to set this to a specific public key or set of public keys

### First-Time Setup

When you run the server for the first time without a seed:

1. A secure 12-word BIP-39 mnemonic will be automatically generated
2. The mnemonic will be displayed in the console for you to save securely
3. It will be automatically saved to your `.env` file for future use
4. You can also manually set the `COCO_SEED` environment variable

**Security Note:** Always backup your seed phrase! It's your wallet backup - lose it and you lose access to your funds.

## Usage

### Running the Server

```bash
# Start the server
bun run start

# Build for distribution
bun run build
```
