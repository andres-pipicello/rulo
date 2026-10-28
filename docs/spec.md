# Specification

## Use cases

Use cases listed must be supported by the design

- Deel allows direct transfer from USD balance directly to an ARS balance identified by CBU
- Find the most efficient Route to move money between my existing Accounts
- Find which new Account I should open to save on Fees
- I started working remotely and get paid through Deel: find the best Route to my existing bank
- Either fix how much I send and maximise what arrives, or fix how much must arrive and minimise what I send
- Choose the Search Universe from one screen: include everything, only my own Accounts, or add/remove ad hoc

## Wishlist

Features that are vague and high level. They require further breakdown into Features.

- Renders graphs of the movement of money between platforms
- Calculates the best routes to move money between different cryptocurrencies and platforms
- Uses only public APIs of platforms
- The user should be able to specify source and destination platforms and cryptocurrencies. For example, send USD in the Deel to Santander Bank account in ARS
- Move money from several Balances at once, splitting the Amount across Routes
- Transfer limits (minimum/maximum Amounts) and durations (instant vs days), possibly as a ranking factor
- Graph views are very navigable (e.g. zoom/pan, focus a node and its neighbours, highlight a chosen Route, filter by currency, auto-layout). To be refined before the UI milestone

## Features

List of features that are specific and concrete.
If a feature seems to contradict a wishlist entry, feature takes precedence. It means the wishlist is out of date and should be updated or eliminated.

- Static Catalog page, where the following entities are rendered in a graph
  - Platform Currencies as nodes
  - Platforms as a grouping of theirs currencies
  - Hops as edges (with no Accounts, every Stop is a Platform Currency)
- Platforms page
  - User can search for platforms, click and a popup for the platform shows
- Platform Popup
  - It shows
    - The currencies it supports
    - The Inpoints of the currency
    - The Outpoints of the currency
    - The Exchange Pairs of the platform, with
      - A pivot currency
        - An option to choose action between "Buy" and "Sell"
      - The Exchange Rates of the other currencies in relation to the pivot currency and action
