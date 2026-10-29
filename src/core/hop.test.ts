import fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import { describe, expect, test } from "vitest";
import type { z } from "zod";

import { AccountId } from "./account";
import { Amount } from "./amount";
import { Catalog, PlatformId } from "./catalog";
import { CurrencyCode } from "./currency";
import type { Hop } from "./hop";
import { Hop as Hops } from "./hop";
import type { ExchangeRate } from "./market-data";
import { MarketData } from "./market-data";
import { Rational } from "./rational";
import type { Stop } from "./stop";

const USD = CurrencyCode.parse("USD");
const BTC = CurrencyCode.parse("BTC");
const ARS = CurrencyCode.parse("ARS");
const ex = PlatformId.parse("ex");
const bank = PlatformId.parse("bank");

const catalog = Catalog.schema.parse({
  currencies: [
    { symbol: "USD", decimals: 2 },
    { symbol: "BTC", decimals: 8 },
    { symbol: "ARS", decimals: 2 },
  ],
  connections: [{ id: "cbu", currencies: ["ARS"] }],
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
      fees: { kind: "fixed" },
      rates: { kind: "dynamic", origin: "test" },
    },
    {
      id: "bank",
      name: "Bank",
      currencies: [
        {
          currency: "ARS",
          inpoints: [{ connection: "cbu", currency: "ARS" }],
          outpoints: [{ connection: "cbu", currency: "ARS" }],
        },
        { currency: "USD", inpoints: [], outpoints: [] },
      ],
      exchangePairs: [{ source: "ARS", target: "USD" }],
      fees: { kind: "fixed" },
      rates: { kind: "dynamic", origin: "test" },
    },
  ],
} satisfies z.input<typeof Catalog.schema>);

const fetchedAt = Temporal.Instant.from("2026-10-01T00:00:00Z");
const rate = (source: CurrencyCode, target: CurrencyCode, value: Rational): ExchangeRate => ({
  platform: ex,
  source,
  target,
  rate: value,
  provenance: { kind: "fetched", origin: "test", fetchedAt },
});

/** Exchange buys BTC at `price` USD and sells it at `price` USD. */
const contextAt = (price: bigint) => ({
  catalog,
  market: MarketData.inMemory({
    rates: [rate(USD, BTC, Rational.of(1n, price)), rate(BTC, USD, Rational.of(price, 1n))],
    fees: [],
  }),
});

const prospective = (platform: PlatformId, currency: CurrencyCode): Stop => ({
  kind: "prospective",
  platform,
  currency,
});
const held = (account: string, platform: PlatformId, currency: CurrencyCode): Stop => ({
  kind: "held",
  account: AccountId.parse(account),
  platform,
  currency,
});

const usdToBtc: Hop = { from: prospective(ex, USD), to: prospective(ex, BTC), via: null };
const btcToUsd: Hop = { from: usdToBtc.to, to: usdToBtc.from, via: null };

async function resolved(context: ReturnType<typeof contextAt>, hop: Hop) {
  const result = await Hops.resolve(context, hop);
  if (!result) throw new Error("expected every value to be known");
  return result;
}

describe("Hop.derive", () => {
  test("Hops through a Connection link two Accounts on the same Platform", () => {
    const personal = held("personal", bank, ARS);
    const joint = held("joint", bank, ARS);
    expect(Hops.derive(catalog, [personal, joint])).toEqual([
      { from: personal, to: joint, via: { connection: "cbu", currency: ARS } },
      { from: joint, to: personal, via: { connection: "cbu", currency: ARS } },
    ]);
  });

  test("Hops without a Connection stay within one Account, or reach a prospective Stop", () => {
    const personalArs = held("personal", bank, ARS);
    const jointUsd = held("joint", bank, USD);
    const newUsd = prospective(bank, USD);
    const within = (universe: readonly Stop[]) =>
      Hops.derive(catalog, universe).filter((h) => h.via === null);
    expect(within([personalArs, jointUsd])).toEqual([]);
    expect(within([personalArs, newUsd])).toEqual([{ from: personalArs, to: newUsd, via: null }]);
  });

  test("only Stops in the Search Universe are connected", () => {
    expect(Hops.derive(catalog, [prospective(ex, USD)])).toEqual([]);
  });
});

describe("Hop.take", () => {
  test("converts across different decimal places", async () => {
    // $50,000.00 at 1/50000 BTC per USD = 1 BTC = 100,000,000 sats
    const leg = Hops.take(await resolved(contextAt(50_000n), usdToBtc), Amount.of(USD, 5_000_000n));
    expect(leg.ok && leg.value.delivered).toEqual(Amount.of(BTC, 100_000_000n));
  });

  test("converting there and back at the inverse rate never creates money", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 1n, max: 10n ** 12n }),
        fc.bigInt({ min: 1n, max: 10n ** 6n }),
        async (minor, price) => {
          const context = contextAt(price);
          const there = Hops.take(await resolved(context, usdToBtc), Amount.of(USD, minor));
          if (!there.ok) return;
          const back = Hops.take(await resolved(context, btcToUsd), there.value.delivered);
          if (!back.ok) return;
          expect(back.value.delivered.minor).toBeLessThanOrEqual(minor);
        },
      ),
    );
  });

  test("a Hop with an unknown Exchange Rate cannot be resolved", async () => {
    const context = { catalog, market: MarketData.inMemory({ rates: [], fees: [] }) };
    expect(await Hops.resolve(context, usdToBtc)).toBeUndefined();
  });
});

describe("Hop.minimumSent", () => {
  test("is the smallest Amount that delivers at least the target", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 1n, max: 10n ** 10n }),
        fc.bigInt({ min: 1n, max: 10n ** 6n }),
        async (target, price) => {
          const hop = await resolved(contextAt(price), usdToBtc);
          const sent = Hops.minimumSent(hop, Amount.of(BTC, target));
          if (!sent) throw new Error("unreachable target");
          const enough = Hops.take(hop, sent);
          expect(enough.ok && enough.value.delivered.minor >= target).toBe(true);
          const less = Hops.take(hop, Amount.of(USD, sent.minor - 1n));
          expect(!less.ok || less.value.delivered.minor < target).toBe(true);
        },
      ),
    );
  });
});
