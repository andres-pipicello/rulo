# TODO

## Project Setup
- [ ] Initialize Vite + React + TypeScript project
  - [ ] Configure asdf `.tool-versions` (Node, pnpm)
  - [ ] Set up Tailwind CSS + shadcn/ui
- [ ] Configure linting and formatting
  - [ ] ESLint with react, react-hooks, unused-imports, eslint-config-prettier, eslint-plugin-boundaries
  - [ ] Prettier
  - [ ] Path aliases and boundary rules
- [ ] Set up testing infrastructure
  - [ ] Vitest + Testing Library + MSW
  - [ ] Playwright

## Domain Model
- [ ] Define core types with Zod schemas
  - [ ] Currency (symbol, decimalPlaces, derived denominator/fraction)
  - [ ] Connection (ACH, CBU) with supported currencies
  - [ ] Inpoint / Outpoint
  - [ ] ExchangePair (source, target)
  - [ ] Amount (currency, integer fraction amount)
- [ ] Define composite types
  - [ ] Platform (currencies map, endpoints, exchangePairs)
  - [ ] Account (platform, balances map)
  - [ ] Route (sourceBalance -> targetBalance)
  - [ ] Path (ordered sequence of routes)
- [ ] Create seed data
  - [ ] Platforms: Deel Wallet, DollarApp, AstroPay, Santander Argentina, Binance, Coinbase
  - [ ] Currencies: USD, ARS, USDT, BTC
  - [ ] Connections: ACH (USD), CBU (ARS, USD)

## Static Catalog Page
- [ ] Render platform/currency graph
  - [ ] Platforms as grouped nodes
  - [ ] Platform currencies as nodes within each group
  - [ ] Routes as directed edges between currency nodes
- [ ] Graph interaction
  - [ ] Panning and zooming

## Platforms Page
- [ ] List all platforms with search / filter
- [ ] Platform Popup on click
  - [ ] Display supported currencies with inpoints and outpoints
  - [ ] Display exchange pairs
    - [ ] Pivot currency selector
    - [ ] Buy / Sell action toggle
    - [ ] Prices relative to pivot currency and action

## Routing Engine
- [ ] Build directed graph from platforms, connections, and exchange pairs
- [ ] Implement pathfinding (source platform+currency -> target platform+currency)
  - [ ] Incorporate time-varying exchange rates and fees into edge cost
  - [ ] Return ranked paths with estimated output amounts

## API / Data Layer
- [ ] Create `api/` module for all external fetch calls
  - [ ] Zod validation at every boundary
  - [ ] TanStack Query integration for fetching and caching
- [ ] Stub exchange rate data with MSW for development

## Testing
- [ ] Unit tests
  - [ ] Domain model (Currency arithmetic, Amount operations)
  - [ ] Routing engine pathfinding
- [ ] Integration tests
  - [ ] API clients with MSW
- [ ] E2E tests (Playwright)
  - [ ] Catalog page rendering
  - [ ] Platform search and popup flow
