> **Draft.** Detailed shape of the domain until it is fully expressed as types, schemas and tests in `src/core/`; then this file is deleted. Terms are defined in [GLOSSARY.md](../GLOSSARY.md); the reasons behind the shape are in [docs/adr/](adr/).

# Catalog

Static description of what exists, loaded from seed data.

## Currency
- `symbol`: unique code (`USD`, `ARS`, `USDT`, `BTC`)
- `decimals`: number of decimal places of the Minor unit (USD 2, ARS 2, USDT 6, BTC 8)
- Derived: `scale = 10 ^ decimals`

## Connection
- `id`: unique (`ach`, `cbu`, `polygon`, `dollarapp`)
- `currencies`: Currencies it can carry
- Declared explicitly; a Platform's own link is named after the Platform by convention. A stablecoin on two networks is one Currency over two Connections.

## Platform
- `id`, `name`
- `currencies`: the Platform Currencies it offers; for each:
  - `inpoints`, `outpoints`: `{ connection, currency }`, where `currency ∈ connection.currencies`
- `exchangePairs`: `{ source, target }`, directional

An Inpoint or Outpoint may carry a different Currency from its Platform Currency (Deel USD Outpoint `{ cbu, ARS }`); the Platform converts at its own Exchange Rate.

# User state

## Account
- `id` (a user may have two Accounts on one Platform, e.g. personal and joint)
- `platform`
- `balances`: one Amount per Currency; the keys declare which Platform Currencies the Account holds (a zero Balance still counts) and must be offered by the Platform

## Amount
- `currency`, `minor` (integer Minor units, [ADR 0001](adr/0001-amounts-are-integer-minor-units.md)). Combining Amounts of different Currencies is a bug.

# Search

## Stops and the Search Universe
- **Held Stop**: one per Balance (Account × Currency)
- **Prospective Stop**: one per Platform Currency the user holds in no Account
- **Search Universe**: a set of Stops, built from presets and then edited:
  - *Everything*: every held and prospective Stop
  - *Only mine*: held Stops only
  - add/remove individual Stops
- The starting and destination Stops are always in the Search Universe.

## Hops (structure, from the Catalog only)
- **Transfer** from Stop A to Stop B (A ≠ B, any Platforms): for each Outpoint `o` of A's Platform Currency and Inpoint `i` of B's where `o.connection = i.connection` and `o.currency = i.currency`.
- **Exchange** from A to B: same Platform, an Exchange Pair `A.currency → B.currency`, and not two held Stops of different Accounts.

## Routes
An ordered sequence of Hops from the starting to the destination Stop, within the Search Universe, visiting no Stop twice, at most `maxHops` long (default 4). Finding Routes needs no Market Data.

## Quotes (evaluation)
A Quote fixes one side and computes the other:
- **Fixed Sent Amount**: run the Route forward. Best Quote = highest Delivered Amount.
- **Fixed Delivered Amount**: the smallest Sent Amount whose forward run delivers at least the target (every step is monotonic, so this is a search over the forward run). Best Quote = lowest Sent Amount.
- Ties: fewer Hops.
- Only the best Quote is returned.

Each Leg records the Amount in, the Fees charged, the Exchange Rates applied and the Amount out.

### Evaluating a Leg
Transfer:
1. Outpoint Fee, in A's Currency
2. Conversion at A's Platform, if the Outpoint carries another Currency
3. Inpoint Fee, in the carried Currency
4. Conversion at B's Platform, if B holds another Currency

Exchange: conversion at the Platform's Exchange Rate. Exchange Pairs carry no Fees; the rate is effective ([ADR 0002](adr/0002-exact-rational-rates-rounding-down.md)).

# Market Data

Time-varying, kept apart from the Catalog ([ADR 0003](adr/0003-market-data-separate-from-catalog.md)).

## Exchange Rate
- `platform`, `source`, `target`, `rate` (exact rational, major target per major source), `asOf`
- Conversion: `floor(x × rate × target.scale / source.scale)`
- Used both by Exchanges and by cross-currency Inpoints/Outpoints.

## Fee
- On one Outpoint or Inpoint of a Platform Currency
- `fixed` (Minor units of the charged Currency) and `proportional` (exact fraction)
- Charged on `x`: `x − fixed − ceil(x × proportional)`; a result ≤ 0 makes the Leg impossible for that Amount.
- Every Outpoint and Inpoint has a Fee entry; a free one is an explicit zero, and a check fails the build when one is missing. An endpoint whose Fees nobody has researched does not belong in the Catalog yet.
- A Hop missing its Exchange Rate or Fee cannot be quoted.

# Seed data

Values marked _(assumed)_ need checking against the real Platform. Market Data values are illustrative, not real.

- Currencies: USD (2), ARS (2), USDT (6)
- Connections: `ach` (USD), `cbu` (ARS, USD), `polygon` (USDT), `astropay` (USD), `dollarapp` (USD)
- Deel Wallet
  - USD Outpoints: `ach/USD`, `astropay/USD`, `dollarapp/USD`, `cbu/ARS` (cross-currency)
  - ARS _(assumed)_, Outpoint `cbu/ARS`; Exchange Pair USD→ARS
- DollarApp
  - USD Inpoints: `ach/USD`, `dollarapp/USD`, `polygon/USDT` (cross-currency, _assumed_)
  - ARS Outpoint: `cbu/ARS`; Exchange Pairs USD↔ARS
- AstroPay
  - USD Inpoints: `ach/USD`, `astropay/USD`; Outpoint `cbu/USD`
  - ARS Outpoint `cbu/ARS`
  - USDT _(assumed)_, Outpoint `polygon/USDT`
  - Exchange Pairs USD↔ARS, USD↔USDT _(assumed)_
- Santander Argentina: ARS Inpoint `cbu/ARS`; USD Inpoint `cbu/USD` _(assumed)_; Exchange Pairs USD↔ARS _(assumed)_

# Out of scope for now
- Transfer limits and durations
- Splitting an Amount across several starting Stops
- Crypto beyond USDT on Polygon
- Conditional Fees (tiers, monthly free quotas)
