# Server Logs Tool

Captures server-side console output and errors from Vite applications.

## What it captures

- `console.log`, `console.info`, `console.warn`, `console.error`, `console.debug` (server-side)
- Vite build/transform errors
- SSR errors
- Unhandled promise rejections (server process)

## Requirements

- Vite dev server with `boostPlugin` configured

## MCP Tool

**Name:** `server_logs`

**Parameters:**
- `entries` (number, optional): Number of log entries to return (1-100, default: 20)
- `level` (string, optional): Filter by level - "log", "info", "warn", "error", "debug"

## How it works

1. The Vite plugin hooks into server-side console methods
2. It also captures Vite's logger errors and SSR middleware errors
3. Logs are written to `.mcp-boost/server.log` as JSON lines
4. This tool reads and formats the logs for the coding agent
