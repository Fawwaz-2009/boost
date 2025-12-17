# Browser Logs Tool

Captures browser console output and runtime errors from Vite applications.

## What it captures

- `console.log`, `console.info`, `console.warn`, `console.error`, `console.debug`
- Runtime errors (uncaught exceptions)
- Unhandled promise rejections

## Requirements

- Vite dev server with `boostPlugin` configured

## MCP Tool

**Name:** `browser_logs`

**Parameters:**
- `entries` (number, optional): Number of log entries to return (1-100, default: 20)
- `level` (string, optional): Filter by level - "log", "info", "warn", "error", "debug"

## How it works

1. The Vite plugin injects a capture script into your client entry file
2. The script patches `console.*` methods and listens for error events
3. Logs are sent to the server via WebSocket (`import.meta.hot`)
4. Server writes logs to `.mcp-boost/browser.log` as JSON lines
5. This tool reads and formats the logs for the coding agent
