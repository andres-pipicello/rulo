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
How much of a target Currency one unit of a source Currency buys on a given Platform at a given moment.
_Avoid_: price, quote, ratio

**Fee**:
What a Platform charges on an Outpoint, Inpoint or Exchange Pair, deducted from the Amount moving through it.
_Avoid_: commission, cost, charge

## Platforms

**Platform**:
A service or institution that holds money in one or more Currencies (Deel Wallet, AstroPay, Santander Argentina).
_Avoid_: provider, bank, exchange, wallet

**Platform Currency**:
A Currency as held on a specific Platform (DollarApp USD). The places money can be.
_Avoid_: node, slot, holding

**Connection**:
A way money can travel between Platforms, either a shared payment rail (ACH, CBU) or a Platform's own native link.
_Avoid_: rail, network, channel, method

**Inpoint**:
A way a Platform Currency accepts money: a Connection plus the Currency arriving through it.
_Avoid_: deposit method, entrypoint, endpoint

**Outpoint**:
A way a Platform Currency sends money out: a Connection plus the Currency delivered through it.
_Avoid_: withdrawal method, exitpoint, endpoint

**Exchange Pair**:
A source and target Currency that a Platform converts between, in that direction.
_Avoid_: market, trading pair, symbol

## User state

**Account**:
A user's presence on one Platform.
_Avoid_: wallet, profile, user

**Balance**:
The Amount an Account holds in one Platform Currency.
_Avoid_: funds, position

## Movement

**Route**:
A single directed step that moves money from one Platform Currency to another, by Transfer or Exchange.
_Avoid_: edge, hop, link

**Transfer**:
A Route between two Platforms: an Outpoint of the source matched to an Inpoint of the target over the same Connection.
_Avoid_: payment, withdrawal, deposit

**Exchange**:
A Route within one Platform, converting along one of its Exchange Pairs.
_Avoid_: trade, swap, conversion

**Path**:
An ordered sequence of Routes from a starting Platform Currency to a destination Platform Currency.
_Avoid_: route (for multi-step), chain, itinerary

**Delivered Amount**:
What arrives at the end of a Path for a given starting Amount, after every Exchange Rate and Fee. Paths are ranked by it.
_Avoid_: output, result, net

## Data

**Catalog**:
The static description of Platforms, Currencies, Connections and their Inpoints, Outpoints and Exchange Pairs.
_Avoid_: seed, config, registry

**Market Data**:
The time-varying Exchange Rates and Fees, kept apart from the Catalog and looked up only when a Path is evaluated.
_Avoid_: prices, live data, feeds
