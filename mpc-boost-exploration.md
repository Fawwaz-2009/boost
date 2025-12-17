# Boost - Planning Document

> **Goal**: Create a modular, detection-based MCP toolkit that accelerates AI-assisted development for the JS/TS ecosystem, inspired by Laravel Boost.

## Overview

Laravel Boost solves **pain points** for Laravel developers. The tools aren't special because they're Laravel-specific - they're valuable because they solve universal developer pain points:

| Pain Point | Laravel Boost Solution |
|------------|----------------------|
| "What's in my database?" | DatabaseSchema, DatabaseQuery |
| "What just broke?" | LastError, ReadLogEntries, BrowserLogs |
| "What routes exist?" | ListRoutes |
| "How do I use this library?" | SearchDocs, Guidelines |
| "What's my app's setup?" | ApplicationInfo |

These pain points exist for **all** web developers, not just Laravel. We're building a toolkit that solves these same problems for the JS/TS ecosystem.

### The Opportunity: Vite as the Common Layer

Vite has become the de-facto standard build tool:
- TanStack Start uses Vite
- Remix uses Vite  
- Nuxt uses Vite
- SvelteKit uses Vite
- Astro uses Vite
- SolidStart uses Vite

A Vite-based MCP toolkit could reach a **massive** audience.

### Key Difference: Laravel vs JS Ecosystem

| Aspect | Laravel | JS/Vite Ecosystem |
|--------|---------|-------------------|
| Framework | Monolithic, batteries-included | Modular, assembly of libraries |
| Database | Eloquent ORM (built-in) | Drizzle, Prisma, Kysely, etc. |
| Auth | Laravel Sanctum/Breeze (built-in) | Better-Auth, Auth.js, Lucia, etc. |
| Routing | Built-in router | TanStack Router, React Router, file-based, etc. |
| API Layer | Built-in controllers | tRPC, Hono, Express, etc. |
| Build Tool | Mix/Vite (optional) | Vite (nearly universal) |
| Structure | Convention over configuration | Highly variable per project |

**Implication**: Our package must be modular and detection-based - automatically loading the right tools based on what the project uses.

---

## Project Architecture

### Modular, Detection-Based Design

```
@anthropic/boost (or similar)
├── core/                    # Works for any Vite project
│   ├── browser-logs         # Inject script, capture console.*
│   ├── server-logs          # Vite plugin captures errors
│   └── last-error           # Most recent error
│
├── database/                # Activated by detection
│   ├── drizzle/             # If drizzle-orm in package.json
│   ├── prisma/              # If prisma in package.json
│   └── kysely/              # If kysely in package.json
│
├── api/                     # Activated by detection
│   ├── trpc/                # If @trpc/server detected
│   │   ├── list-procedures  # Show all procedures + input/output types
│   │   └── call-procedure   # Execute procedure (queries only by default)
│   ├── hono/                # Future
│   └── express/             # Future
│
├── routing/                 # Activated by detection
│   ├── tanstack-router/     # If @tanstack/react-router detected
│   ├── react-router/        # If react-router detected
│   └── file-based/          # Next.js, Remix, etc.
│
├── auth/                    # Guidelines + maybe tools
│   ├── better-auth/
│   └── auth-js/
│
├── guidelines/              # Loaded based on package.json
│   ├── tanstack-query/
│   ├── tanstack-router/
│   ├── drizzle/
│   ├── tailwind/
│   └── ...
│
└── frameworks/              # Framework-specific extras
    ├── tanstack-start/
    ├── remix/
    └── next/
```

### Detection System

Tools activate automatically based on project analysis:

```typescript
// Detection sources (in priority order)
1. package.json dependencies/devDependencies
2. Config files (drizzle.config.ts, trpc router files, etc.)
3. Lock files for version info
4. Import analysis (expensive, optional)
```

Example detection:
```typescript
// package.json has drizzle-orm? → Database tools enabled
// package.json has @trpc/server? → tRPC tools enabled
// package.json has @tanstack/react-router? → Router tools enabled
// vite.config.ts exists? → Vite error capture enabled
```

### Configuration (Optional - Zero Config Works)

```typescript
// boost.config.ts
import { defineConfig } from '@anthropic/boost'
import { appRouter } from './src/server/trpc/router'
import { db } from './src/db'

export default defineConfig({
  // Database - explicit config needed for connection
  drizzle: {
    getDb: () => db,
  },
  
  // tRPC - provide router for introspection
  trpc: {
    router: appRouter,
    baseUrl: '/api/trpc',
  },
  
  // Everything else auto-detected
})
```

---

## Architecture Decisions

### 1. Monorepo Support

**Problem**: Many JS projects use monorepos (Turborepo, Nx, pnpm workspaces). The MCP server needs to know which app to target.

**Proposed Solution**:
```bash
# Install in the specific app
cd apps/web
npm install @tanstack/boost --save-dev

# The package detects its location relative to monorepo root
# Or accepts explicit config
```

**Configuration approach**:
```json
// tanstack-boost.config.json (or in package.json)
{
  "root": "../..",           // Monorepo root (for .mcp.json placement)
  "appPath": "./apps/web",   // App being targeted
  "mcpConfigPath": ".mcp.json"  // Where to write MCP config
}
```

**Open Questions**:
- Should MCP config go at monorepo root or app level?
- How do we handle multiple apps in same monorepo wanting Boost?
- Should we support a "workspace" mode that exposes tools for multiple apps?

### 2. Package Detection Strategy

Unlike Laravel where packages are in `composer.json`, JS has multiple sources:
- `package.json` dependencies
- Import statements in code
- Config files (drizzle.config.ts, auth.ts, etc.)

**Detection priority**:
1. Check `package.json` for known packages
2. Look for config files (e.g., `drizzle.config.ts` → Drizzle detected)
3. Scan imports in entry files (expensive, maybe optional)

---

## Tools Analysis

### Tools to Implement (High Priority)

#### 1. Browser Logs ✅ (Definitely)
**Laravel Version**: Injects JS to capture console.log/error and POST to server, stores in log file, MCP tool reads it.

**Our Adaptation**:
- Same architecture works perfectly for any JS framework
- Need a framework-agnostic way to inject the script
- Options:
  - Vite plugin (most common bundler)
  - Next.js middleware/instrumentation
  - Manual `<script>` tag with `@tanstack-boost/browser` package
  - Astro integration

**Implementation thoughts**:
```typescript
// Vite plugin approach
import { tanstackBoostPlugin } from '@tanstack/boost/vite'

export default defineConfig({
  plugins: [tanstackBoostPlugin()]
})
```

**Challenges**:
- Where to store logs? No `storage/logs` convention in JS
  - Option A: `.tanstack-boost/logs/browser.log`
  - Option B: Use OS temp directory
  - Option C: SQLite database for structured queries
- How to run the HTTP endpoint for receiving logs?
  - Option A: Separate dev server (like Vite runs on 5173)
  - Option B: Middleware injected into existing dev server
  - Option C: File-based (browser writes to localStorage, tool reads via Playwright?)

#### 2. Application Info (Maybe)
**Laravel Version**: Returns PHP version, Laravel version, installed packages, Eloquent models.

**Our Adaptation**:
```typescript
// What we could return
{
  "node": "20.10.0",
  "packageManager": "pnpm@8.0.0",
  "typescript": "5.3.0",
  "framework": "vite",
  "detected": {
    "tanstack-query": "5.x",
    "tanstack-router": "1.x",
    "drizzle-orm": "0.29.x",
    "better-auth": "1.x"
  },
  "structure": {
    "srcDir": "./src",
    "routesDir": "./src/routes"
  }
}
```

**Value proposition**: Helps AI understand project setup without reading multiple config files.

**Concern**: Less valuable than Laravel because:
- JS ecosystem is more explicit (imports visible in code)
- AI can easily read package.json
- No "hidden" conventions like Eloquent model discovery

**Verdict**: Lower priority, maybe implement as simple package.json + config file reader.

#### 3. Database Tools (High Priority - Drizzle Focus for V1)

See [Database Tools V1 Design](#database-tools-v1-design) section below for detailed design.

#### 5. List Routes (High Priority for TanStack Router)
**Laravel Version**: Lists all registered routes.

**Our Adaptation**:
- TanStack Router: Parse route tree from `routeTree.gen.ts`
- Next.js: Read `app/` or `pages/` directory structure
- React Router: Would need to parse route config

#### 6. Search Docs (High Priority)
**Laravel Version**: Semantic search over Laravel documentation.

**Our Adaptation**:
- Index TanStack docs (Query, Router, Form, Table, etc.)
- Index detected library docs (Drizzle, Better-Auth, etc.)
- Could use same hosted API approach or local embeddings

---

## Tools to Skip (For Now)

| Laravel Tool | Why Skip |
|--------------|----------|
| Tinker | No REPL equivalent that makes sense |
| Artisan Commands | No CLI convention in JS ecosystem |
| Get Config | Less useful - config is explicit in JS |
| List Env Vars | Could implement, but .env files are readable |
| Last Error | Server logs vary too much by framework |

---

## Guidelines/Prompts Strategy

Laravel Boost has versioned guidelines for each package:
```
.ai/
├── laravel/
│   ├── core.blade.php
│   ├── 11.x/
│   └── 12.x/
├── livewire/
│   ├── core.blade.php
│   └── 3.x/
```

**Our Structure Proposal**:
```
.ai/
├── core.md                    # General best practices
├── tanstack-query/
│   ├── core.md
│   └── v5.md
├── tanstack-router/
│   ├── core.md
│   └── v1.md
├── drizzle/
│   ├── core.md
│   └── migrations.md
├── better-auth/
│   └── core.md
└── project.md                 # Project-specific (user customizable)
```

**Key Guidelines to Include**:
1. TanStack Query patterns (mutations, invalidation, optimistic updates)
2. TanStack Router patterns (loaders, search params, type safety)
3. Drizzle patterns (schema design, migrations, queries)
4. TypeScript strict mode patterns
5. Testing patterns (Vitest, Testing Library)

---

## Open Questions

### Technical
1. **How to run MCP server in JS?**
   - Laravel uses `php artisan boost:mcp`
   - We could use `npx tanstack-boost mcp` or `node_modules/.bin/tanstack-boost`

2. **Where to store browser logs?**
   - Need cross-platform solution
   - Need to survive dev server restarts

3. **How to inject browser logger script?**
   - Framework-specific integrations vs universal solution?

4. **How to handle SSR frameworks?**
   - Next.js, Remix, Astro all have different patterns
   - Browser logs only work client-side

### Product
1. **Should we focus on TanStack specifically or broader JS ecosystem?**
   - TanStack focus: Smaller scope, clearer identity
   - Broader focus: More useful, but harder to maintain

2. **What's the minimum viable set of tools?**
   - Browser Logs (universal debugging value)
   - Search Docs (TanStack + detected libraries)
   - Routes (if TanStack Router detected)

3. **How to handle the lack of conventions?**
   - Laravel can assume `app/Models/` for models
   - JS has no such conventions - need more detection/configuration

4. **Should guidelines be fetched or bundled?**
   - Fetched: Always up-to-date, requires network
   - Bundled: Works offline, needs package updates

---

## Next Steps

1. [ ] Analyze remaining Laravel Boost tools for applicability
2. [ ] Study Laravel Boost's guideline/prompt structure in detail
3. [ ] Prototype browser logs implementation for Vite
4. [ ] Design package detection system
5. [ ] Create basic MCP server skeleton
6. [ ] Define configuration schema

---

## Research Notes

### Laravel Boost Tools Analyzed
- [x] Browser Logs - Applicable, high priority (see Browser Logs section)
- [x] Application Info - Lower priority, less value in JS
- [x] Database Schema - High priority, V1 design complete (see Database Tools section)
- [x] Database Query - High priority, V1 design complete (see Database Tools section)
- [x] Database Connections - Skip for V1, fold into schema response
- [ ] List Routes - Need to analyze
- [ ] Search Docs - Need to analyze
- [ ] Get Config - Need to analyze
- [ ] List Available Config Keys - Need to analyze
- [ ] List Available Env Vars - Need to analyze
- [x] List Artisan Commands - Skip (no equivalent)
- [x] Last Error - Applicable via Vite plugin (see Server Logs section)
- [x] Read Log Entries - Applicable via Vite plugin (see Server Logs section)
- [x] Tinker - Skip (no equivalent)
- [x] Get Absolute URL - Applicable via Vite plugin (see Server URL section)
- [ ] Report Feedback - Maybe (community building)

### New Tools (Not in Laravel Boost)
- [x] tRPC ListProcedures - List all procedures with input/output types
- [x] tRPC CallProcedure - Execute procedures directly (queries only by default)

### Code References (Laravel Boost)
- Entry point: `src/BoostServiceProvider.php`
- MCP Server: `src/Mcp/Boost.php`
- Tools: `src/Mcp/Tools/*.php`
- Browser Logs injection: `src/Services/BrowserLogger.php`
- Browser Logs middleware: `src/Middleware/InjectBoost.php`
- Tool registry: `src/Mcp/ToolRegistry.php`
- Code environment detection: `src/Install/CodeEnvironment/*.php`

---

## Database Tools V1 Design

### Design Principles

1. **User provides working `getDb()`** - No magic connection handling. User's app already has a working DB client; we just use it.
2. **Strategy pattern** - User picks their dialect strategy (`drizzlePostgres`, `drizzleMysql`, etc.)
3. **Read-only by default** - Recommend read-only DB client + `sql-query-identifier` as safety net
4. **Dialect-aware** - AI always knows what DB it's working with (included in every response)
5. **Extensible** - Users can create custom strategies for unsupported setups

### Why Explicit `getDb()` Over Magic Connection

Laravel Boost can magically read database config because Laravel controls the whole stack. In JS/TS land, there are too many variables:

- Different drivers: `postgres.js`, `node-postgres`, `@neondatabase/serverless`, etc.
- SSL configurations vary wildly
- Connection pooling (PgBouncer, Supabase pooler)
- Serverless vs traditional connections
- Environment variable patterns differ per project

**If the user's app can connect to the database, our tools can too.** Zero connection debugging.

### V1 Tools

#### Tool 1: `DatabaseSchema`

Introspects the live database and returns schema information.

```typescript
// What AI receives
{
  "dialect": "postgresql",
  "version": "15.2",
  "tables": {
    "users": {
      "columns": {
        "id": { "type": "serial", "nullable": false, "primaryKey": true },
        "email": { "type": "varchar(255)", "nullable": false },
        "created_at": { "type": "timestamp", "nullable": true, "default": "now()" }
      },
      "indexes": {
        "users_pkey": { "columns": ["id"], "unique": true, "primary": true },
        "users_email_idx": { "columns": ["email"], "unique": true }
      },
      "foreignKeys": []
    },
    "posts": {
      "columns": {
        "id": { "type": "serial", "nullable": false, "primaryKey": true },
        "user_id": { "type": "integer", "nullable": false },
        "title": { "type": "text", "nullable": false }
      },
      "foreignKeys": [
        { "columns": ["user_id"], "references": { "table": "users", "columns": ["id"] } }
      ]
    }
  }
}
```

**Note:** V1 uses live database introspection only. Schema file parsing (reading `.ts` Drizzle schema files) is deferred - it's complex and introspection works well enough.

#### Tool 2: `DatabaseQuery`

Execute read-only SQL queries against the database.

```typescript
// Input
{ "query": "SELECT id, email FROM users WHERE created_at > '2024-01-01' LIMIT 10" }

// Output
{
  "dialect": "postgresql",
  "rows": [
    { "id": 1, "email": "alice@example.com" },
    { "id": 2, "email": "bob@example.com" }
  ],
  "rowCount": 2
}
```

### Read-Only Query Safety

**Layer 1: SQL Query Identification**

Use [sql-query-identifier](https://www.npmjs.com/package/sql-query-identifier) package:

```typescript
import { identify } from 'sql-query-identifier'

function validateReadOnly(sql: string, dialect: string) {
  const statements = identify(sql, { dialect })
  
  for (const stmt of statements) {
    if (stmt.executionType !== 'LISTING') {
      throw new Error(
        `Only read-only queries allowed. Found: ${stmt.type} (${stmt.executionType})`
      )
    }
  }
}
```

This handles:
- Case insensitivity (`select` vs `SELECT`)
- Multi-statement detection (`SELECT 1; DROP TABLE users;`)
- Dialect-specific syntax
- Semantic understanding (LISTING vs MODIFICATION vs DEFINITION)

**Layer 2: Recommend Read-Only Database Client (Best Protection)**

Document that users should ideally provide a read-only connection:

```typescript
// Best practice: use read replica or read-only user
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const readOnlyClient = postgres(process.env.DATABASE_READ_REPLICA_URL!)
export const readOnlyDb = drizzle(readOnlyClient)
```

### V1 Configuration API

```typescript
// tanstack-boost.config.ts
import { defineBoostConfig, drizzlePostgres } from '@tanstack/boost'
import { db } from './src/db'

export default defineBoostConfig({
  database: drizzlePostgres({
    getDb: () => db,
  }),
})
```

### Strategy Pattern Implementation

```typescript
// Built-in strategies for V1
import { drizzlePostgres, drizzleMysql, drizzleSqlite } from '@tanstack/boost'

// Each strategy knows:
// - Its dialect name (for AI context)
// - How to execute queries with that client type
// - How to introspect schema for that database
// - How to get version info
```

### Extensibility (Custom Strategies)

Users can define custom strategies for unsupported setups:

```typescript
import { defineBoostConfig, defineDatabaseStrategy } from '@tanstack/boost'
import { db } from './src/db'

const myCustomStrategy = defineDatabaseStrategy({
  dialect: 'postgresql',
  
  async executeQuery(db, sql) {
    const result = await db.execute(sql)
    return { rows: result.rows, rowCount: result.rows.length }
  },
  
  async introspectSchema(db) {
    // Custom introspection logic
  },
  
  async getVersion(db) {
    const result = await db.execute('SELECT version()')
    return result.rows[0].version
  },
})

export default defineBoostConfig({
  database: myCustomStrategy({ getDb: () => db }),
})
```

### What's NOT in V1

| Feature | Why Deferred |
|---------|--------------|
| Schema file parsing | Complex TypeScript parsing; introspection works fine |
| Migration status | Drizzle-kit specific, adds complexity |
| Schema drift detection | Nice-to-have, not essential |
| Multiple connections | Rare in JS/TS apps, unlike Laravel |
| `DatabaseConnections` tool | Folded into schema response (just shows dialect + version) |
| Prisma support | Different ORM, different strategies - future work |

### Laravel Boost Comparison

| Aspect | Laravel Boost | TanStack Boost V1 |
|--------|---------------|-------------------|
| Connection handling | Magic (reads config) | Explicit (`getDb()`) |
| Multi-DB support | Yes (mysql, pgsql, sqlite, sqlsrv) | Yes via strategies |
| Read-only validation | Simple allowlist + `strtoupper()` | `sql-query-identifier` package |
| Schema source | Live DB introspection | Live DB introspection |
| Dialect in response | Yes (`engine` field) | Yes (`dialect` field) |

### Research Notes

- Laravel's read-only check is simple string matching - works but has edge cases
- [sql-query-identifier](https://www.npmjs.com/package/sql-query-identifier) provides proper parsing with `executionType` (LISTING/MODIFICATION/DEFINITION)
- Supports dialects: generic, mysql, psql, sqlite, mssql, oracle
- Laravel supports: MySQL/MariaDB, PostgreSQL, SQLite, SQL Server (all SQL-based)

---

## tRPC Tools Design

### The Problem

When AI tries to test a tRPC endpoint, it struggles because:

1. **URL structure is weird**: `/api/trpc/user.getById?batch=1&input={"0":{"json":{"id":"123"}}}`
2. **Batching**: Multiple calls get batched into one request
3. **Input encoding**: JSON wrapped in specific structure
4. **Different links**: httpBatchLink vs httpLink vs wsLink have different formats
5. **Headers**: Often need auth headers, content-type, etc.

The AI ends up guessing the HTTP format and usually gets it wrong.

### Solution: Abstract Away the Complexity

Instead of making AI construct HTTP requests, we provide direct procedure access.

### Configuration

```typescript
// boost.config.ts
import { defineConfig, trpc } from '@anthropic/boost'
import { appRouter } from './src/server/trpc/router'

export default defineConfig({
  trpc: {
    router: appRouter,           // We introspect this for procedure info
    baseUrl: '/api/trpc',        // Optional: for reference
    // Optional: context for authenticated calls
    createContext: () => ({
      user: { id: 'test-user', role: 'admin' }
    }),
  },
})
```

### Tool 1: `ListProcedures`

Shows all available procedures with their types.

```typescript
// Output
{
  "procedures": {
    "user.getById": {
      "type": "query",
      "input": { "id": "string" },
      "output": { "id": "string", "name": "string", "email": "string" }
    },
    "user.create": {
      "type": "mutation",
      "input": { "name": "string", "email": "string" },
      "output": { "id": "string", "name": "string", "email": "string" }
    },
    "post.list": {
      "type": "query",
      "input": { "limit?": "number", "cursor?": "string" },
      "output": { "items": "Post[]", "nextCursor": "string | null" }
    }
  }
}
```

**Implementation**: tRPC routers have `_def.procedures` with metadata. Use `zod-to-json-schema` to serialize input/output schemas.

### Tool 2: `CallProcedure`

Execute a procedure directly (bypasses HTTP entirely).

```typescript
// Input (what AI provides - simple!)
{
  "procedure": "user.getById",
  "input": { "id": "123" }
}

// Output
{
  "result": { "id": "123", "name": "Alice", "email": "alice@example.com" },
  "timing": "45ms"
}
```

**Implementation**: Use tRPC's `createCallerFactory` for direct server-side calls:

```typescript
import { createCallerFactory } from '@trpc/server'

const createCaller = createCallerFactory(appRouter)
const caller = createCaller(context)

// Direct call - no HTTP encoding needed!
const result = await caller.user.getById({ id: '123' })
```

### Safety: Read-Only by Default

```typescript
// Default: only queries allowed
{
  "procedure": "user.create",  // mutation
  "input": { "name": "Alice" }
}
// Error: "Only queries allowed. 'user.create' is a mutation."

// Opt-in to mutations in config
export default defineConfig({
  trpc: {
    router: appRouter,
    allowMutations: true,  // Explicitly enable
  },
})
```

### Why This Is Better Than HTTP

| HTTP Approach | Direct Caller Approach |
|---------------|----------------------|
| AI must know batch format | Just provide procedure name + input |
| Encoding varies by link type | Consistent API |
| Auth headers complex | Context provided in config |
| Error responses need parsing | Native JS errors |

---

## Server Logs / Error Capture Design

### The Problem

Unlike Laravel with unified logging, JS/Vite has scattered error sources:
- Console output (`console.error`)
- Vite build/transform errors
- HMR failures
- Unhandled promise rejections
- Server middleware errors
- Framework-specific errors

### Solution: Vite Plugin for Unified Capture

```typescript
// Vite plugin captures all error sources
import { boostPlugin } from '@anthropic/boost/vite'

export default defineConfig({
  plugins: [boostPlugin()]
})
```

### What We Capture

| Error Source | How Captured |
|--------------|--------------|
| Vite build errors | `buildEnd` hook |
| Transform errors | `transform` hook try/catch |
| HMR failures | `handleHotUpdate` + error events |
| Server errors | `configureServer` middleware |
| Console.error | Hook `console.error` in server |
| Unhandled rejections | `process.on('unhandledRejection')` |
| Uncaught exceptions | `process.on('uncaughtException')` |

### Storage

Hybrid approach:
- **In-memory**: Last ~100 errors for quick access
- **File**: `.boost/logs/server.log` for persistence
- On tool call: check memory first, fall back to file

### Tool 1: `LastError`

Returns the most recent server-side error.

```typescript
// Output
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "type": "vite",  // or "server", "unhandled", "console"
  "message": "Failed to resolve import './missing.ts'",
  "stack": "Error: Failed to resolve...\n    at ...",
  "file": "/src/components/App.tsx",
  "line": 42
}
```

### Tool 2: `ServerLogs` (ReadLogEntries equivalent)

Returns recent log entries.

```typescript
// Input
{ "entries": 10, "level": "error" }  // level filter optional

// Output
{
  "entries": [
    { "timestamp": "...", "type": "vite", "level": "error", "message": "..." },
    { "timestamp": "...", "type": "console", "level": "warn", "message": "..." }
  ]
}
```

### Vite Plugin Implementation Sketch

```typescript
export function boostPlugin(): Plugin {
  const errors: ErrorEntry[] = []
  
  return {
    name: 'boost',
    
    configureServer(server) {
      // Capture middleware errors
      server.middlewares.use((err, req, res, next) => {
        if (err) {
          errors.push(formatError(err, 'server'))
        }
        next(err)
      })
      
      // Hook Vite's logger
      const originalError = server.config.logger.error
      server.config.logger.error = (msg, options) => {
        errors.push({ type: 'vite', message: msg, ... })
        originalError(msg, options)
      }
      
      // Hook console.error
      const originalConsoleError = console.error
      console.error = (...args) => {
        errors.push({ type: 'console', message: args.join(' '), ... })
        originalConsoleError(...args)
      }
    },
    
    buildEnd(error) {
      if (error) {
        errors.push(formatError(error, 'build'))
      }
    },
  }
}
```

### Open Questions

1. **Production logs?** - Focus V1 on dev-time. Production varies too much (Vercel, Cloudflare, etc.)
2. **Console.log capture?** - Could be noisy. Maybe only errors/warnings by default.
3. **Relationship with BrowserLogs?** - Keep separate (server vs client) but similar format

---

## Server URL Tool Design

### The Problem

AI often needs to construct URLs for:
- Testing API endpoints with fetch
- Opening pages in browser
- Debugging network requests

But it doesn't know:
- What port Vite is running on (5173? 5174? custom?)
- HTTP or HTTPS?
- Is there a base path configured?

### Solution: Expose Vite's Resolved URLs

Vite tracks this internally via `server.resolvedUrls` after the server starts:

```typescript
// What Vite knows
{
  local: ['http://localhost:5173/', 'http://127.0.0.1:5173/'],
  network: ['http://192.168.1.100:5173/']
}
```

This handles all edge cases:
- Auto-selected ports (if 5173 is busy)
- HTTPS configuration
- Custom host settings
- Base path from config

### Implementation

```typescript
export function boostPlugin(): Plugin {
  let resolvedUrls: ResolvedServerUrls | null = null
  
  return {
    name: 'boost',
    
    configureServer(server) {
      // Return function runs AFTER internal middleware installed
      return () => {
        resolvedUrls = server.resolvedUrls
        // Now we have the actual running URLs
      }
    },
  }
}
```

### Tool: `GetServerUrl`

Returns the running dev server URL.

```typescript
// Output
{
  "url": "http://localhost:5173",      // Primary URL for AI to use
  "local": [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ],
  "network": [
    "http://192.168.1.100:5173"
  ],
  "base": "/",
  "https": false
}
```

### Tool: `ResolveUrl` (Optional Helper)

Combines base URL with a path - handles edge cases like double slashes.

```typescript
// Input
{ "path": "/api/trpc/user.getById" }

// Output
{ 
  "url": "http://localhost:5173/api/trpc/user.getById"
}

// With base path configured as "/my-app/"
{ 
  "url": "http://localhost:5173/my-app/api/trpc/user.getById"
}
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Server not running | Error: "Vite dev server not running" |
| Port auto-selected | Returns actual port Vite chose |
| Custom `base` config | Included in URL resolution |
| HTTPS | Returns `https://` URL |
| Multiple network IPs | Returns all in `network` array |

### Production Consideration

This is dev-only (Vite dev server). For production URLs:
- Out of scope for this tool
- User can configure `baseUrl` in boost config if needed
- Or use environment variables in their code

### Why This Matters

| Without Tool | With Tool |
|--------------|-----------|
| AI guesses `http://localhost:3000` | AI gets actual `http://localhost:5174` |
| Hardcoded URLs break | Always correct URL |
| Doesn't know about base path | Base path included |
| HTTP vs HTTPS confusion | Correct protocol |
