# Every Stop is a Balance of one Account, real or prospective

A search runs over Stops that the user may hold and Stops they could hold. These must be the same kind of thing: either all instances (Balances of Accounts) or all types (Platform Currencies). Mixing them breaks the rule that an Exchange happens within one Account: a prospective Platform Currency with no Account let a Route go from one Account into another on the same Platform through two Exchanges (personal USD → Santander ARS → joint EUR), which no Platform performs.

So every Stop is an instance. An existing Account has a held Balance for each Currency it declares and a prospective Balance for each other Currency its Platform offers (a Currency to enable). A Platform where the user has no Account gets one Prospective Account, whose Balances are all prospective (an Account to open). A Hop within an Account joins two Stops of the same Account; moving between Accounts, even on one Platform, needs a Connection. A Quote lists the Accounts to open and Currencies to enable its Route needs.

## Considered Options

- **All types (Stops are Platform Currencies)**: simplest, and the search graph is the same for every user, but it cannot tell two Accounts on one Platform apart and a Quote cannot say which Account to use.
- **Held Stops as instances, prospective Stops as types**: the mix this ADR rules out.
- **A Prospective Account on every Platform, without prospective Balances in existing Accounts**: an existing Account could not use its own Platform's Exchange Pairs into a Currency it does not hold yet, so the common fix (enable the Currency) would never be proposed.

## Consequences

With no Accounts, each Platform has only its Prospective Account, so the Stops are exactly the Platform Currencies and the static Catalog page shows the Hops between them.
