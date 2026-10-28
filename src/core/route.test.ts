import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import type { z } from "zod";
import { describe, expect, test } from "vitest";

import { Amount } from "./amount";
import { Catalog, PlatformId } from "./catalog";
import { CurrencyCode } from "./currency";
import { MarketData } from "./market-data";
import { Rational } from "./rational";
import { Route } from "./route";

const USD = CurrencyCode.parse("USD");
const BTC = CurrencyCode.parse("BTC");
const ex = PlatformId.parse("ex");

const catalog = Catalog.schema.parse({
  currencies: [
    { symbol: "USD", decimals: 2 },
    { symbol: "BTC", decimals: 8 },
  ],
  connections: [],
  platforms: [
    {
      id: "ex",
      name: "Exchange",
      currencies: [
        { currency: "USD", inpoints: [], outpoints: [] },
        { currency: "BTC", inpoints: [], outpoints: [] },
      ],
      exchangePairs: [
        { source: "USD", target: "BTC" },
        { source: "BTC", target: "USD" },
      ],
    },
  ],
} satisfies z.input<typeof Catalog.schema>);

const asOf = Temporal.Instant.from("2026-10-01T00:00:00Z");
const pairs = [
  { source: USD, target: BTC },
  { source: BTC, target: USD },
] as const;

function marketWith(
  buy: Rational,
  sell: Rational,
  proportional: Rational = Rational.zero,
): MarketData {
  return {
    rates: [
      { platform: ex, ...pairs[0], rate: buy, asOf },
      { platform: ex, ...pairs[1], rate: sell, asOf },
    ],
    fees: pairs.map((pair) => ({
      platform: ex,
      on: { kind: "exchange", pair },
      fixed: 0n,
      proportional,
    })),
  };
}

const usdToBtc = {
  kind: "exchange",
  from: { platform: ex, currency: USD },
  to: { platform: ex, currency: BTC },
} as const;
const btcToUsd = { kind: "exchange", from: usdToBtc.to, to: usdToBtc.from } as const;

describe("Route.derive", () => {
  test("an Exchange exists per Exchange Pair between held Currencies", () => {
    expect(Route.derive(catalog)).toEqual([usdToBtc, btcToUsd]);
  });
});

describe("Route.evaluate", () => {
  test("converts across different decimal places", () => {
    // $50,000.00 at 1/50000 BTC per USD = 1 BTC = 100,000,000 sats
    const market = marketWith(Rational.of(1n, 50_000n), Rational.of(50_000n, 1n));
    const result = Route.evaluate({ catalog, market }, usdToBtc, Amount.of(USD, 5_000_000n));
    expect(result).toEqual({ ok: true, value: Amount.of(BTC, 100_000_000n) });
  });

  test("converting there and back at the inverse rate never creates money", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10n ** 12n }),
        fc.bigInt({ min: 1n, max: 10n ** 6n }),
        fc.constantFrom(Rational.zero, Rational.of(1n, 1000n), Rational.of(1n, 100n)),
        (minor, price, fee) => {
          const context = {
            catalog,
            market: marketWith(Rational.of(1n, price), Rational.of(price, 1n), fee),
          };
          const there = Route.evaluate(context, usdToBtc, Amount.of(USD, minor));
          if (!there.ok) return;
          const back = Route.evaluate(context, btcToUsd, there.value);
          if (!back.ok) return;
          expect(back.value.minor).toBeLessThanOrEqual(minor);
        },
      ),
    );
  });

  test("a missing Fee makes the Route unusable", () => {
    const market = MarketData.schema.parse({
      rates: [
        { platform: "ex", source: "USD", target: "BTC", rate: "1", asOf: "2026-10-01T00:00:00Z" },
      ],
      fees: [],
    });
    const result = Route.evaluate({ catalog, market }, usdToBtc, Amount.of(USD, 100n));
    expect(result).toMatchObject({ ok: false, error: { kind: "missing-fee" } });
  });

  test("a missing Exchange Rate makes the Route unusable", () => {
    const market = MarketData.schema.parse({
      rates: [],
      fees: [
        {
          platform: "ex",
          on: { kind: "exchange", pair: { source: "USD", target: "BTC" } },
          fixed: "0",
          proportional: "0",
        },
      ],
    });
    const result = Route.evaluate({ catalog, market }, usdToBtc, Amount.of(USD, 100n));
    expect(result).toMatchObject({ ok: false, error: { kind: "missing-rate" } });
  });
});
