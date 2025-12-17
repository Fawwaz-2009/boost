# mcp-boost

![Status](https://img.shields.io/badge/status-experimental-orange?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![npm](https://img.shields.io/npm/v/mcp-boost?style=flat-square)

> ⚠️ **Experimental** - This package is in early development and may undergo breaking changes.

MCP server that provides a magic integer to your coding agent.

## Installation

```bash
npx mcp-boost init
```

This will guide you through setting up the MCP server with your coding agent.

## Supported Agents

- Claude Code
- Cursor
- Windsurf
- VS Code Copilot

## Usage

Once configured, ask your coding agent to use the `get_magic_integer` tool to receive a randomly generated magic integer.

## Manual Setup

If you prefer manual setup, add the following to your MCP configuration file:

- **Claude Code (global):** `~/.claude.json`
- **Claude Code (project):** `.mcp.json`

```json
{
  "mcpServers": {
    "boost": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-boost", "serve"]
    }
  }
}
```

## License

MIT
