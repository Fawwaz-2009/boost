import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export const createServer = (): McpServer => {
  const server = new McpServer({
    name: "mcp-boost",
    version: "0.0.1",
  });

  server.tool(
    "get_magic_integer",
    "Returns a randomly generated magic integer between 1 and 1000000",
    {},
    async () => {
      const magicInteger = Math.floor(Math.random() * 1000000) + 1;

      return {
        content: [
          {
            type: "text",
            text: `Your magic integer is: ${magicInteger}`,
          },
        ],
      };
    }
  );

  return server;
};

export const runServer = async (): Promise<void> => {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

export { McpServer };
