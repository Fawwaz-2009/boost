# mcp-boost

A modular MCP (Model Context Protocol) toolkit for AI-assisted development in the JS/TS ecosystem.

## Project Vision

Inspired by Laravel Boost, but designed for the modular nature of JavaScript/TypeScript development. Where Laravel is batteries-included, JS developers assemble tools (Drizzle vs Prisma, TanStack Router vs Next.js, etc.). This toolkit must be modular and detection-aware.

## Tech Stack

- **Runtime**: Node.js >= 20.19
- **Language**: TypeScript (ES2024)
- **Build**: tsdown (Rolldown-based bundler)
- **Effect System**: Effect.ts for CLI and core logic
- **MCP SDK**: @modelcontextprotocol/sdk

## Project Structure

```
src/
├── index.ts          # MCP server entry
├── cli.ts            # CLI (init, serve commands)
└── tools/            # Individual MCP tools (to be created)
```

## Commands

```bash
pnpm build            # Build with tsdown
pnpm dev              # Watch mode
pnpm typecheck        # Type check without emitting
pnpm check-exports    # Validate package exports
```

## Design Principles

1. **Modular**: Tools are independent, can be enabled/disabled
2. **Detection-based**: Automatically discover project setup (Drizzle, Prisma, tRPC, etc.)
3. **Incremental value**: Each tool provides standalone value
4. **Extensible**: Users can add custom tools/strategies
5. **Zero-config works**: Sensible defaults, optional explicit configuration

## Key Challenges

1. **JS ecosystem fragmentation**: Unlike Laravel, no single "right way" to do things
2. **Monorepo support**: MCP config at root, but tools target specific apps
3. **Vite integration**: Many tools need Vite plugin for error capture, browser logs
4. **Type safety**: Leverage TypeScript for tool inputs/outputs

## Planned Tools (from exploration)

### Core (Any Vite Project)
- [ ] Browser Logs - Capture console.* from browser
- [ ] Server Logs / Last Error - Capture Vite errors
- [ ] Server URL - Get running dev server URL

### Database (Detection-based)
- [ ] Database Schema - Introspect live database
- [ ] Database Query - Execute read-only SQL

### API (Detection-based)
- [ ] tRPC List Procedures - Show all procedures with types
- [ ] tRPC Call Procedure - Execute procedures directly

### Routing (Detection-based)
- [ ] List Routes - Show registered routes

## Configuration (Planned)

```typescript
// boost.config.ts
import { defineBoostConfig, drizzlePostgres } from 'mcp-boost'
import { db } from './src/db'
import { appRouter } from './src/server/trpc'

export default defineBoostConfig({
  database: drizzlePostgres({
    getDb: () => db,
  }),
  trpc: {
    router: appRouter,
  },
})
```

## References

- [Laravel Boost](https://github.com/laravelboost/boost) - Inspiration
- [MCP Specification](https://modelcontextprotocol.io/)
- [Exploration Document](./mpc-boost-exploration.md)
