import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, test } from "vitest";
import type { z } from "zod";

import { Account } from "@/core/account";
import { Amount } from "@/core/amount";
import { Catalog, PlatformId } from "@/core/catalog";
import { CurrencyCode } from "@/core/currency";
import type { ExchangeRate } from "@/core/market-data";
import { MarketData } from "@/core/market-data";
import type { Fixed } from "@/core/quote";
import { Quote } from "@/core/quote";
import { Rational } from "@/core/rational";
import type { Stop } from "@/core/stop";
import { SearchUniverse } from "@/core/stop";

import { catalog, fixedMarketData, rawCatalog, rawFixed } from ".";

const seedCatalog = rawCatalog as z.input<typeof Catalog.schema>;
const seedFixed = rawFixed as z.input<typeof MarketData.fixedSchema>;

describe("seed data", () => {
  test("every fixed Platform lists every value it needs, and only those", () => {
    expect(MarketData.problems(catalog, fixedMarketData)).toEqual([]);
  });

  test("rejects an Outpoint over an unknown Connection", () => {
    const rogue = {
      id: "rogue",
      name: "Rogue",
      currencies: [
        { currency: "USD", inpoints: [], outpoints: [{ connection: "swift", currency: "USD" }] },
      ],
      exchangePairs: [],
      fees: { kind: "fixed" },
      rates: { kind: "fixed" },
    };
    const broken = { ...seedCatalog, platforms: [...seedCatalog.platforms, rogue] };
    expect(Catalog.schema.safeParse(broken).success).toBe(false);
  });

  test("rejects two Fees on the same Outpoint", () => {
    const [fee] = seedFixed.fees;
    expect(
      MarketData.fixedSchema.safeParse({ ...seedFixed, fees: [...seedFixed.fees, fee] }).success,
    ).toBe(false);
  });

  test("rejects a negative Fee", () => {
    const [fee] = seedFixed.fees;
    if (!fee) throw new Error("seed has no fees");
    const negative = { ...fee, fixed: "-1" };
    expect(MarketData.fixedSchema.safeParse({ rates: [], fees: [negative] }).success).toBe(false);
  });

  test("rejects a Balance in a Currency the Platform does not offer", () => {
    const result = Account.listSchema(catalog).safeParse([
      { id: "x", platform: "deel-wallet", balances: [{ currency: "USDT", minor: "0" }] },
    ]);
    expect(result.success).toBe(false);
  });
});

// Illustrative Exchange Rates for the scenarios below, as if just fetched. NOT real rates.
const fetchedAt = Temporal.Instant.from("2026-10-01T12:00:00Z");
const scenarioRates: readonly ExchangeRate[] = (
  [
    ["deel-wallet", "USD", "ARS", "1150"],
    ["dollarapp", "USD", "ARS", "1194"],
    ["dollarapp", "ARS", "USD", "0.000796"],
    ["dollarapp", "USDT", "USDC", "0.999"],
    ["dollarapp", "USD", "USDC", "0.995"],
    ["dollarapp", "USDC", "USD", "0.995"],
    ["astropay", "USD", "ARS", "1178"],
    ["astropay", "ARS", "USD", "0.00077"],
    ["astropay", "USD", "USDT", "0.99"],
    ["astropay", "USDT", "USD", "0.99"],
    ["santander-ar", "USD", "ARS", "1100"],
    ["santander-ar", "ARS", "USD", "0.00075"],
  ] as const
).map(([platform, source, target, rate]) => {
  const parsed = Rational.parseDecimal(rate);
  if (!parsed) throw new Error(`bad rate ${rate}`);
  return {
    platform: PlatformId.parse(platform),
    source: CurrencyCode.parse(source),
    target: CurrencyCode.parse(target),
    rate: parsed,
    provenance: { kind: "fetched", origin: "test", fetchedAt },
  };
});

const market = MarketData.inMemory({ rates: scenarioRates, fees: fixedMarketData.fees });

// A freelancer paid through Deel, banking with Santander.
const accounts = Account.listSchema(catalog).parse([
  { id: "my-deel", platform: "deel-wallet", balances: [{ currency: "USD", minor: "0" }] },
  { id: "my-santander", platform: "santander-ar", balances: [{ currency: "ARS", minor: "0" }] },
]);
const [deel, santander] = SearchUniverse.onlyMine(accounts) as [Stop, Stop];
const USD = deel.currency;
const ARS = santander.currency;

function best(universe: SearchUniverse, fixed: Fixed, maxHops = 4) {
  return Quote.best(catalog, market, { from: deel, to: santander, universe, fixed, maxHops });
}

// Expected values are worked by hand from the scenario rates and the seed's fixed Fees.
describe("Quote.best: paid through Deel, banking with Santander", () => {
  const thousandDollars: Fixed = { side: "sent", amount: Amount.of(USD, 100_000n) };

  test("with only my Accounts, the converting CBU Outpoint is the only Route", async () => {
    const quote = await best(SearchUniverse.onlyMine(accounts), thousandDollars);
    // $1,000 − 2% = $980 × 1150
    expect(quote.ok && quote.value.delivered).toEqual(Amount.of(ARS, 112_700_000n));
  });

  test("with everything, opening DollarApp is best", async () => {
    const quote = await best(SearchUniverse.everything(catalog, accounts), thousandDollars);
    if (!quote.ok) throw new Error(quote.error.kind);
    // $1,000 free to DollarApp × 1194, free CBU out
    expect(quote.value.delivered).toEqual(Amount.of(ARS, 119_400_000n));
    expect(
      quote.value.route.map((h) => `${h.via?.connection ?? "within"} ${h.to.platform}`),
    ).toEqual(["dollarapp dollarapp", "within dollarapp", "cbu santander-ar"]);
    expect(quote.value.route.map((h) => h.to.kind)).toEqual(["prospective", "prospective", "held"]);
    expect(quote.value.repeatsStop).toBe(false);
    expect(quote.value.oldestFetchedAt).toEqual(fetchedAt);
  });

  test("fixing what arrives finds the smallest Amount to send", async () => {
    const fixed: Fixed = { side: "delivered", amount: Amount.of(ARS, 119_400_000n) };
    const quote = await best(SearchUniverse.everything(catalog, accounts), fixed);
    expect(quote.ok && quote.value.sent).toEqual(Amount.of(USD, 100_000n));
  });

  test("the Sent Amount found is the smallest that delivers the target", async () => {
    const universe = SearchUniverse.everything(catalog, accounts);
    await fc.assert(
      fc.asyncProperty(fc.bigInt({ min: 1n, max: 10n ** 10n }), async (target) => {
        const quote = await best(universe, { side: "delivered", amount: Amount.of(ARS, target) });
        if (!quote.ok) throw new Error(quote.error.kind);
        expect(quote.value.delivered.minor).toBeGreaterThanOrEqual(target);
        const less = await Quote.along(
          { catalog, market },
          quote.value.route,
          Amount.of(USD, quote.value.sent.minor - 1n),
        );
        expect(!less || less.delivered.minor < target).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  test("an Amount eaten by Fees has no Quote", async () => {
    const quote = await best(SearchUniverse.onlyMine(accounts), {
      side: "sent",
      amount: Amount.of(USD, 1n),
    });
    expect(quote).toEqual({ ok: false, error: { kind: "no-quote" } });
  });

  test("Exchange Rates never fetched leave no Quote", async () => {
    const unfetched = MarketData.inMemory(fixedMarketData);
    const quote = await Quote.best(catalog, unfetched, {
      from: deel,
      to: santander,
      universe: SearchUniverse.everything(catalog, accounts),
      fixed: thousandDollars,
      maxHops: 4,
    });
    expect(quote).toEqual({ ok: false, error: { kind: "no-quote" } });
  });

  test("maxHops limits Route length", async () => {
    const quote = await best(SearchUniverse.everything(catalog, accounts), thousandDollars, 2);
    // Deel USD → Deel ARS (× 1150) → CBU to Santander
    expect(quote.ok && quote.value.delivered).toEqual(Amount.of(ARS, 115_000_000n));
  });
});

describe("Quote.best: Endpoints that convert", () => {
  test("USDT sent over Polygon arrives at DollarApp as USDC", async () => {
    const universe = SearchUniverse.everything(catalog, []);
    const [astropayUsdt, dollarappUsdc] = ["astropay:USDT", "dollarapp:USDC"].map((key) => {
      const stop = universe.find((s) => `${s.platform}:${s.currency}` === key);
      if (!stop) throw new Error(`no Stop ${key}`);
      return stop;
    }) as [Stop, Stop];
    const quote = await Quote.best(catalog, market, {
      from: astropayUsdt,
      to: dollarappUsdc,
      universe,
      fixed: { side: "sent", amount: Amount.of(astropayUsdt.currency, 100_000_000n) },
      maxHops: 1,
    });
    // 100 USDT − 0.1 USDT Outpoint Fee = 99.9 USDT, × 0.999 at DollarApp = 99.8001 USDC
    expect(quote.ok && quote.value.delivered).toEqual(
      Amount.of(dollarappUsdc.currency, 99_800_100n),
    );
    expect(quote.ok && quote.value.legs[0]?.rates.map((r) => `${r.source}→${r.target}`)).toEqual([
      "USDT→USDC",
    ]);
  });
});
