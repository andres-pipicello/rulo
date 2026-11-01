# Market Data is kept separate from the Catalog

Exchange Rates and Fees change asynchronously and come from different sources than the Catalog, so they live apart from it and are looked up while a Quote is searched, not stored as properties of Platforms. The Catalog determines which Hops exist; Market Data decides what they deliver.

Each Platform declares, in the Catalog, whether its Fees and whether its Exchange Rates are **seeded** (values listed in the Seed) or **fetched** (from a named origin). There are no layers: a value is one or the other. A check fails the build when a seeded Platform lacks a value one of its Endpoints or Exchange Pairs needs; a free Endpoint is an explicit zero Fee.

A fetched value is unknown until first fetched. Values do not expire; each keeps its provenance (seeded, or fetched with origin and time) for debugging and for showing how recent a Quote's data is. A Hop is considered only when every value it needs is known, so an unknown value is never assumed free. A negative Fee is invalid: rejected when seeded, ignored when fetched.
