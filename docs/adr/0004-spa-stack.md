# Single-package SPA: Vite + React + TanStack Router

rulo is a client-only SPA in one package: Vite, React, TanStack Router (file-based, typed search params so a route query is a shareable URL) and TanStack Query. A server will be needed once live Market Data sources reject browser calls (CORS, keys); it will be a separate small app reusing `src/core/` and its schemas, so nothing in the core may depend on the browser or the UI. Split into a pnpm workspace only when that server exists.

## Considered Options

- TanStack Start (SPA mode, server functions later): less migration work, but a larger framework to learn before there is anything to serve.
- Next.js: server-first, more than an SPA needs.

## Consequences

- TypeScript is pinned to 6.0: typescript-eslint does not yet support TypeScript 7.
- When a new library is needed, prefer: Zod (validation), React Hook Form + Zod resolver (forms), Tailwind + shadcn/ui + lucide-react (UI), React Flow + elkjs (graphs), Vitest + Testing Library + MSW (tests), fast-check (property tests), Playwright (e2e), Temporal via `temporal-polyfill` (dates).
