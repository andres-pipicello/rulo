# Exchange Rates are exact rationals; conversions round in the platform's favour

An Exchange Rate is stored as a rational (`numerator / denominator`, both `bigint`) in major units of target per major unit of source, parsed exactly from its decimal string. A conversion computes the exact result and rounds the delivered Amount **down**; Fees round **up**. Rounding against the user means rulo never promises money a Platform would not deliver, at the cost of under-reporting by at most one minor unit per step.

## Considered Options

- Decimal library (decimal.js, big.js): exact for decimals but adds a dependency and still needs a rounding policy; rationals are a few lines on top of `bigint`.
- Banker's rounding: unbiased on average, but can overstate a single Path.
