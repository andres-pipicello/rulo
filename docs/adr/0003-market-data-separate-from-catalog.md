# Market Data is kept separate from the Catalog

Exchange Rates and Fees change asynchronously and come from different sources than the Catalog, so they live in a separate Market Data input passed in when Paths are evaluated, not as properties of Platforms. The Catalog alone determines which Routes exist; Market Data only decides what they deliver.

A Route whose Market Data is missing (no Exchange Rate, or no Fee entry for an Outpoint, Inpoint or Exchange Pair it uses) is unusable, never assumed free. A free step is recorded as an explicit zero Fee.
