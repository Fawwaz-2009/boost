import type { LogEntry } from "../vite/log-writer.js";

/**
 * Indent text by a specified number of spaces
 */
export function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}

/**
 * Format browser logs for display
 * Includes location info (filename, line, column)
 */
export function formatBrowserLogs(logs: LogEntry[]): string {
  return logs
    .map((log, index) => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const levelBadge = log.level ? `[${log.level.toUpperCase()}]` : "[ERROR]";
      const location =
        log.filename && log.lineno
          ? `\n   Location: ${log.filename}:${log.lineno}${log.colno ? `:${log.colno}` : ""}`
          : "";
      const stack = log.stack ? `\n   Stack:\n${indent(log.stack, 6)}` : "";

      return `${index + 1}. ${time} ${levelBadge}\n   ${log.message}${location}${stack}`;
    })
    .join("\n\n");
}

/**
 * Format server logs for display
 * Includes type tag for unhandled rejections
 */
export function formatServerLogs(logs: LogEntry[]): string {
  return logs
    .map((log, index) => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const levelBadge = log.level ? `[${log.level.toUpperCase()}]` : "[ERROR]";
      const typeTag =
        log.type === "unhandledrejection" ? " (Unhandled Rejection)" : "";
      const stack = log.stack ? `\n   Stack:\n${indent(log.stack, 6)}` : "";

      return `${index + 1}. ${time} ${levelBadge}${typeTag}\n   ${log.message}${stack}`;
    })
    .join("\n\n");
}
