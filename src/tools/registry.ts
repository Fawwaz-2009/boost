import type { ToolDefinition } from "../core/types.js";
import { browserLogsTool } from "./browser-logs/index.js";
import { serverLogsTool } from "./server-logs/index.js";

/**
 * Registry of all available tools
 */
export const toolRegistry: Record<string, ToolDefinition> = {
  "browser-logs": browserLogsTool,
  "server-logs": serverLogsTool,
};

/**
 * Get all tool IDs
 */
export function getAllToolIds(): string[] {
  return Object.keys(toolRegistry);
}

/**
 * Get a tool by ID
 */
export function getToolById(id: string): ToolDefinition | undefined {
  return toolRegistry[id];
}

/**
 * Get all tools
 */
export function getAllTools(): ToolDefinition[] {
  return Object.values(toolRegistry);
}

/**
 * Generate default config with all tools
 */
export function generateDefaultConfig(): Record<string, { enabled: boolean }> {
  const tools: Record<string, { enabled: boolean }> = {};
  for (const tool of getAllTools()) {
    tools[tool.id] = { ...tool.defaultConfig };
  }
  return tools;
}
