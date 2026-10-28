> **Draft, unreviewed.** Moved verbatim from README.md. It will be corrected through domain grilling, then turned into types, schemas and tests, after which this file is deleted. Domain terms will live in GLOSSARY.md and decisions in docs/adr/.

# Design

## Static Entities
Defined by seed data of the system
### Platforms
#### Properties
- currencies: Map[Currency, Endpoints]
    - Endpoints: is the set of Inpoints and Outpoints the platform support for the currency
        - inpoints: Inpoint*
        - outpoints: Outpoints*
- exchangePairs: ExchangePair*
    - ExchangePairs it supports
#### Examples
- Binance
- Coinbase
- Deel Wallet
- Santander Argentina
- DollarApp
- AstroPay

### Currency
Amounts of currencies are integer multiples of the fraction
#### Properties
- symbol
- decimalPlaces
    - amount of decimal places the minimum fraction of the currency unit has
- denominator
    - derived, calculated as (10 ^ decimalPlaces)
- fraction
    - derived, calculated as 1/denominator
#### Examples
- USD: 2
- USDT: 2
- ARS: 2
- BTC: 8 (satoshis)

### Connection
Connections define the kind of Inpoints and Outpoints that can exist. Every platform implies a connection, for cases when platforms are integrated natively.
Connections define the kind of Inpoints and Outpoints that can exist
#### Properties
- currencies: Currency*
    - the set of currencies the Connection supports
#### Examples
- ACH: for banks in the US
    - USD
- CBU: for banks in Argentina
    - ARS
    - USD

### Inpoint and Outpoint
A pair of Inpoint and Outpoint of the same Connection and Currency form a Route between the related Balances.
Platforms define the endpoints and outpoints their accounts have. Different account, same currency
#### Properties
- connection: Connection

### ExchangePair
Expresses that a source amount can be exchanged to an amount of the target currency, in the implicit context.
Implies a Route from the Balance of source Currency to the Balance of target Currency, of the same Account
#### Properties
- source: Currency
- target: Currency

## Input Entities
Input entities come from user input. It represents the current financial state of the user

### Account
An Account belongs to a Platform
#### Properties
- platform: Platform
    - Owning platform
- balances: Map[Currency, Amount]
    - Balance per currency
    - Keys must be a subset of platform.currencies.keys

### Amount
#### Properties
- currency: Currency
- amount
    - Integer amount of fractions of the currency

### Other entities
- ExchangeRate
    - Has a related ExchangePair
    - Actual, time varying exchange rate between currencies
    - targetAmount is the integer result of sourceAmount * ratio / (source_denominator * target_denominator)
- Routes
    - Routes connect Balances
    - Routes are directional, from sourceBalance to targetBalance
- Paths
    - Example
        - Deel Wallet (USD) -|ACH|-> DollarApp (USD) -|Platform|-> DollarApp (ARS) -|CBU transfer|-> Santander Argentina (ARS)

# Data

## Time Varying Data
Data like
- exchange rates
- fees
  Are considered time varying data. Because they are updated from several sources, and can change asynchronously, they are kept separated from entities, and resolved only when required.

## Seed Data
- Platforms
    - DollarApp
        - Inpoints
            - ACH:USD
        - Outpoints
            - ARS:CBU
    - AstroPay
        - Inpoints
            - USD:ACH
        - Outpoints
            - ARS:CBU
            - USD:CBU
    - Santander Argentina
    - Deel Wallet
        - Inpoints
        - Outpoints
            - ACH
            - AstroPay
            - DollarApp
- Currencies
    - USD
    - ARS
- Connections
    - ACH
        - Supported currencies:
            - USD
    - CBU
        - Supported currencies:
            - ARS
            - USD
- Accounts
    - Deel Wallet
        - Id: deel-wallet

