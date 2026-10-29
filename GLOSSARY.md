# rulo

Finding the best way to move money held on one platform, in one currency, to another platform and currency.

## Money

**Currency**:
A unit of value, identified by its symbol (USD, ARS, USDT, BTC), with a fixed smallest indivisible unit.
_Avoid_: coin, asset, token

**Minor unit**:
The smallest indivisible unit of a Currency (a cent, a satoshi). Every Amount is a whole number of these.
_Avoid_: fraction, subunit, decimal

**Amount**:
A quantity of one Currency, expressed as a whole number of Minor units.
_Avoid_: value, sum, money

**Exchange Rate**:
How much of a target Currency one unit of a source Currency effectively buys on a given Platform at a given moment, any exchange cost included. One per direction: the two directions of a pair are the Platform's buy and sell prices.
_Avoid_: price, quote, ratio

**Fee**:
What a Platform charges for sending through an Outpoint or receiving through an Inpoint, deducted from the Amount moving through it.
_Avoid_: commission, cost, charge

## Platforms

**Platform**:
A service or institution that holds money in one or more Currencies (Deel Wallet, AstroPay, Santander Argentina).
_Avoid_: provider, bank, exchange, wallet

**Platform Currency**:
A Currency as held on a specific Platform (DollarApp USD). The places money can be.
_Avoid_: node, slot, holding

**Connection**:
A way money can travel between Stops: a payment rail (ACH, CBU), a blockchain network (Polygon) or a Platform's own link.
_Avoid_: rail, network, channel, method

**Inpoint**:
A way a Platform Currency accepts money: a Connection plus the Currency arriving through it, which may differ from the one credited.
_Avoid_: deposit method, entrypoint, endpoint

**Outpoint**:
A way a Platform Currency sends money out: a Connection plus the Currency delivered through it, which may differ from the one debited.
_Avoid_: withdrawal method, exitpoint, endpoint

**Exchange Pair**:
A source and target Currency that a Platform converts between, in that direction.
_Avoid_: market, trading pair, symbol

## User state

**Account**:
A user's presence on one Platform; its Balances declare which of the Platform's Currencies the user holds there, even at zero.
_Avoid_: wallet, profile, user

**Balance**:
The Amount an Account holds in one Platform Currency.
_Avoid_: funds, position

## Movement

Structure (from the Catalog) comes first; evaluation (with an Amount and Market Data) second.

**Search Universe**:
The Stops a search may pass through, chosen per query.
_Avoid_: availability, scope, filter

**Stop**:
A place money can sit during a search: one of the user's Balances (held) or a Platform Currency they could hold (prospective).
_Avoid_: node, vertex, place, holding

**Hop**:
A direct way to move money from one Stop to another, by Transfer or Exchange, as the Catalog allows.
_Avoid_: edge, link, step

**Transfer**:
A Hop between two Stops, possibly on the same Platform: an Outpoint of the source matched to an Inpoint of the target over the same Connection.
_Avoid_: payment, withdrawal, deposit

**Exchange**:
A Hop between two Currencies of the same Account (Santander ARS → Santander USD), converting along one of the Platform's Exchange Pairs.
_Avoid_: trade, swap, conversion

**Route**:
An ordered sequence of Hops from a starting Stop to a destination Stop. "There is a Route from A to B" means at least one exists.
_Avoid_: path, chain, itinerary

**Leg**:
A Hop taken with a specific Amount: the Amount in, the Fees charged, the Exchange Rate applied and the Amount out.
_Avoid_: step, execution

**Quote**:
A Route taken at a moment with either its Sent Amount or its Delivered Amount fixed: its Legs and both Amounts. Quotes are what get ranked.
_Avoid_: path, priced route, estimate, simulation

**Sent Amount**:
What a Quote takes from its starting Stop.
_Avoid_: input, source amount, cost

**Delivered Amount**:
What a Quote delivers at its destination Stop, after every Exchange Rate and Fee.
_Avoid_: output, result, net

## Data

**Catalog**:
The static description of Platforms, Currencies, Connections and their Inpoints, Outpoints and Exchange Pairs.
_Avoid_: seed, config, registry

**Market Data**:
The time-varying Exchange Rates and Fees, kept apart from the Catalog and looked up only when a Quote is made.
_Avoid_: prices, live data, feeds
