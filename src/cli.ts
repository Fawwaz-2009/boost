#!/usr/bin/env node

import { Command, Options, Prompt } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Console, Effect } from "effect";
import { saveConfig, configExists, getConfigPath } from "./core/config.js";
import { getAllTools } from "./tools/registry.js";
import { c } from "./shared/colors.js";
import type { McpBoostConfig } from "./core/types.js";

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
      const cwd = process.cwd();

      yield* Console.log("");
      yield* Console.log(c.heading("Welcome to mcp-boost!"));
      yield* Console.log("Let's get you set up with the MCP server.");
      yield* Console.log("");

      // Check if config already exists
      if (configExists(cwd)) {
        const overwrite = yield* Prompt.confirm({
          message: "mcp-boost.json already exists. Overwrite?",
          initial: false,
        });
        if (!overwrite) {
          yield* Console.log("Setup cancelled.");
          return;
        }
      }

      // Select tools to enable (ask first)
      const allTools = getAllTools();
      const toolChoices = allTools.map((tool) => ({
        title: tool.name,
        value: tool.id,
        selected: true,
      }));

      const selectedToolIds = yield* Prompt.multiSelect({
        message: "Which tools do you want to enable?",
        choices: toolChoices,
        // Hide the extra options
        selectAll: "",
        selectNone: "",
        inverseSelection: "",
      });

      // Select coding agent (ask last, so setup instructions come at the end)
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

      // Build config
      const config: McpBoostConfig = {
        $schema: "https://unpkg.com/mcp-boost/schema.json",
        tools: {},
      };

      for (const tool of allTools) {
        config.tools[tool.id] = {
          enabled: selectedToolIds.includes(tool.id),
        };
      }

      // Save config
      saveConfig(cwd, config);

      const agentConfig = agentConfigs[agent];

      yield* Console.log("");
      yield* Console.log(c.success(`✓ Created ${getConfigPath(cwd)}`));
      yield* Console.log("");
      yield* Console.log(c.dim("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
      yield* Console.log("");
      yield* Console.log(c.heading(`MCP Server Configuration (${agentConfig.name})`));
      yield* Console.log("");
      yield* Console.log(agentConfig.instructions);
      yield* Console.log("");
      yield* Console.log(c.code(agentConfig.command));
      yield* Console.log("");
      yield* Console.log(c.dim("After adding the configuration, restart your coding agent."));

      // Print setup instructions for enabled tools that require setup
      const enabledTools = allTools.filter((tool) =>
        selectedToolIds.includes(tool.id)
      );
      const toolsNeedingSetup = enabledTools.filter(
        (tool) => tool.requires?.vitePlugin
      );

      if (toolsNeedingSetup.length > 0) {
        yield* Console.log("");
        yield* Console.log(c.dim("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
        yield* Console.log("");
        yield* Console.log(c.warn("Vite Plugin Setup Required"));
        yield* Console.log("");

        for (const tool of toolsNeedingSetup) {
          yield* Console.log(tool.getSetupInstructions());
          yield* Console.log("");
        }
      }

      yield* Console.log("");
    })
);

const appOption = Options.directory("app").pipe(
  Options.withDescription(
    "Path to the app directory containing mcp-boost.json"
  ),
  Options.withDefault(process.cwd())
);

const serveCommand = Command.make(
  "serve",
  { app: appOption },
  ({ app }) =>
    Effect.gen(function* () {
      const { runServer } = yield* Effect.promise(() => import("./index.js"));
      yield* Effect.promise(() => runServer({ appPath: app }));
    })
);

const mainCommand = Command.make("mcp-boost", {}).pipe(
  Command.withSubcommands([initCommand, serveCommand])
);

const cli = Command.run(mainCommand, {
  name: "mcp-boost",
  version: "0.0.2",
});

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
