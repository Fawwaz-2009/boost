#!/usr/bin/env node

import { Command, Prompt } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Console, Effect } from "effect";

type CodingAgent = "claude-code" | "cursor" | "windsurf" | "vscode-copilot";

interface AgentConfig {
  name: string;
  instructions: string;
  command: string;
}

const agentConfigs: Record<CodingAgent, AgentConfig> = {
  "claude-code": {
    name: "Claude Code",
    instructions: `Add the following to your Claude Code config:

  • ~/.claude.json        (global - all projects)
  • .mcp.json              (project - current directory only)`,
    command: `{
  "mcpServers": {
    "boost": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-boost", "serve"]
    }
  }
}`,
  },
  cursor: {
    name: "Cursor",
    instructions: `Add the following to your Cursor MCP settings file (~/.cursor/mcp.json):`,
    command: `{
  "mcpServers": {
    "boost": {
      "command": "npx",
      "args": ["-y", "mcp-boost", "serve"]
    }
  }
}`,
  },
  windsurf: {
    name: "Windsurf",
    instructions: `Add the following to your Windsurf MCP settings file (~/.windsurf/mcp.json):`,
    command: `{
  "mcpServers": {
    "boost": {
      "command": "npx",
      "args": ["-y", "mcp-boost", "serve"]
    }
  }
}`,
  },
  "vscode-copilot": {
    name: "VS Code Copilot",
    instructions: `Add the following to your VS Code settings.json:`,
    command: `{
  "mcp": {
    "servers": {
      "boost": {
        "command": "npx",
        "args": ["-y", "mcp-boost", "serve"]
      }
    }
  }
}`,
  },
};

const initCommand = Command.make(
  "init",
  {},
  () =>
    Effect.gen(function* () {
      yield* Console.log("");
      yield* Console.log("Welcome to mcp-boost!");
      yield* Console.log("Let's get you set up with the MCP server.");
      yield* Console.log("");

      const agent = yield* Prompt.select<CodingAgent>({
        message: "Which coding agent are you using?",
        choices: [
          { title: "Claude Code", value: "claude-code" },
          { title: "Cursor", value: "cursor" },
          { title: "Windsurf", value: "windsurf" },
          { title: "VS Code Copilot", value: "vscode-copilot" },
        ],
      });

      const config = agentConfigs[agent];

      yield* Console.log("");
      yield* Console.log(`Great! You're using ${config.name}.`);
      yield* Console.log("");
      yield* Console.log(config.instructions);
      yield* Console.log("");
      yield* Console.log(config.command);
      yield* Console.log("");
      yield* Console.log(
        "After adding the configuration, restart your coding agent."
      );
      yield* Console.log(
        'Then ask your agent to use the "get_magic_integer" tool!'
      );
      yield* Console.log("");
    })
);

const serveCommand = Command.make(
  "serve",
  {},
  () =>
    Effect.gen(function* () {
      const { runServer } = yield* Effect.promise(() => import("./index.js"));
      yield* Effect.promise(() => runServer());
    })
);

const mainCommand = Command.make("mcp-boost", {}).pipe(
  Command.withSubcommands([initCommand, serveCommand])
);

const cli = Command.run(mainCommand, {
  name: "mcp-boost",
  version: "0.0.1",
});

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
