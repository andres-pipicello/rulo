import { Temporal } from "temporal-polyfill";
import { describe, expect, test } from "vitest";
import type { z } from "zod";

import { Amount } from "./amount";
import { Catalog } from "./catalog";
import type { ExchangeRate, Fee } from "./market-data";
import { MarketData } from "./market-data";
import { Quote } from "./quote";
import { Rational } from "./rational";
import { SearchUniverse } from "./stop";

const fetchedAt = Temporal.Instant.from("2026-10-01T00:00:00Z");
const provenance = { kind: "fetched", origin: "test", fetchedAt } as const;

const endpoint = (connection: string) => ({ connection, currency: "USD" });
const platform = (id: string, inpoints: string[], outpoints: string[]) => ({
  id,
  name: id,
  currencies: [
    {
      currency: "USD",
      inpoints: inpoints.map(endpoint),
      outpoints: outpoints.map(endpoint),
    },
    { currency: "BTC", inpoints: [], outpoints: [] },
  ],
  exchangePairs: [
    { source: "USD", target: "BTC" },
    { source: "BTC", target: "USD" },
  ],
  fees: { kind: "fixed" } as const,
  rates: { kind: "dynamic", origin: "test" } as const,
});

// a → c directly over "direct", or a → b → c over "x" then "y"; every Fee free.
const catalog = Catalog.schema.parse({
  currencies: [
    { symbol: "USD", decimals: 2 },
    { symbol: "BTC", decimals: 8 },
  ],
  connections: ["direct", "x", "y"].map((id) => ({ id, currencies: ["USD"] })),
  platforms: [
    platform("a", [], ["direct", "x"]),
    platform("b", ["x"], ["y"]),
    platform("c", ["direct", "y"], []),
  ],
} satisfies z.input<typeof Catalog.schema>);

const freeFees: readonly Fee[] = MarketData.neededFees(catalog).map((key) => ({
  ...key,
  fixed: 0n,
  proportional: Rational.zero,
  provenance,
}));

const rates = (buy: Rational, sell: Rational): readonly ExchangeRate[] =>
  catalog.platforms.flatMap((p) => {
    const [usd, btc] = p.currencies.map((c) => c.currency) as [
      ExchangeRate["source"],
      ExchangeRate["source"],
    ];
    return [
      { platform: p.id, source: usd, target: btc, rate: buy, provenance },
      { platform: p.id, source: btc, target: usd, rate: sell, provenance },
    ];
  });

const universe = SearchUniverse.everything(catalog, []);
const stop = (platformId: string, currency: string) => {
  const found = universe.find((s) => s.platform === platformId && s.currency === currency);
  if (!found) throw new Error(`no Stop ${platformId} ${currency}`);
  return found;
};

describe("Quote.best", () => {
  test("ties go to the Route with fewer Hops", async () => {
    const market = MarketData.inMemory({
      rates: rates(Rational.of(1n, 50_000n), Rational.of(50_000n, 1n)),
      fees: freeFees,
    });
    const from = stop("a", "USD");
    const quote = await Quote.best(catalog, market, {
      from,
      to: stop("c", "USD"),
      universe,
      fixed: { side: "sent", amount: Amount.of(from.currency, 10_000n) },
      maxHops: 4,
    });
    expect(quote.ok && quote.value.route.map((h) => h.via?.connection)).toEqual(["direct"]);
  });

  test("a money-gaining loop from contradictory Exchange Rates is flagged", async () => {
    // Buy BTC at 50,000 USD, sell it at 60,000 USD: every USD → BTC → USD loop gains 20%.
    const market = MarketData.inMemory({
      rates: rates(Rational.of(1n, 50_000n), Rational.of(60_000n, 1n)),
      fees: freeFees,
    });
    const from = stop("a", "USD");
    const quote = await Quote.best(catalog, market, {
      from,
      to: stop("a", "BTC"),
      universe,
      fixed: { side: "sent", amount: Amount.of(from.currency, 5_000_000n) },
      maxHops: 3,
    });
    if (!quote.ok) throw new Error(quote.error.kind);
    expect(quote.value.route).toHaveLength(3);
    expect(quote.value.repeatsStop).toBe(true);
  });

  test("records the oldest fetch among the values it used", async () => {
    const older = Temporal.Instant.from("2026-09-01T00:00:00Z");
    const [first, ...rest] = rates(Rational.of(1n, 50_000n), Rational.of(50_000n, 1n));
    if (!first) throw new Error("no rates");
    const market = MarketData.inMemory({
      rates: [{ ...first, provenance: { ...provenance, fetchedAt: older } }, ...rest],
      fees: freeFees,
    });
    const from = stop(first.platform, first.source);
    const quote = await Quote.best(catalog, market, {
      from,
      to: stop(first.platform, first.target),
      universe,
      fixed: { side: "sent", amount: Amount.of(from.currency, 5_000_000n) },
      maxHops: 1,
    });
    expect(quote.ok && quote.value.oldestFetchedAt).toEqual(older);
  });
});
