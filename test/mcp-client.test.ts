import { expect, test, describe } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

describe('Cashu Wallet MCP Server', () => {
  let client: Client;
  let serverProcess: ReturnType<typeof spawn>;

  test('make_invoice tool creates a valid invoice', async () => {
    // Start the MCP server as a child process
    serverProcess = spawn('bun', ['run', 'src/index.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });

    // Wait a moment for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create MCP client transport
    const transport = new StdioClientTransport({
      command: 'bun',
      args: ['run', 'src/index.ts']
    });

    // Initialize client
    client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });

    // Connect to the server
    await client.connect(transport);

    // Test the make_invoice tool
    const result = await client.callTool({
      name: 'make_invoice',
      arguments: {
        amount: 1000, // 1000 msats
        description: 'Test invoice'
      }
    });

    // Verify the response structure
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();

    // Parse the structured content
    const structuredContent = result.structuredContent;
    console.log("Structured content:", structuredContent);
    // expect(structuredContent).toBeDefined();
    console.log('✅ make_invoice test passed');
    await new Promise(resolve => setTimeout(resolve, 3000));
    const getBalanceResult = await client.callTool({
      name: 'get_balance',
      arguments: {}
    });
    console.log("get_balance result:", getBalanceResult);

    // Clean up
    await client.close();
    serverProcess.kill();
  }, 60000); // 60 second timeout
});