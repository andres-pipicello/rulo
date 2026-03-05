# Project

`rulo` is a project to view and discover the best way of moving money across platforms.
It shows and calculates the best routes to move money between different cryptocurrencies and platforms.

# Specification

## Use cases
Use cases listed must be supported by the design
- Deel allows direct transfer from USD balance directly to an ARS balance identified by CBU

## Wishlist
Features that are vague and high level. They require further breakdown into Features.
- Renders graphs of the movement of money between platforms
- Calculates the best routes to move money between different cryptocurrencies and platforms
- Uses only public APIs of platforms
- The user should be able to specify source and destination platforms and cryptocurrencies. For example, send USD in the Deel to Santander Bank account in ARS

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

# Design

## Static Entities
Defined by seed data of the system
### Platforms
#### Properties
- currencies: Map[Currency, Endpoints]
    - Endpoints: is the set of Inpoints and Outpoints the platform support for the currency
        - inpoints: Inpoint*
        - outpoints: Outpoints*
- exchangePairs: ExchangePair*
    - ExchangePairs it supports
#### Examples
- Binance
- Coinbase
- Deel Wallet
- Santander Argentina
- DollarApp
- AstroPay

### Currency
Amounts of currencies are integer multiples of the fraction
#### Properties
- symbol
- decimalPlaces
    - amount of decimal places the minimum fraction of the currency unit has
- denominator
    - derived, calculated as (10 ^ decimalPlaces)
- fraction
    - derived, calculated as 1/denominator
#### Examples
- USD: 2
- USDT: 2
- ARS: 2
- BTC: 8 (satoshis)

### Connection
Connections define the kind of Inpoints and Outpoints that can exist. Every platform implies a connection, for cases when platforms are integrated natively.
Connections define the kind of Inpoints and Outpoints that can exist
#### Properties
- currencies: Currency*
    - the set of currencies the Connection supports
#### Examples
- ACH: for banks in the US
    - USD
- CBU: for banks in Argentina
    - ARS
    - USD

### Inpoint and Outpoint
A pair of Inpoint and Outpoint of the same Connection and Currency form a Route between the related Balances.
Platforms define the endpoints and outpoints their accounts have. Different account, same currency
#### Properties
- connection: Connection

### ExchangePair
Expresses that a source amount can be exchanged to an amount of the target currency, in the implicit context.
Implies a Route from the Balance of source Currency to the Balance of target Currency, of the same Account
#### Properties
- source: Currency
- target: Currency

## Input Entities
Input entities come from user input. It represents the current financial state of the user

### Account
An Account belongs to a Platform
#### Properties
- platform: Platform
    - Owning platform
- balances: Map[Currency, Amount]
    - Balance per currency
    - Keys must be a subset of platform.currencies.keys

### Amount
#### Properties
- currency: Currency
- amount
    - Integer amount of fractions of the currency

### Other entities
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

# Data

## Time Varying Data
Data like
- exchange rates
- fees
  Are considered time varying data. Because they are updated from several sources, and can change asynchronously, they are kept separated from entities, and resolved only when required.

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

