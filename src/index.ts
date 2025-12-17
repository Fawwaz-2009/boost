import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./core/config.js";
import { getToolById, getAllToolIds } from "./tools/registry.js";

export interface ServerOptions {
  /**
   * Path to the app directory containing mcp-boost.json
   * @default process.cwd()
   */
  appPath?: string;
}

export const createServer = (options: ServerOptions = {}): McpServer => {
  const { appPath = process.cwd() } = options;

  // Load config
  const config = loadConfig(appPath);

  if (!config) {
    console.error(
      "\x1b[31m[mcp-boost] Error: mcp-boost.json not found.\x1b[0m\n" +
        "Run 'npx mcp-boost init' to configure tools.\n"
    );
    process.exit(1);
  }

  const server = new McpServer({
    name: "mcp-boost",
    version: "0.0.1",
  });

  // Register enabled tools
  let registeredCount = 0;
  for (const toolId of getAllToolIds()) {
    const toolConfig = config.tools[toolId];
    if (toolConfig?.enabled) {
      const tool = getToolById(toolId);
      if (tool) {
        tool.register(server, appPath, toolConfig);
        registeredCount++;
      }
    }
  }

  if (registeredCount === 0) {
    console.warn(
      "\x1b[33m[mcp-boost] Warning: No tools enabled in mcp-boost.json.\x1b[0m\n" +
        "Run 'npx mcp-boost init' to enable tools.\n"
    );
  }

  return server;
};

export const runServer = async (options: ServerOptions = {}): Promise<void> => {
  const server = createServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

export { McpServer };

// Re-export types
export type { McpBoostConfig, ToolConfig, ToolDefinition } from "./core/types.js";

// Re-export vite plugin
export { boostPlugin, type BoostPluginOptions } from "./vite/index.js";
export { readLogs, type LogEntry } from "./vite/log-writer.js";
