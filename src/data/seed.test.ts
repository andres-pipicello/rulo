import { describe, expect, test } from "vitest";

import { Amount } from "@/core/amount";
import { Catalog, PlatformId } from "@/core/catalog";
import { CurrencyCode } from "@/core/currency";
import { MarketData } from "@/core/market-data";
import { Path } from "@/core/path";

import { catalog, market } from ".";
import { seedCatalog, seedMarket } from "./seed";

const USD = CurrencyCode.parse("USD");
const ARS = CurrencyCode.parse("ARS");
const deelUsd = { platform: PlatformId.parse("deel-wallet"), currency: USD };
const santanderArs = { platform: PlatformId.parse("santander-ar"), currency: ARS };
const thousandDollars = Amount.of(USD, 100_000n);

describe("seed data", () => {
  test("rejects an Outpoint over an unknown Connection", () => {
    const rogue = {
      id: "rogue",
      name: "Rogue",
      currencies: [
        { currency: "USD", inpoints: [], outpoints: [{ connection: "swift", currency: "USD" }] },
      ],
      exchangePairs: [],
    };
    const broken = { ...seedCatalog, platforms: [...seedCatalog.platforms, rogue] };
    expect(Catalog.schema.safeParse(broken).success).toBe(false);
  });

  test("rejects two Fees on the same target", () => {
    const fee = seedMarket.fees[0];
    if (!fee) throw new Error("seed has no fees");
    expect(
      MarketData.schema.safeParse({ ...seedMarket, fees: [...seedMarket.fees, fee] }).success,
    ).toBe(false);
  });
});

describe("Path.find on the seed", () => {
  // Expected values are worked by hand from the illustrative seed Market Data.
  test("ranks every Deel USD -> Santander ARS Path by Delivered Amount", () => {
    const result = Path.find(catalog, market, {
      from: deelUsd,
      to: santanderArs,
      amount: thousandDollars,
      maxRoutes: 4,
    });
    if (!result.ok) throw new Error(result.error.kind);

    expect(result.value.map((p) => p.delivered.minor)).toEqual([
      119_400_000n, // Deel -dollarapp-> DollarApp USD, Exchange (0.5%) @1200, -cbu-> Santander
      118_802_400n, // same via ACH ($5 fee)
      117_220_950n, // Deel -ach-> AstroPay USD, Exchange (1%) @1190, -cbu-> Santander
      116_631_900n, // same via the AstroPay native link (1% fee)
      112_700_000n, // Deel cross-currency CBU Outpoint (2%) @1150, direct to Santander
      109_340_000n, // Deel -ach-> AstroPay USD -cbu/USD ($1)-> Santander USD, Exchange @1100
      108_790_000n, // same via the AstroPay native link
    ]);
    expect(result.value[0]?.routes.map((r) => r.kind)).toEqual([
      "transfer",
      "exchange",
      "transfer",
    ]);
  });

  test("maxRoutes limits Path length", () => {
    const result = Path.find(catalog, market, {
      from: deelUsd,
      to: santanderArs,
      amount: thousandDollars,
      maxRoutes: 1,
    });
    expect(result.ok && result.value.map((p) => p.delivered.minor)).toEqual([112_700_000n]);
  });

  test("an Amount eaten by Fees finds no Path", () => {
    const result = Path.find(catalog, market, {
      from: deelUsd,
      to: santanderArs,
      amount: Amount.of(USD, 1n),
      maxRoutes: 4,
    });
    expect(result).toEqual({ ok: false, error: { kind: "no-path" } });
  });

  test("a Platform Currency nobody holds is an error value", () => {
    const nowhere = { platform: PlatformId.parse("deel-wallet"), currency: ARS };
    const result = Path.find(catalog, market, {
      from: deelUsd,
      to: nowhere,
      amount: thousandDollars,
      maxRoutes: 4,
    });
    expect(result).toEqual({ ok: false, error: { kind: "not-held", place: nowhere } });
  });
});
