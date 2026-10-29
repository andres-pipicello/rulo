import { Temporal } from "temporal-polyfill";
import { z } from "zod";

import { MinorUnits } from "./amount";
import type { Catalog } from "./catalog";
import { Endpoint, PlatformId } from "./catalog";
import { CurrencyCode } from "./currency";
import { Rational } from "./rational";

const Instant = z.iso.datetime({ offset: true }).transform((text) => Temporal.Instant.from(text));

export const ExchangeRate = z
  .object({
    platform: PlatformId,
    source: CurrencyCode,
    target: CurrencyCode,
    /** Major units of target per one major unit of source. */
    rate: Rational.schema,
    asOf: Instant,
  })
  .readonly();
export type ExchangeRate = z.infer<typeof ExchangeRate>;

/** The Outpoint or Inpoint a Fee is charged on. `currency` is the Platform Currency it belongs to. */
export const FeeTarget = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("outpoint"), currency: CurrencyCode, endpoint: Endpoint }).readonly(),
  z.object({ kind: z.literal("inpoint"), currency: CurrencyCode, endpoint: Endpoint }).readonly(),
]);
export type FeeTarget = z.infer<typeof FeeTarget>;

export const Fee = z
  .object({
    platform: PlatformId,
    on: FeeTarget,
    /** Minor units of the Currency being charged. */
    fixed: MinorUnits.refine((minor) => minor >= 0n, "Fixed fee must not be negative"),
    /** Below 1, so a larger Amount never delivers less. */
    proportional: Rational.schema.refine((r) => r.num < r.den, "Proportional fee must be below 1"),
  })
  .readonly();
export type Fee = z.infer<typeof Fee>;

function targetKey(platform: PlatformId, on: FeeTarget): string {
  return [platform, on.kind, on.currency, on.endpoint.connection, on.endpoint.currency].join("|");
}

const schema = z
  .object({
    rates: z.array(ExchangeRate).readonly(),
    fees: z.array(Fee).readonly(),
  })
  .readonly()
  .superRefine((market, ctx) => {
    const seen = new Set<string>();
    for (const fee of market.fees) {
      const key = targetKey(fee.platform, fee.on);
      if (seen.has(key)) ctx.addIssue({ code: "custom", message: `Duplicate fee ${key}` });
      seen.add(key);
    }
  });

export type MarketData = z.infer<typeof schema>;

/** The most recent Exchange Rate for a pair on a Platform. */
function rate(
  market: MarketData,
  platform: PlatformId,
  source: CurrencyCode,
  target: CurrencyCode,
): ExchangeRate | undefined {
  return market.rates
    .filter((r) => r.platform === platform && r.source === source && r.target === target)
    .reduce<ExchangeRate | undefined>(
      (latest, r) =>
        latest === undefined || Temporal.Instant.compare(r.asOf, latest.asOf) > 0 ? r : latest,
      undefined,
    );
}

function fee(market: MarketData, platform: PlatformId, on: FeeTarget): Fee | undefined {
  const key = targetKey(platform, on);
  return market.fees.find((f) => targetKey(f.platform, f.on) === key);
}

/** Every Outpoint and Inpoint in the Catalog without a Fee entry. Should always be empty. */
function missingFees(
  catalog: Catalog,
  market: MarketData,
): readonly Readonly<{ platform: PlatformId; on: FeeTarget }>[] {
  return catalog.platforms.flatMap((platform) =>
    platform.currencies.flatMap(({ currency, inpoints, outpoints }) =>
      [
        ...outpoints.map((endpoint) => ({ kind: "outpoint" as const, currency, endpoint })),
        ...inpoints.map((endpoint) => ({ kind: "inpoint" as const, currency, endpoint })),
      ]
        .filter((on) => !fee(market, platform.id, on))
        .map((on) => ({ platform: platform.id, on })),
    ),
  );
}

export const MarketData = { schema, rate, fee, missingFees };
