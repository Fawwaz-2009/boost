import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Configuration for a single tool
 */
export interface ToolConfig {
  enabled: boolean;
  [key: string]: unknown; // Allow tool-specific config
}

/**
 * Main mcp-boost.json config structure
 */
export interface McpBoostConfig {
  $schema?: string;
  tools: Record<string, ToolConfig>;
}

/**
 * Definition of an MCP tool
 */
export interface ToolDefinition {
  /** Unique identifier, e.g., "browser-logs" */
  id: string;

  /** Display name, e.g., "Browser Logs" */
  name: string;

  /** Description shown in MCP tool listing */
  description: string;

  /** Requirements for this tool */
  requires?: {
    /** Whether this tool needs the Vite plugin to be set up */
    vitePlugin?: boolean;
  };

  /** Default configuration for this tool */
  defaultConfig: ToolConfig;

  /**
   * Get setup instructions for CLI to display
   * @returns Formatted setup instructions string
   */
  getSetupInstructions(): string;

  /**
   * Register this tool with the MCP server
   * @param server - MCP server instance
   * @param appPath - Path to the app directory
   * @param config - Tool-specific configuration
   */
  register(server: McpServer, appPath: string, config: ToolConfig): void;
}
