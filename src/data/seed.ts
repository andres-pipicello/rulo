import type { z } from "zod";

import type { Catalog } from "@/core/catalog";
import type { Fee, MarketData } from "@/core/market-data";

/** Milestone-1 Catalog. Entries marked "assumed" are unverified against the real Platform. */
export const seedCatalog: z.input<typeof Catalog.schema> = {
  currencies: [
    { symbol: "USD", decimals: 2 },
    { symbol: "ARS", decimals: 2 },
    { symbol: "USDT", decimals: 6 },
  ],
  connections: [
    { id: "ach", currencies: ["USD"] },
    { id: "cbu", currencies: ["ARS", "USD"] },
    { id: "polygon", currencies: ["USDT"] },
    { id: "astropay", currencies: ["USD"] },
    { id: "dollarapp", currencies: ["USD"] },
  ],
  platforms: [
    {
      id: "deel-wallet",
      name: "Deel Wallet",
      currencies: [
        {
          currency: "USD",
          inpoints: [],
          outpoints: [
            { connection: "ach", currency: "USD" },
            { connection: "astropay", currency: "USD" },
            { connection: "dollarapp", currency: "USD" },
            { connection: "cbu", currency: "ARS" },
          ],
        },
        // assumed
        { currency: "ARS", inpoints: [], outpoints: [{ connection: "cbu", currency: "ARS" }] },
      ],
      // assumed
      exchangePairs: [{ source: "USD", target: "ARS" }],
    },
    {
      id: "dollarapp",
      name: "DollarApp",
      currencies: [
        {
          currency: "USD",
          inpoints: [
            { connection: "ach", currency: "USD" },
            { connection: "dollarapp", currency: "USD" },
            // assumed: receives USDT on Polygon, credits USD
            { connection: "polygon", currency: "USDT" },
          ],
          outpoints: [],
        },
        { currency: "ARS", inpoints: [], outpoints: [{ connection: "cbu", currency: "ARS" }] },
      ],
      exchangePairs: [
        { source: "USD", target: "ARS" },
        { source: "ARS", target: "USD" },
      ],
    },
    {
      id: "astropay",
      name: "AstroPay",
      currencies: [
        {
          currency: "USD",
          inpoints: [
            { connection: "ach", currency: "USD" },
            { connection: "astropay", currency: "USD" },
          ],
          outpoints: [{ connection: "cbu", currency: "USD" }],
        },
        { currency: "ARS", inpoints: [], outpoints: [{ connection: "cbu", currency: "ARS" }] },
        // assumed
        {
          currency: "USDT",
          inpoints: [],
          outpoints: [{ connection: "polygon", currency: "USDT" }],
        },
      ],
      exchangePairs: [
        { source: "USD", target: "ARS" },
        { source: "ARS", target: "USD" },
        // assumed
        { source: "USD", target: "USDT" },
        { source: "USDT", target: "USD" },
      ],
    },
    {
      id: "santander-ar",
      name: "Santander Argentina",
      currencies: [
        { currency: "ARS", inpoints: [{ connection: "cbu", currency: "ARS" }], outpoints: [] },
        // assumed
        { currency: "USD", inpoints: [{ connection: "cbu", currency: "USD" }], outpoints: [] },
      ],
      // assumed
      exchangePairs: [
        { source: "USD", target: "ARS" },
        { source: "ARS", target: "USD" },
      ],
    },
  ],
};

const asOf = "2026-10-01T12:00:00Z";

function fee(
  platform: string,
  kind: "outpoint" | "inpoint",
  currency: string,
  [connection, carried]: readonly [string, string],
  fixed = "0",
  proportional = "0",
): z.input<typeof Fee> {
  return {
    platform,
    on: { kind, currency, endpoint: { connection, currency: carried } },
    fixed,
    proportional,
  };
}

/** Illustrative Market Data only: these are NOT real rates or fees. Exchange Rates are effective. */
export const seedMarket: z.input<typeof MarketData.schema> = {
  rates: [
    { platform: "deel-wallet", source: "USD", target: "ARS", rate: "1150", asOf },
    { platform: "dollarapp", source: "USD", target: "ARS", rate: "1194", asOf },
    { platform: "dollarapp", source: "ARS", target: "USD", rate: "0.000796", asOf },
    { platform: "dollarapp", source: "USDT", target: "USD", rate: "0.995", asOf },
    { platform: "astropay", source: "USD", target: "ARS", rate: "1178", asOf },
    { platform: "astropay", source: "ARS", target: "USD", rate: "0.00077", asOf },
    { platform: "astropay", source: "USD", target: "USDT", rate: "0.99", asOf },
    { platform: "astropay", source: "USDT", target: "USD", rate: "0.99", asOf },
    { platform: "santander-ar", source: "USD", target: "ARS", rate: "1100", asOf },
    { platform: "santander-ar", source: "ARS", target: "USD", rate: "0.00075", asOf },
  ],
  fees: [
    fee("deel-wallet", "outpoint", "USD", ["ach", "USD"], "500"),
    fee("deel-wallet", "outpoint", "USD", ["astropay", "USD"], "0", "0.01"),
    fee("deel-wallet", "outpoint", "USD", ["dollarapp", "USD"]),
    fee("deel-wallet", "outpoint", "USD", ["cbu", "ARS"], "0", "0.02"),
    fee("deel-wallet", "outpoint", "ARS", ["cbu", "ARS"]),
    fee("dollarapp", "inpoint", "USD", ["ach", "USD"]),
    fee("dollarapp", "inpoint", "USD", ["dollarapp", "USD"]),
    fee("dollarapp", "inpoint", "USD", ["polygon", "USDT"]),
    fee("dollarapp", "outpoint", "ARS", ["cbu", "ARS"]),
    fee("astropay", "inpoint", "USD", ["ach", "USD"]),
    fee("astropay", "inpoint", "USD", ["astropay", "USD"]),
    fee("astropay", "outpoint", "USD", ["cbu", "USD"], "100"),
    fee("astropay", "outpoint", "ARS", ["cbu", "ARS"]),
    fee("astropay", "outpoint", "USDT", ["polygon", "USDT"], "100000"), // 0.1 USDT gas + withdrawal
    fee("santander-ar", "inpoint", "ARS", ["cbu", "ARS"]),
    fee("santander-ar", "inpoint", "USD", ["cbu", "USD"]),
  ],
};
