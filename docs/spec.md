# Specification

## Use cases
Use cases listed must be supported by the design
- Deel allows direct transfer from USD balance directly to an ARS balance identified by CBU

## Wishlist
Features that are vague and high level. They require further breakdown into Features.
- Renders graphs of the movement of money between platforms
- Calculates the best routes to move money between different cryptocurrencies and platforms
- Uses only public APIs of platforms
- The user should be able to specify source and destination platforms and cryptocurrencies. For example, send USD in the Deel to Santander Bank account in ARS
- Graph views are very navigable (e.g. zoom/pan, focus a node and its neighbours, highlight a chosen path, filter by currency, auto-layout). To be refined before the UI milestone

## Features
List of features that are specific and concrete.
If a feature seems to contradict a wishlist entry, feature takes precedence. It means the wishlist is out of date and should be updated or eliminated.
- Static Catalog page, where the following entities are rendered in a graph
    - Platform Currencies as nodes
    - Platforms as a grouping of theirs currencies
    - Routes(routes are usually between balances of accounts, here they are between currencies of platforms) as edges
- Platforms page
    - User can search for platforms, click and a popup for the platform shows
- Platform Popup
    - It shows
        - The currencies it supports
        - The inpoints of the currency
        - The outpoints of the currency
        - The ExchangePairs of the platform, with
            - A pivot currency
                - An option to choose action between "Buy" and "Sell"
            - The prices of the other currencies in relation to the pivot currency and action

