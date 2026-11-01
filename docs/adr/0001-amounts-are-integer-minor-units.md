# Amounts are integer Minor Units, held as bigint

Every Amount is a whole number of its Currency's Minor Units, stored as `bigint`. Floating point cannot represent most decimal fractions exactly, and a routing engine that compares Quotes by a few cents must not drift. `bigint` over `number` because Conversion intermediates (Minor Units × rate numerator × 10^decimals) overflow `Number.MAX_SAFE_INTEGER` quickly for ARS-scale Amounts and 6- or 8-decimal Currencies (USDT, BTC).

## Consequences

`bigint` does not serialise to JSON; at every boundary (the Seed, APIs, URL params) Amounts travel as decimal strings and are parsed by the schema.
