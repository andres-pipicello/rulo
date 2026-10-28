> **Draft.** Detailed shape of the domain until it is fully expressed as types, schemas and tests in `src/core/`; then this file is deleted. Terms are defined in [GLOSSARY.md](../GLOSSARY.md); the reasons behind the shape are in [docs/adr/](adr/).

# Catalog

Static description of what exists, loaded from seed data.

## Currency

- `symbol`: unique code (`USD`, `ARS`, `USDT`, `USDC`, `BTC`)
- `decimals`: number of decimal places of the Minor unit (USD 2, ARS 2, USDT 6, USDC 6, BTC 8)
- Derived: `scale = 10 ^ decimals`

## Connection

- `id`: unique (`ach`, `cbu`, `polygon`, `dollarapp`)
- `currencies`: Currencies it can carry
- Declared explicitly; a Platform's own link is named after the Platform by convention. A stablecoin on two networks is one Currency over two Connections.

## Platform

- `id`, `name`
- `currencies`: the Platform Currencies it offers; for each:
  - `inpoints`, `outpoints`: Endpoints `{ connection, currency }`, where `currency ∈ connection.currencies`
- `exchangePairs`: `{ source, target }`, directional, both Currencies offered by the Platform

## Endpoints that convert

An Endpoint may carry a different Currency from its Platform Currency; the Platform converts at its own Exchange Rate. This needs an Exchange Rate in Market Data, not an Exchange Pair: converting at an Endpoint does not let the user hold the carried Currency there.

- Deel Wallet USD, Outpoint `{ cbu, ARS }`: USD is debited, ARS arrives at the receiving CBU account.
- DollarApp USDC, Inpoint `{ polygon, USDT }`: USDT arrives over Polygon and is credited as USDC.
- DollarApp USDC, Inpoint and Outpoint `{ cbu, USD }`: USD from or to a USD CBU account, converted to or from USDC (DollarApp warns about this Conversion).

# User state

## Account

- `id` (a user may have two Accounts on one Platform, e.g. personal and joint)
- `platform`
- `balances`: one Amount per Currency; the keys declare which Platform Currencies the Account holds (a zero Balance still counts) and must be offered by the Platform

Accounts are user input, never seed data. Example Accounts live in the scenario tests.

## Amount

- `currency`, `minor` (integer Minor units, [ADR 0001](adr/0001-amounts-are-integer-minor-units.md)). Combining Amounts of different Currencies is a bug.

# Search

## Stops and the Search Universe

- **Held Stop**: one per Balance (Account × Currency)
- **Prospective Stop**: one per Platform Currency the user holds in no Account
- **Search Universe**: a set of Stops, built from presets and then edited:
  - _Everything_: every held and prospective Stop
  - _Only mine_: held Stops only
  - add/remove individual Stops
- The starting and destination Stops are always in the Search Universe.
- With no Accounts, every Stop is prospective, so Stops are exactly the Platform Currencies. The static Catalog page shows the Hops of that Search Universe.

## Hops (structure, from the Catalog only)

A Hop from Stop A to Stop B (A ≠ B) exists:

- **through a Connection**: for each Outpoint `o` of A's Platform Currency and Inpoint `i` of B's where `o.connection = i.connection` and `o.currency = i.currency`. Any Platforms, including the same one (personal → joint Santander over CBU).
- **within an Account**: same Platform, an Exchange Pair `A.currency → B.currency`, and not two held Stops of different Accounts.

## Routes

An ordered sequence of Hops from the starting to the destination Stop, within the Search Universe.

## Quotes (evaluation)

A Quote fixes one side and the search finds the best Route for it:

- **Fixed Sent Amount**: the Route with the highest Delivered Amount. The Sent Amount is not capped by the starting Balance; the UI may warn instead.
- **Fixed Delivered Amount**: the Route needing the lowest Sent Amount that still delivers at least the target.
- Ties: fewer Hops, since fewer Platforms means less that can go wrong.
- Only the best Quote is returned. It records the oldest fetch time among the values it used.

The search explores Hops and evaluates them together, asking for Market Data as it goes; a Hop with an unknown value is skipped. Every Leg is monotonic in its Amount (more in never means less out), so the search keeps only the best Amount per Stop. Because rounding and Fees always lose value, revisiting a Stop never pays off, unless Exchange Rates contradict each other across Platforms; such a Quote is flagged as repeating a Stop.

### Evaluating a Leg

Each Leg records the Amount in, the Fees charged, the Exchange Rates applied and the Amount out. A Leg may apply two Conversions (one at each Endpoint).

Through a Connection:

1. Outpoint Fee, in A's Currency
2. Conversion at A's Platform, if the Outpoint carries another Currency
3. Inpoint Fee, in the carried Currency
4. Conversion at B's Platform, if B holds another Currency

Within an Account: one Conversion at the Platform's Exchange Rate. Exchange Pairs carry no Fees; the rate is effective ([ADR 0002](adr/0002-exact-rational-rates-rounding-down.md)).

# Market Data

Kept apart from the Catalog ([ADR 0003](adr/0003-market-data-separate-from-catalog.md)). Each Platform declares its Fees and its Exchange Rates as fixed (listed in the seed) or dynamic (fetched from a named origin, unknown until then).

## Exchange Rate

- `platform`, `source`, `target`, `rate` (exact rational, major target per major source), provenance
- Conversion: `floor(x × rate × target.scale / source.scale)`
- Needed by Exchange Pairs and by Endpoints that convert.

## Fee

- On one Endpoint of a Platform Currency
- `fixed` (Minor units of the charged Currency, ≥ 0) and `proportional` (exact fraction, 0 ≤ p < 1), provenance
- Charged on `x`: `x − fixed − ceil(x × proportional)`; a result ≤ 0 makes the Leg impossible for that Amount.

## Provenance

- `fixed`, or `fetched` with its origin and fetch time. For debugging and for showing how recent a Quote's data is; values never expire.

# Seed data

The Catalog (including each Platform's fixed/dynamic declarations) and the fixed Market Data values live as YAML in `src/data/`; Zod schemas parse them at load. Entries marked `# assumed` need checking against the real Platform. Exchange Rates are dynamic everywhere for now; tests supply the rates their scenarios need.

# Out of scope for now

- Transfer limits and durations
- Splitting an Amount across several starting Stops
- Seeding crypto beyond USDT on Polygon and USDC (supporting it needs no new concepts)
- Conditional Fees (tiers, monthly free quotas)
- Rewards. For example, AstroPay pays 1% of money arriving from Deel, up to USD 60 per calendar month: conditional, capped and periodic.
