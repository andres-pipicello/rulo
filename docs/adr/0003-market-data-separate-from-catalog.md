# Market Data is kept separate from the Catalog

Exchange Rates and Fees change asynchronously and come from different sources than the Catalog, so they live in a separate Market Data input passed in when Quotes are made, not as properties of Platforms. The Catalog alone determines which Hops and Routes exist; Market Data only decides what a Quote delivers.

A Hop whose Market Data is missing (no Exchange Rate, or no Fee entry for an Outpoint or Inpoint it uses) cannot be quoted, never assumed free. A free step is recorded as an explicit zero Fee.
