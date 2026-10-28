# Amounts are integer minor units, held as bigint

Every Amount is a whole number of its Currency's minor units, stored as `bigint`. Floating point cannot represent most decimal fractions exactly, and a routing engine that compares Paths by a few cents must not drift. `bigint` over `number` because conversion intermediates (minor units × rate numerator × 10^decimals) overflow `Number.MAX_SAFE_INTEGER` quickly for ARS-scale amounts and 8-decimal currencies.

## Consequences

`bigint` does not serialise to JSON; at every boundary (seed files, APIs, URL params) amounts travel as decimal strings and are parsed by the schema.
