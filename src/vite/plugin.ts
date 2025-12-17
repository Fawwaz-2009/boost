import type { Plugin, ViteDevServer, Connect } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { getLogWriter, type LogEntry } from "./log-writer.js";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
};

export interface BoostPluginOptions {
  /**
   * Directory to store log files
   * @default ".mcp-boost"
   */
  logDir?: string;

  /**
   * Explicit client entry file(s) to inject browser capture into.
   * Paths are relative to project root.
   * @example ["./src/main.tsx"] or ["./app/client.tsx", "./src/entry.tsx"]
   */
  clientEntries?: string | string[];

  /**
   * Additional regex patterns to match client entry files.
   * Built-in patterns cover most frameworks (TanStack Start, Remix, SvelteKit, etc.)
   * @example [/my-custom-entry\.tsx$/]
   */
  clientEntryPatterns?: RegExp[];

  /**
   * Disable browser log capture
   * @default false
   */
  disableBrowserCapture?: boolean;

  /**
   * Disable server log capture
   * @default false
   */
  disableServerCapture?: boolean;

  /**
   * Enable debug logging to see what files are being processed
   * @default false
   */
  debug?: boolean;
}

// Framework-specific entry file patterns
const DEFAULT_ENTRY_PATTERNS = [
  /app\/client\.(ts|tsx|js|jsx)$/, // TanStack Start (new structure)
  /entry-client\.(ts|tsx|js|jsx)$/, // TanStack Start (old structure)
  /entry\.client\.(ts|tsx|js|jsx)$/, // Remix
  /\+layout\.(ts|js|svelte)$/, // SvelteKit
  /\.nuxt\/entry/, // Nuxt
  /src\/main\.(ts|tsx|js|jsx)$/, // Vue/React SPA
  /src\/index\.(ts|tsx|js|jsx)$/, // Generic SPA
  /src\/App\.(ts|tsx|js|jsx)$/, // Some React setups
];

const VIRTUAL_MODULE_ID = "virtual:mcp-boost-capture";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

/**
 * Browser-side capture code injected as a virtual module
 */
function getBrowserCaptureCode(): string {
  return `
// MCP Boost Browser Capture
(function() {
  if (typeof window === 'undefined') return;
  if (window.__MCP_BOOST_INITIALIZED__) return;
  window.__MCP_BOOST_INITIALIZED__ = true;

  const sendToServer = (type, data) => {
    if (import.meta.hot) {
      import.meta.hot.send('mcp-boost:log', { type, ...data });
    }
  };

  // Patch console methods
  ['log', 'info', 'warn', 'error', 'debug'].forEach(method => {
    const original = console[method];
    console[method] = (...args) => {
      sendToServer('console', {
        level: method,
        message: args.map(arg => {
          try {
            if (arg instanceof Error) {
              return arg.stack || arg.message;
            }
            if (typeof arg === 'object') {
              return JSON.stringify(arg, null, 2);
            }
            return String(arg);
          } catch {
            return String(arg);
          }
        }).join(' '),
        args: args.map(arg => {
          try {
            return String(arg);
          } catch {
            return '[unserializable]';
          }
        }),
      });
      original.apply(console, args);
    };
  });

  // Capture runtime errors
  window.addEventListener('error', (event) => {
    sendToServer('error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    sendToServer('unhandledrejection', {
      message: reason?.message || String(reason),
      stack: reason?.stack,
    });
  });

  console.debug('[mcp-boost] Browser capture initialized');
})();
`;
}

export function boostPlugin(options: BoostPluginOptions = {}): Plugin {
  const {
    logDir = ".mcp-boost",
    clientEntries,
    clientEntryPatterns = [],
    disableBrowserCapture = false,
    disableServerCapture = false,
    debug = false,
  } = options;

  const prefix = `${colors.cyan}${colors.bold}[mcp-boost]${colors.reset}`;

  const log = (...args: unknown[]) => {
    if (debug) {
      console.log(prefix, ...args);
    }
  };

  // Normalize clientEntries to array
  const explicitEntries = clientEntries
    ? (Array.isArray(clientEntries) ? clientEntries : [clientEntries])
    : [];

  const allEntryPatterns = [...DEFAULT_ENTRY_PATTERNS, ...clientEntryPatterns];
  let resolvedLogDir: string;
  let resolvedEntries: string[] = [];
  let writer: ReturnType<typeof getLogWriter>;
  let server: ViteDevServer | null = null;

  // Store original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  function writeServerLog(entry: Omit<LogEntry, "timestamp">): void {
    writer.write("server", {
      timestamp: new Date().toISOString(),
      ...entry,
    });
  }

  function writeBrowserLog(entry: Omit<LogEntry, "timestamp">): void {
    writer.write("browser", {
      timestamp: new Date().toISOString(),
      ...entry,
    });
  }

  return {
    name: "mcp-boost",

    configResolved(config) {
      resolvedLogDir = path.resolve(config.root, logDir);
      writer = getLogWriter(resolvedLogDir);
      // Resolve explicit entry paths
      resolvedEntries = explicitEntries.map((entry) =>
        path.resolve(config.root, entry)
      );
      if (resolvedEntries.length > 0) {
        log("Explicit client entries:", resolvedEntries);
        // Check if files exist and warn if not
        for (const entry of resolvedEntries) {
          if (!fs.existsSync(entry)) {
            console.warn(
              `${prefix} ${colors.yellow}Warning: clientEntries file not found:${colors.reset}\n` +
              `  ${colors.dim}${entry}${colors.reset}\n\n` +
              `  Check your clientEntries path. Common patterns:\n` +
              `  ${colors.dim}- "./src/main.tsx" (React/Vue SPA)\n` +
              `  - "./src/entry-client.tsx" (TanStack Start)\n` +
              `  - "./app/entry.client.tsx" (Remix)${colors.reset}`
            );
          }
        }
      }
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        if (disableBrowserCapture) {
          return "// Browser capture disabled";
        }
        return getBrowserCaptureCode();
      }
    },

    transform(code, id) {
      // Skip if browser capture is disabled
      if (disableBrowserCapture) return;

      // Skip node_modules and virtual modules
      if (id.includes("node_modules") || id.startsWith("\0")) return;

      // Check if this is an explicit entry file
      const isExplicitEntry = resolvedEntries.includes(id);

      // Check if this matches entry patterns
      const matchesPattern = allEntryPatterns.some((pattern) => pattern.test(id));

      if (isExplicitEntry || matchesPattern) {
        log(`${colors.green}Injecting browser capture into:${colors.reset}`, id);
        // Inject the virtual module import at the top
        return {
          code: `import "${VIRTUAL_MODULE_ID}";\n${code}`,
          map: null,
        };
      }
    },

    configureServer(devServer) {
      server = devServer;

      // Set up WebSocket listener for browser logs
      if (!disableBrowserCapture) {
        log("Setting up WebSocket listener for browser logs");
        devServer.ws.on("mcp-boost:log", (data: Record<string, unknown>) => {
          log("Received browser log:", data["type"], data["level"]);
          const level = data["level"] as LogEntry["level"] | undefined;
          const entry: Omit<LogEntry, "timestamp"> = {
            type: data["type"] as LogEntry["type"],
            message: data["message"] as string,
          };
          if (level) entry.level = level;
          if (data["args"]) entry.args = data["args"] as string[];
          if (data["stack"]) entry.stack = data["stack"] as string;
          if (data["filename"]) entry.filename = data["filename"] as string;
          if (data["lineno"]) entry.lineno = data["lineno"] as number;
          if (data["colno"]) entry.colno = data["colno"] as number;
          writeBrowserLog(entry);
        });
      }

      // Set up server-side capture
      if (!disableServerCapture) {
        // Hook console methods for server-side logging
        (["log", "info", "warn", "error", "debug"] as const).forEach((method) => {
          console[method] = (...args: unknown[]) => {
            // Write to log file
            writeServerLog({
              type: "console",
              level: method,
              message: args
                .map((arg) => {
                  try {
                    if (arg instanceof Error) {
                      return arg.stack || arg.message;
                    }
                    if (typeof arg === "object") {
                      return JSON.stringify(arg, null, 2);
                    }
                    return String(arg);
                  } catch {
                    return String(arg);
                  }
                })
                .join(" "),
              args: args.map((arg) => {
                try {
                  return String(arg);
                } catch {
                  return "[unserializable]";
                }
              }),
            });

            // Call original
            originalConsole[method].apply(console, args);
          };
        });

        // Hook Vite's logger for build/transform errors
        const viteLogger = devServer.config.logger;
        const originalViteError = viteLogger.error;
        viteLogger.error = (msg, options) => {
          const entry: Omit<LogEntry, "timestamp"> = {
            type: "error",
            level: "error",
            message: typeof msg === "string" ? msg : String(msg),
          };
          if (options?.error?.stack) entry.stack = options.error.stack;
          writeServerLog(entry);
          originalViteError.call(viteLogger, msg, options);
        };

        // Capture unhandled rejections
        process.on("unhandledRejection", (reason) => {
          const entry: Omit<LogEntry, "timestamp"> = {
            type: "unhandledrejection",
            level: "error",
            message: reason instanceof Error ? reason.message : String(reason),
          };
          if (reason instanceof Error && reason.stack) entry.stack = reason.stack;
          writeServerLog(entry);
        });

        // Return middleware for SSR error capture
        return () => {
          devServer.middlewares.use((
            err: Error | null,
            _req: IncomingMessage,
            _res: ServerResponse,
            next: Connect.NextFunction
          ) => {
            if (err) {
              // Fix stack trace for SSR errors
              devServer.ssrFixStacktrace(err);
              const entry: Omit<LogEntry, "timestamp"> = {
                type: "error",
                level: "error",
                message: err.message,
              };
              if (err.stack) entry.stack = err.stack;
              writeServerLog(entry);
            }
            next(err);
          });
        };
      }
    },

    // Clean up on server close
    buildEnd() {
      // Restore original console methods
      Object.assign(console, originalConsole);
    },
  };
}

export default boostPlugin;
