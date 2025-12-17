import { c } from "../../shared/colors.js";

/**
 * Get setup instructions for the browser-logs tool
 */
export function getSetupInstructions(): string {
  return `
${c.heading("Browser Logs Tool")}

This tool captures browser console output (console.log, console.error, etc.)
and runtime errors from your Vite application.

${c.label("1. Install the package:")}

${c.code(`  npm install -D mcp-boost`)}

${c.label("2. Add the plugin to your vite.config.ts:")}

${c.code(`  import { boostPlugin } from "mcp-boost/vite";

  export default defineConfig({
    plugins: [
      boostPlugin({
        // Specify your client entry file(s) if auto-detection doesn't work
        clientEntries: ["./src/main.tsx"],
      }),
    ],
  });`)}

${c.label("Usage:")}
${c.dim("-")} Start your Vite dev server
${c.dim("-")} Visit your app in the browser
${c.dim("-")} Ask your coding agent to check browser_logs for errors

${c.label("Limitations:")}
${c.dim("-")} TanStack Start requires explicit clientEntries (e.g., "./app/client.tsx")
${c.dim("-")} Browser logs only work when a page loads successfully (404s won't capture)
`.trim();
}
