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
import type { MarketData } from "./market-data";
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
    },
  ],
} satisfies z.input<typeof Catalog.schema>);

const asOf = Temporal.Instant.from("2026-10-01T00:00:00Z");

function marketWith(buy: Rational, sell: Rational): MarketData {
  return {
    rates: [
      { platform: ex, source: USD, target: BTC, rate: buy, asOf },
      { platform: ex, source: BTC, target: USD, rate: sell, asOf },
    ],
    fees: [],
  };
}

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

const usdToBtc: Hop = { kind: "exchange", from: prospective(ex, USD), to: prospective(ex, BTC) };
const btcToUsd: Hop = { kind: "exchange", from: usdToBtc.to, to: usdToBtc.from };

describe("Hop.derive", () => {
  test("Transfers connect two Accounts on the same Platform", () => {
    const personal = held("personal", bank, ARS);
    const joint = held("joint", bank, ARS);
    expect(Hops.derive(catalog, [personal, joint])).toEqual([
      { kind: "transfer", from: personal, to: joint, via: { connection: "cbu", currency: ARS } },
      { kind: "transfer", from: joint, to: personal, via: { connection: "cbu", currency: ARS } },
    ]);
  });

  test("Exchanges stay within one Account, or reach a prospective Stop", () => {
    const personalArs = held("personal", bank, ARS);
    const jointUsd = held("joint", bank, USD);
    const newUsd = prospective(bank, USD);
    const exchanges = (universe: readonly Stop[]) =>
      Hops.derive(catalog, universe).filter((h) => h.kind === "exchange");
    expect(exchanges([personalArs, jointUsd])).toEqual([]);
    expect(exchanges([personalArs, newUsd])).toEqual([
      { kind: "exchange", from: personalArs, to: newUsd },
    ]);
  });

  test("only Stops in the Search Universe are connected", () => {
    expect(Hops.derive(catalog, [prospective(ex, USD)])).toEqual([]);
  });
});

describe("Hop.take", () => {
  test("converts across different decimal places", () => {
    // $50,000.00 at 1/50000 BTC per USD = 1 BTC = 100,000,000 sats
    const market = marketWith(Rational.of(1n, 50_000n), Rational.of(50_000n, 1n));
    const leg = Hops.take({ catalog, market }, usdToBtc, Amount.of(USD, 5_000_000n));
    expect(leg.ok && leg.value.delivered).toEqual(Amount.of(BTC, 100_000_000n));
  });

  test("converting there and back at the inverse rate never creates money", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10n ** 12n }),
        fc.bigInt({ min: 1n, max: 10n ** 6n }),
        (minor, price) => {
          const context = {
            catalog,
            market: marketWith(Rational.of(1n, price), Rational.of(price, 1n)),
          };
          const there = Hops.take(context, usdToBtc, Amount.of(USD, minor));
          if (!there.ok) return;
          const back = Hops.take(context, btcToUsd, there.value.delivered);
          if (!back.ok) return;
          expect(back.value.delivered.minor).toBeLessThanOrEqual(minor);
        },
      ),
    );
  });

  test("a missing Exchange Rate is reported before any Amount is involved", () => {
    const market: MarketData = { rates: [], fees: [] };
    expect(Hops.missing({ catalog, market }, usdToBtc)).toMatchObject([{ kind: "missing-rate" }]);
  });
});
