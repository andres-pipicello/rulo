import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { Account } from "@/core/account";
import { Amount } from "@/core/amount";
import { Catalog } from "@/core/catalog";
import { MarketData } from "@/core/market-data";
import type { Fixed } from "@/core/quote";
import { Quote } from "@/core/quote";
import type { Stop } from "@/core/stop";
import { SearchUniverse } from "@/core/stop";

import type { z } from "zod";

import { catalog, market, rawCatalog, rawMarket } from ".";

const seedCatalog = rawCatalog as z.input<typeof Catalog.schema>;
const seedMarket = rawMarket as z.input<typeof MarketData.schema>;

// A freelancer paid through Deel, banking with Santander.
const accounts = Account.listSchema(catalog).parse([
  { id: "my-deel", platform: "deel-wallet", balances: [{ currency: "USD", minor: "0" }] },
  { id: "my-santander", platform: "santander-ar", balances: [{ currency: "ARS", minor: "0" }] },
]);
const [deel, santander] = SearchUniverse.onlyMine(accounts) as [Stop, Stop];
const USD = deel.currency;
const ARS = santander.currency;

function best(universe: SearchUniverse, fixed: Fixed) {
  return Quote.best(catalog, market, { from: deel, to: santander, universe, fixed, maxHops: 4 });
}

describe("seed data", () => {
  test("every Outpoint and Inpoint has a Fee", () => {
    expect(MarketData.missingFees(catalog, market)).toEqual([]);
  });

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

  test("rejects two Fees on the same Outpoint", () => {
    const [fee] = seedMarket.fees;
    expect(
      MarketData.schema.safeParse({ ...seedMarket, fees: [...seedMarket.fees, fee] }).success,
    ).toBe(false);
  });

  test("rejects a negative Fee", () => {
    const [fee] = seedMarket.fees;
    if (!fee) throw new Error("seed has no fees");
    const negative = { ...fee, fixed: "-1" };
    expect(MarketData.schema.safeParse({ ...seedMarket, fees: [negative] }).success).toBe(false);
  });

  test("rejects a Balance in a Currency the Platform does not offer", () => {
    const result = Account.listSchema(catalog).safeParse([
      { id: "x", platform: "deel-wallet", balances: [{ currency: "USDT", minor: "0" }] },
    ]);
    expect(result.success).toBe(false);
  });
});

// Expected values are worked by hand from the illustrative seed Market Data.
describe("Quote.best: paid through Deel, banking with Santander", () => {
  const thousandDollars: Fixed = { side: "sent", amount: Amount.of(USD, 100_000n) };

  test("with only my Accounts, the cross-currency CBU Outpoint is the only Route", () => {
    const quote = best(SearchUniverse.onlyMine(accounts), thousandDollars);
    // $1,000 − 2% = $980 × 1150
    expect(quote.ok && quote.value.delivered).toEqual(Amount.of(ARS, 112_700_000n));
  });

  test("with everything, opening DollarApp is best", () => {
    const quote = best(SearchUniverse.everything(catalog, accounts), thousandDollars);
    if (!quote.ok) throw new Error(quote.error.kind);
    // $1,000 free to DollarApp × 1194, free CBU out
    expect(quote.value.delivered).toEqual(Amount.of(ARS, 119_400_000n));
    expect(
      quote.value.route.map((h) => `${h.via?.connection ?? "within"} ${h.to.platform}`),
    ).toEqual(["dollarapp dollarapp", "within dollarapp", "cbu santander-ar"]);
    expect(quote.value.route.map((h) => h.to.kind)).toEqual(["prospective", "prospective", "held"]);
  });

  test("fixing what arrives finds the smallest Amount to send", () => {
    const fixed: Fixed = { side: "delivered", amount: Amount.of(ARS, 119_400_000n) };
    const quote = best(SearchUniverse.everything(catalog, accounts), fixed);
    expect(quote.ok && quote.value.sent).toEqual(Amount.of(USD, 100_000n));
  });

  test("the Sent Amount found is the smallest that delivers the target", () => {
    const universe = SearchUniverse.everything(catalog, accounts);
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 10n ** 10n }), (target) => {
        const quote = best(universe, { side: "delivered", amount: Amount.of(ARS, target) });
        if (!quote.ok) throw new Error(quote.error.kind);
        expect(quote.value.delivered.minor).toBeGreaterThanOrEqual(target);
        const less = Quote.make({ catalog, market }, quote.value.route, {
          side: "sent",
          amount: Amount.of(USD, quote.value.sent.minor - 1n),
        });
        expect(!less.ok || less.value.delivered.minor < target).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  test("an Amount eaten by Fees has no Quote", () => {
    const quote = best(SearchUniverse.onlyMine(accounts), {
      side: "sent",
      amount: Amount.of(USD, 1n),
    });
    expect(quote).toMatchObject({ ok: false, error: { kind: "no-quote" } });
  });

  test("maxHops limits Route length", () => {
    const quote = Quote.best(catalog, market, {
      from: deel,
      to: santander,
      universe: SearchUniverse.everything(catalog, accounts),
      fixed: thousandDollars,
      maxHops: 2,
    });
    // Deel USD → Deel ARS (×1150) → CBU to Santander
    expect(quote.ok && quote.value.delivered).toEqual(Amount.of(ARS, 115_000_000n));
  });
});

describe("Quote.best: Endpoints that convert", () => {
  test("USDT sent over Polygon arrives at DollarApp as USDC", () => {
    const universe = SearchUniverse.everything(catalog, []);
    const [astropayUsdt, dollarappUsdc] = ["astropay:USDT", "dollarapp:USDC"].map((key) => {
      const stop = universe.find((s) => `${s.platform}:${s.currency}` === key);
      if (!stop) throw new Error(`no Stop ${key}`);
      return stop;
    }) as [Stop, Stop];
    const quote = Quote.best(catalog, market, {
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
