# Project

`rulo` is a project to view and discover the best way of moving money across platforms. 
It shows and calculates the best routes to move money between different cryptocurrencies and platforms.

## Wishlist
Features that are vague and high level. They require further breakdown into Features.
- Renders graphs of the movement of money between platforms
- Calculates the best routes to move money between different cryptocurrencies and platforms
- Uses only public APIs of platforms
- The user should be able to specify source and destination platforms and cryptocurrencies. For example, send USD in the Deel Wallet to Santander Bank account in ARS

## Features
List of features that are specific and concrete. 
If a feature seems to contradict a wishlist entry, feature takes precedence. It means the wishlist is out of date and should be updated or eliminated.
- Static Catalog page, where the following entities are rendered in a graph 
  - Platform Currencies as nodes
  - Platforms as a grouping of theirs currencies
  - Routes(routes are usually between balances of accounts, here they are between currencies of platforms) as edges
- Platforms page
  - User can search for platforms, click and a popup for the platform shows
- Platform Popup
  - It shows
    - The currencies it supports
    - The inpoints of the currency
    - The outpoints of the currency
    - The ExchangePairs of the platform, with
      - A pivot currency
        - An option to choose action between "Buy" and "Sell"
      - The prices of the other currencies in relation to the pivot currency and action

## Entities
- Platforms
  - It has a set of Currencies it supports, and per currency
    - It has a set of inbound Connections it supports
      - This is an Inpoint
      - The Connection must support the currency
    - It has a set of outbound Connections it supports
      - This is an Outpoint
      - The Connection must support the currency
  - It has the set of ExchangePairs it supports 
  - Examples
    - Binance
    - Coinbase
    - Deel Wallet
    - Santander Argentina
    - DollarApp
    - AstroPay
- Currencies
  - Amounts of currencies are multiples of the currency fraction
  - Has a number of decimal points
  - The currency fraction is 1 / currency_denominator 
  - The currency denominator is defined by the number of decimal points: (10 ^ decimal_points)
  - Examples
    - USD: 2
    - USDT: 2
    - ARS: 2
    - BTC: 8 (satoshis)
- Connection
  - Connections define the kind of Inpoints and Outpoints that can exist
  - Every connection defines the set of currencies it supports
  - Every platform implies a connection: for cases when platforms are integrated natively
  - Examples
    - ACH: for banks in the US
      - USD
    - CBU: for banks in Argentina
      - ARS
      - USD
- Accounts
  - An Account belong to an Platform
  - It has a Balance per Currency its owning platform supports
  - The owning Platform defines what Inpoints and Outpoints are available for the Balances of the Account 
- Balance
  - Has an integer amount of the fractions of the Currency, given by the number of decimals 
- Inpoints and Outpoints
  - A pair of Inpoint and Outpoint of the same Connection and Currency form a Route between the related Balances
  - Platforms define the endpoints and outpoints their accounts have
  - It is different account, same currency
- ExchangePairs
  - Has a sourceCurrency and a targetCurrency
  - It defines that the sourceCurrency can be converted to targetCurrency
  - It implies a Route from the Balance of sourceCurrency to the Balance of targetCurrency, of the same Account 
  - It is same account, different currency
- ExchangeRate
  - Has a related ExchangePair
  - Actual, time varying exchange rate between currencies
  - targetAmount is the integer result of sourceAmount * ratio / (source_denominator * target_denominator)
- Routes
  - Routes connect Balances
  - Routes are directional, from sourceBalance to targetBalance
- Paths
  - Example
    - Deel Wallet (USD) -|ACH|-> DollarApp (USD) -|Platform|-> DollarApp (ARS) -|CBU transfer|-> Santander Argentina (ARS)

## Seed Data
- Platforms
  - DollarApp
    - Inpoints
      - ACH:USD
    - Outpoints
      - ARS:CBU
  - AstroPay
    - Inpoints
      - USD:ACH
    - Outpoints
      - ARS:CBU
      - USD:CBU
  - Santander Argentina
  - Deel Wallet
    - Inpoints
    - Outpoints
      - ACH
      - AstroPay
      - DollarApp
- Currencies
  - USD
  - ARS
- Connections
  - ACH
    - Supported currencies:
      - USD
  - CBU
    - Supported currencies:
      - ARS
      - USD
- Accounts
  - Deel Wallet
    - Id: deel-wallet

# Tech

## Project configuration
- use asdf for tool version management
- TypeScript: be strict and opinionated
- Core eslint stack + react + react-hooks + unused-imports
- Use Prettier only for formatting, never logic. Use eslint-config-prettier
- Use eslint-plugin-boundaries with path aliases
- Zod at every boundary
- react-error-boundary

## Preferred Stack and libraries
If a new library is needed, and only if needed, prefer the following stack and libraries:
- React + Vite + TypeScript
- TanStack Router
- TanStack Query
- Zod
- React Hook Form (+ Zod resolver)
- Tailwind + shadcn/ui (Radix) + lucide-react
- ESLint + Prettier (+ unused-imports, react-hooks)
- Vitest + Testing Library + MSW
- Playwright
- @js-joda/core for date/time handling


# AI Agent Usage Guidelines

## Commit Workflow

- Make all modifications cohesively within a single task before committing
- Don't leave partial changes, commit after a cohesive set of changes
- Use the appropriate author for AI-generated commits:
    - Claude (via Cursor): `git commit --author="Claude <claude@anthropic.com>" -m "message"`
    - GitHub Copilot: `git commit --author="GitHub Copilot <copilot@github.com>" -m "message"`
    - Codex: `git commit --author="Codex <codex@openai.com>" -m "message"`
- Never use `git commit -m` without the --author flag for AI-generated commits
- **Do NOT push after every commit** - only push when explicitly requested or when necessary (e.g., creating PR, completing work)
- Always build/test the code before committing to ensure no errors are introduced (doc-only changes do not require running tests again)

## Project rules
- No `any`
- All API data must be validated with Zod
- Prefer TanStack Query over manual fetch
- No direct `fetch` outside `api/`
- Tests are required for new API clients

# Tasks
Tasks to be completed by agents should follow a specific workflow. For each task, a new branch and a corresponding git worktree must be created. Chores can be grouped and referenced using markdown headings (## and ###). Once a task is finished, it should be crossed out. Only a single level of bullet points is allowed; any sub-bullets are to be treated as context or clarifications.
Before executing a task, a plan must be generated. This plan should include an analysis of whether the task is appropriate given the current state of the repository, and whether the proposed solution is feasible. The plan should then be presented to the user for approval before proceeding.

# Project Configuration
## Initialize project
- Set up the TypeScript project for the SPA `rulo`
