import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as path from "node:path";
import type { ToolDefinition, ToolConfig } from "../../core/types.js";
import { readLogs } from "../../vite/log-writer.js";
import { formatBrowserLogs } from "../../shared/log-formatter.js";
import { getSetupInstructions } from "./setup.js";

const inputSchema = z.object({
  entries: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Number of log entries to return (max 100)"),
  level: z
    .enum(["log", "info", "warn", "error", "debug"])
    .optional()
    .describe("Filter by log level"),
});

export const browserLogsTool: ToolDefinition = {
  id: "browser-logs",
  name: "Browser Logs",
  description:
    "Returns recent browser console logs and errors captured from the running Vite dev server. Useful for debugging client-side issues.",
  requires: {
    vitePlugin: true,
  },
  defaultConfig: {
    enabled: true,
  },
  getSetupInstructions,
  register(server: McpServer, appPath: string, _config: ToolConfig): void {
    const logDir = path.resolve(appPath, ".mcp-boost");

    server.tool(
      "browser_logs",
      this.description,
      inputSchema.shape,
      async (args) => {
        const parsed = inputSchema.safeParse(args);

        if (!parsed.success) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid arguments: ${parsed.error.message}`,
              },
            ],
            isError: true,
          };
        }

        const { entries, level } = parsed.data;

        try {
          let logs = readLogs(logDir, "browser", entries);

          // Filter by level if specified
          if (level) {
            logs = logs.filter((log) => log.level === level);
          }

          if (logs.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "No browser logs found. Make sure:\n1. The Vite dev server is running with the mcp-boost plugin\n2. You have visited the app in the browser\n3. There has been some console output or errors",
                },
              ],
            };
          }

          const formattedLogs = formatBrowserLogs(logs);

          return {
            content: [
              {
                type: "text",
                text: `Browser Logs (${logs.length} entries, newest first):\n\n${formattedLogs}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error reading browser logs: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
};

export default browserLogsTool;
