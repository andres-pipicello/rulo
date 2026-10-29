# Exchange Rates are effective, exact rationals; Conversions round in the Platform's favour

An Exchange Rate is the effective rate the Platform gives, with any exchange cost folded in: Exchange Pairs carry no Fees, because Platforms rarely charge for exchanging separately and a spread is indistinguishable from a fee. Buy and sell are the two directions of a pair, not a separate bid/ask.

An Exchange Rate is stored as a rational (`numerator / denominator`, both `bigint`) in major units of target per major unit of source, parsed exactly from its decimal string. A Conversion computes the exact result and rounds the converted Amount **down**; Fees round **up**. Rounding against the user means rulo never promises money a Platform would not deliver, at the cost of under-reporting by at most one Minor unit per Conversion or Fee.

So nothing in rulo creates money: rounding and Fees only ever lose value against the exact Exchange Rates. Rewards (cashback, bonuses) would break this and are not modelled.

## Considered Options

- Decimal library (decimal.js, big.js): exact for decimals but adds a dependency and still needs a rounding policy; rationals are a few lines on top of `bigint`.
- Banker's rounding: unbiased on average, but can overstate a single Quote.
