import { c } from "../../shared/colors.js";

/**
 * Get setup instructions for the server-logs tool
 */
export function getSetupInstructions(): string {
  return `
${c.heading("Server Logs Tool")}

This tool captures server-side console output, Vite build errors,
and SSR errors from your Vite application.

${c.label("1. Install the package:")}

${c.code(`  npm install -D mcp-boost`)}

${c.label("2. Add the plugin to your vite.config.ts:")}

${c.code(`  import { boostPlugin } from "mcp-boost/vite";

  export default defineConfig({
    plugins: [
      boostPlugin(),
    ],
  });`)}

${c.label("Usage:")}
${c.dim("-")} Start your Vite dev server
${c.dim("-")} Ask your coding agent to check server_logs for errors
`.trim();
}
