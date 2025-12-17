import * as fs from "node:fs";
import * as path from "node:path";
import type { McpBoostConfig } from "./types.js";

const CONFIG_FILENAME = "mcp-boost.json";

/**
 * Load mcp-boost.json from the specified directory
 * @param projectRoot - Directory to look for config file
 * @returns Config object or null if not found
 */
export function loadConfig(projectRoot: string): McpBoostConfig | null {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as McpBoostConfig;

    // Basic validation
    if (!config.tools || typeof config.tools !== "object") {
      throw new Error("Invalid config: missing 'tools' object");
    }

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${CONFIG_FILENAME}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Save config to mcp-boost.json
 * @param projectRoot - Directory to save config file
 * @param config - Config object to save
 */
export function saveConfig(projectRoot: string, config: McpBoostConfig): void {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  const content = JSON.stringify(config, null, 2) + "\n";
  fs.writeFileSync(configPath, content, "utf-8");
}

/**
 * Get the config file path
 * @param projectRoot - Project root directory
 * @returns Full path to config file
 */
export function getConfigPath(projectRoot: string): string {
  return path.join(projectRoot, CONFIG_FILENAME);
}

/**
 * Check if config file exists
 * @param projectRoot - Project root directory
 * @returns True if config file exists
 */
export function configExists(projectRoot: string): boolean {
  return fs.existsSync(getConfigPath(projectRoot));
}
