# Market Data is kept separate from the Catalog

Exchange Rates and Fees change asynchronously and come from different sources than the Catalog, so they live in a separate Market Data input passed in when Quotes are made, not as properties of Platforms. The Catalog alone determines which Hops and Routes exist; Market Data only decides what a Quote delivers.

Missing Market Data is never assumed free, and is handled in two layers:

- **Curated seed data** must be complete: a check fails the build when any Endpoint lacks a Fee entry. A free Endpoint is recorded with an explicit zero Fee, and an Endpoint whose Fees nobody has researched does not belong in the Catalog yet.
- **At runtime**, for any Market Data source, a Hop missing an Exchange Rate or Fee it needs cannot be quoted.

A negative Fee is invalid: rejected when seeded, ignored when it comes from external data.
