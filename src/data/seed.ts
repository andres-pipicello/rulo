import type { z } from "zod";

import type { Catalog } from "@/core/catalog";
import type { MarketData } from "@/core/market-data";

/** Milestone-1 Catalog. Entries marked "assumed" are unverified against the real Platform. */
export const seedCatalog: z.input<typeof Catalog.schema> = {
  currencies: [
    { symbol: "USD", decimals: 2 },
    { symbol: "ARS", decimals: 2 },
  ],
  connections: [
    { kind: "rail", id: "ach", currencies: ["USD"] },
    { kind: "rail", id: "cbu", currencies: ["ARS", "USD"] },
    { kind: "native", id: "astropay", platform: "astropay", currencies: ["USD"] },
    { kind: "native", id: "dollarapp", platform: "dollarapp", currencies: ["USD"] },
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
      ],
      exchangePairs: [],
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
      ],
      exchangePairs: [
        { source: "USD", target: "ARS" },
        { source: "ARS", target: "USD" },
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
const free = { fixed: "0", proportional: "0" };

/** Illustrative Market Data only: these are NOT real rates or fees. */
export const seedMarket: z.input<typeof MarketData.schema> = {
  rates: [
    { platform: "deel-wallet", source: "USD", target: "ARS", rate: "1150", asOf },
    { platform: "dollarapp", source: "USD", target: "ARS", rate: "1200", asOf },
    { platform: "dollarapp", source: "ARS", target: "USD", rate: "0.0008", asOf },
    { platform: "astropay", source: "USD", target: "ARS", rate: "1190", asOf },
    { platform: "astropay", source: "ARS", target: "USD", rate: "0.00078", asOf },
    { platform: "santander-ar", source: "USD", target: "ARS", rate: "1100", asOf },
    { platform: "santander-ar", source: "ARS", target: "USD", rate: "0.00075", asOf },
  ],
  fees: [
    {
      platform: "deel-wallet",
      on: { kind: "outpoint", currency: "USD", endpoint: { connection: "ach", currency: "USD" } },
      fixed: "500",
      proportional: "0",
    },
    {
      platform: "deel-wallet",
      on: {
        kind: "outpoint",
        currency: "USD",
        endpoint: { connection: "astropay", currency: "USD" },
      },
      fixed: "0",
      proportional: "0.01",
    },
    {
      platform: "deel-wallet",
      on: {
        kind: "outpoint",
        currency: "USD",
        endpoint: { connection: "dollarapp", currency: "USD" },
      },
      ...free,
    },
    {
      platform: "deel-wallet",
      on: { kind: "outpoint", currency: "USD", endpoint: { connection: "cbu", currency: "ARS" } },
      fixed: "0",
      proportional: "0.02",
    },
    {
      platform: "dollarapp",
      on: { kind: "inpoint", currency: "USD", endpoint: { connection: "ach", currency: "USD" } },
      ...free,
    },
    {
      platform: "dollarapp",
      on: {
        kind: "inpoint",
        currency: "USD",
        endpoint: { connection: "dollarapp", currency: "USD" },
      },
      ...free,
    },
    {
      platform: "dollarapp",
      on: { kind: "outpoint", currency: "ARS", endpoint: { connection: "cbu", currency: "ARS" } },
      ...free,
    },
    {
      platform: "dollarapp",
      on: { kind: "exchange", pair: { source: "USD", target: "ARS" } },
      fixed: "0",
      proportional: "0.005",
    },
    {
      platform: "dollarapp",
      on: { kind: "exchange", pair: { source: "ARS", target: "USD" } },
      fixed: "0",
      proportional: "0.005",
    },
    {
      platform: "astropay",
      on: { kind: "inpoint", currency: "USD", endpoint: { connection: "ach", currency: "USD" } },
      ...free,
    },
    {
      platform: "astropay",
      on: {
        kind: "inpoint",
        currency: "USD",
        endpoint: { connection: "astropay", currency: "USD" },
      },
      ...free,
    },
    {
      platform: "astropay",
      on: { kind: "outpoint", currency: "USD", endpoint: { connection: "cbu", currency: "USD" } },
      fixed: "100",
      proportional: "0",
    },
    {
      platform: "astropay",
      on: { kind: "outpoint", currency: "ARS", endpoint: { connection: "cbu", currency: "ARS" } },
      ...free,
    },
    {
      platform: "astropay",
      on: { kind: "exchange", pair: { source: "USD", target: "ARS" } },
      fixed: "0",
      proportional: "0.01",
    },
    {
      platform: "astropay",
      on: { kind: "exchange", pair: { source: "ARS", target: "USD" } },
      fixed: "0",
      proportional: "0.01",
    },
    {
      platform: "santander-ar",
      on: { kind: "inpoint", currency: "ARS", endpoint: { connection: "cbu", currency: "ARS" } },
      ...free,
    },
    {
      platform: "santander-ar",
      on: { kind: "inpoint", currency: "USD", endpoint: { connection: "cbu", currency: "USD" } },
      ...free,
    },
    {
      platform: "santander-ar",
      on: { kind: "exchange", pair: { source: "USD", target: "ARS" } },
      ...free,
    },
    {
      platform: "santander-ar",
      on: { kind: "exchange", pair: { source: "ARS", target: "USD" } },
      ...free,
    },
  ],
};
