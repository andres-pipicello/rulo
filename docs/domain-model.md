> **Draft.** Detailed shape of the domain until it is expressed as types, schemas and tests in `src/core/`; then this file is deleted. Terms are defined in [GLOSSARY.md](../GLOSSARY.md); the reasons behind the shape are in [docs/adr/](adr/).

# Catalog

Static description of the world, loaded from seed data.

## Currency
- `symbol`: unique code (`USD`, `ARS`, `USDT`, `BTC`)
- `decimals`: number of decimal places of the Minor unit
  - USD 2, ARS 2, USDT 6, BTC 8
- Derived: `scale = 10 ^ decimals` (Minor units per major unit)

## Connection
- `id`: unique (`ach`, `cbu`, or a Platform id for native links)
- `kind`: `rail` (shared payment network) or `native` (a Platform's own link, `platform` names it)
- `currencies`: Currencies the Connection can carry
  - ACH: USD
  - CBU: ARS, USD
- Every Platform implies a native Connection with the Platform's id.

## Platform
- `id`, `name`
- `currencies`: the Platform Currencies it holds; for each Currency:
  - `inpoints`: Inpoint*
  - `outpoints`: Outpoint*
- `exchangePairs`: Exchange Pair*

## Inpoint / Outpoint
Belongs to one Platform Currency.
- `connection`: Connection id
- `currency`: the Currency travelling over the Connection. Usually the Platform Currency's own; when different, the Platform converts at its Exchange Rate for that pair.
- Invariant: `currency ∈ connection.currencies`.

Example: Deel Wallet's USD has Outpoint `{ connection: cbu, currency: ARS }`: USD is debited and ARS is delivered over CBU, converted at Deel's USD→ARS rate (the Deel use case in the spec).

## Exchange Pair
- `source`, `target`: Currencies. Directional: USD→ARS and ARS→USD are two pairs (sell vs buy).
- An Exchange Route needs both Currencies held by the Platform; a pair used only by a cross-currency Outpoint/Inpoint does not.

# Routes and Paths

Routes are derived from the Catalog, never declared.

- **Transfer** from Platform Currency A to B (different Platforms) exists for each Outpoint `o` of A and Inpoint `i` of B where `o.connection = i.connection` and `o.currency = i.currency`.
- **Exchange** from A to B (same Platform) exists for each Exchange Pair `A.currency → B.currency`.
- A **Path** is a sequence of Routes where each Route starts where the previous one ended, visiting no Platform Currency twice.

Example: Deel Wallet USD -[Transfer: ach/USD]-> DollarApp USD -[Exchange]-> DollarApp ARS -[Transfer: cbu/ARS]-> Santander Argentina ARS

# Market Data

Time-varying, resolved only when evaluating Paths ([ADR 0003](adr/0003-market-data-separate-from-catalog.md)).

## Exchange Rate
- `platform`, `source`, `target`
- `rate`: exact rational, major units of target per one major unit of source
- `asOf`: instant the rate was observed

Converting `x` Minor units of source: `floor(x × rate × target.scale / source.scale)` ([ADR 0002](adr/0002-exact-rational-rates-rounding-down.md)).

## Fee
- Attached to one Outpoint, Inpoint or Exchange Pair of a Platform
- `fixed`: Minor units of the Currency being charged
- `proportional`: exact rational fraction (e.g. 1/100 for 1%)
- Charged on the incoming Amount `x`: `x − fixed − ceil(x × proportional)`. A result ≤ 0 makes the Route unusable for that Amount.

## Evaluating a Route
1. Transfer: Outpoint Fee, in the source Platform Currency's Currency
2. Conversion, if the Currency changes (Exchange, or a cross-currency Outpoint/Inpoint)
3. Transfer: Inpoint Fee, in the arriving Currency

An Exchange charges its Exchange Pair Fee before converting.

# User state

## Account
- `platform`
- `balances`: Amount per Currency; keys ⊆ the Platform's Currencies

## Amount
- `currency`
- `minor`: integer number of Minor units ([ADR 0001](adr/0001-amounts-are-integer-minor-units.md))
- Adding or comparing Amounts of different Currencies is a bug.

# Seed data (milestone 1)

Values marked _(assumed)_ are placeholders until checked against the real Platform.

- Currencies: USD (2), ARS (2)
- Connections: `ach` (USD), `cbu` (ARS, USD), native `astropay` (USD), `dollarapp` (USD)
- Platforms
  - Deel Wallet: USD
    - USD Outpoints: `ach/USD`, `astropay/USD`, `dollarapp/USD`, `cbu/ARS` (cross-currency)
  - DollarApp: USD, ARS
    - USD Inpoints: `ach/USD`, `dollarapp/USD`
    - ARS Outpoints: `cbu/ARS`
    - Exchange Pairs: USD→ARS, ARS→USD
  - AstroPay: USD, ARS
    - USD Inpoints: `ach/USD`, `astropay/USD`
    - USD Outpoints: `cbu/USD`
    - ARS Outpoints: `cbu/ARS`
    - Exchange Pairs: USD→ARS, ARS→USD
  - Santander Argentina: ARS, USD _(assumed)_
    - ARS Inpoints: `cbu/ARS`; USD Inpoints: `cbu/USD` _(assumed)_
    - Exchange Pairs: USD→ARS, ARS→USD _(assumed)_
- Market Data: illustrative rates and Fees only, clearly marked as non-real

# Open questions

1. **Account vs Platform Currency in Paths.** Paths run between Platform Currencies (catalog view). Should evaluating a Path require the user to hold an Account on every intermediate Platform, and should Balances constrain the starting Amount?
2. **Rate direction and spread.** Is one directional Exchange Rate per pair enough, or do we need explicit bid/ask (the Platform Popup's Buy/Sell toggle)?
3. **Limits.** Minimum and maximum Amounts per Outpoint/Inpoint (common on CBU and ACH) are not modelled.
4. **Time.** Transfers take different times (instant vs T+1). Should duration be part of ranking?
5. **Crypto.** Binance, Coinbase, USDT and BTC are in the spec examples but not in the seed; networks (TRC20, ERC20) would be Connections. Confirm before adding.
6. **Native Connection currencies.** Does a native link carry every Currency both Platforms hold, or must it be listed per Platform?
