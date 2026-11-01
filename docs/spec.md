# Specification

## Use cases

Use cases listed must be supported by the design

- Deel can send directly from a USD Balance to an ARS Balance identified by CBU
- Find the most efficient Route to move money between my existing Accounts
- Find which new Accounts I should open, or Currencies I should enable, to deliver more
- I started working remotely and get paid through Deel: find the best Route to my existing Santander Account
- Either fix how much I send and maximise what arrives, or fix how much must arrive and minimise what I send
- Choose the Search Universe from one screen: include everything, only my own Balances, or add/remove ad hoc
- Each Quote lists the Accounts I would need to open and the Currencies I would need to enable to use it

## Wishlist

Features that are vague and high level. They require further breakdown into Features.

- Renders graphs of the movement of money between Platforms
- Calculates the best Routes to move money between different cryptocurrencies and Platforms
- Uses only public APIs of Platforms
- The user should be able to specify source and destination Platforms and Currencies. For example, send USD in Deel to a Santander Account in ARS
- Move money from several Balances at once, splitting the Amount across Routes
- Hop limits (minimum/maximum Amounts) and durations (instant vs days), possibly as a ranking factor
- Conditional Fees (tiers, monthly free quotas)
- Rewards. For example, AstroPay pays 1% of money arriving from Deel, up to USD 60 per calendar month: conditional, capped and periodic, so they break "nothing creates money" (ADR 0002)
- More crypto in the Seed beyond USDT on Polygon and USDC (supporting it needs no new concepts)
- Graph views are very navigable (e.g. zoom/pan, focus a node and its neighbours, highlight a chosen Route, filter by Currency, auto-layout). To be refined before the UI milestone

## Features

List of features that are specific and concrete.
If a feature seems to contradict a wishlist entry, feature takes precedence. It means the wishlist is out of date and should be updated or eliminated.

- Static Catalog page, where the following entities are rendered in a graph
  - Platform Currencies as nodes
  - Platforms as a grouping of their Currencies
  - Hops as edges (with no Accounts, every Stop is a Platform Currency)
- Platforms page
  - User can search for Platforms, click and a popup for the Platform shows
- Platform Popup
  - It shows
    - The Currencies it offers
    - The Inpoints of each Currency
    - The Outpoints of each Currency
    - The Exchange Pairs of the Platform, with
      - A base Currency the user picks
        - An option to choose action between "Buy" and "Sell"
      - The Exchange Rates of the other Currencies against the base Currency and action
