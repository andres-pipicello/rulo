import type { Temporal } from "temporal-polyfill";
import { z } from "zod";

import { MinorUnits } from "./amount";
import type { Catalog } from "./catalog";
import { Endpoint, PlatformId } from "./catalog";
import { CurrencyCode } from "./currency";
import { Rational } from "./rational";

/** Where a value came from. For debugging and for showing how recent a Quote's data is. */
export type Provenance =
  | Readonly<{ kind: "fixed" }>
  | Readonly<{ kind: "fetched"; origin: string; fetchedAt: Temporal.Instant }>;

export type RateKey = Readonly<{
  platform: PlatformId;
  source: CurrencyCode;
  target: CurrencyCode;
}>;

/** The Endpoint a Fee is charged on. `currency` is the Platform Currency it belongs to. */
export const FeeTarget = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("outpoint"), currency: CurrencyCode, endpoint: Endpoint }).readonly(),
  z.object({ kind: z.literal("inpoint"), currency: CurrencyCode, endpoint: Endpoint }).readonly(),
]);
export type FeeTarget = z.infer<typeof FeeTarget>;

export type FeeKey = Readonly<{ platform: PlatformId; on: FeeTarget }>;

const RateValues = z.object({
  platform: PlatformId,
  source: CurrencyCode,
  target: CurrencyCode,
  /** Major units of target per one major unit of source. */
  rate: Rational.schema,
});

const FeeValues = z.object({
  platform: PlatformId,
  on: FeeTarget,
  /** Minor units of the Currency being charged. */
  fixed: MinorUnits.refine((minor) => minor >= 0n, "Fixed fee must not be negative"),
  /** Below 1, so a larger Amount never delivers less. */
  proportional: Rational.schema.refine((r) => r.num < r.den, "Proportional fee must be below 1"),
});

export type ExchangeRate = Readonly<z.infer<typeof RateValues> & { provenance: Provenance }>;
export type Fee = Readonly<z.infer<typeof FeeValues> & { provenance: Provenance }>;

function rateKey(key: RateKey): string {
  return [key.platform, key.source, key.target].join("|");
}

function feeKey({ platform, on }: FeeKey): string {
  return [platform, on.kind, on.currency, on.endpoint.connection, on.endpoint.currency].join("|");
}

/** Known values, as held by a resolver. */
export type MarketDataValues = Readonly<{
  rates: readonly ExchangeRate[];
  fees: readonly Fee[];
}>;

/** The fixed values listed in the seed; parsing marks them as fixed. */
const fixedSchema = z
  .object({ rates: z.array(RateValues), fees: z.array(FeeValues) })
  .superRefine((values, ctx) => {
    const issue = (message: string) => {
      ctx.addIssue({ code: "custom", message });
    };
    const rates = values.rates.map(rateKey);
    const fees = values.fees.map(feeKey);
    for (const [index, key] of rates.entries()) {
      if (rates.indexOf(key) !== index) issue(`Duplicate rate ${key}`);
    }
    for (const [index, key] of fees.entries()) {
      if (fees.indexOf(key) !== index) issue(`Duplicate fee ${key}`);
    }
  })
  .transform((values): MarketDataValues => ({
    rates: values.rates.map((r) => ({ ...r, provenance: { kind: "fixed" } })),
    fees: values.fees.map((f) => ({ ...f, provenance: { kind: "fixed" } })),
  }));

/**
 * Answers the search's questions about Market Data, on demand. Resolves to undefined when a value
 * is unknown (a dynamic value never fetched), in which case the Hop needing it is skipped.
 */
export type MarketDataResolver = Readonly<{
  rate: (key: RateKey) => Promise<ExchangeRate | undefined>;
  fee: (key: FeeKey) => Promise<Fee | undefined>;
}>;

/** A resolver over values already in memory. */
function inMemory(values: MarketDataValues): MarketDataResolver {
  const rates = new Map(values.rates.map((r) => [rateKey(r), r]));
  const fees = new Map(values.fees.map((f) => [feeKey(f), f]));
  return {
    rate: (key) => Promise.resolve(rates.get(rateKey(key))),
    fee: (key) => Promise.resolve(fees.get(feeKey(key))),
  };
}

/** Every Fee the Catalog's Endpoints need. */
function neededFees(catalog: Catalog): readonly FeeKey[] {
  return catalog.platforms.flatMap((platform) =>
    platform.currencies.flatMap(({ currency, inpoints, outpoints }) => [
      ...outpoints.map((endpoint) => ({
        platform: platform.id,
        on: { kind: "outpoint" as const, currency, endpoint },
      })),
      ...inpoints.map((endpoint) => ({
        platform: platform.id,
        on: { kind: "inpoint" as const, currency, endpoint },
      })),
    ]),
  );
}

/** Every Exchange Rate the Catalog needs: its Exchange Pairs and its Endpoints that convert. */
function neededRates(catalog: Catalog): readonly RateKey[] {
  const keys = catalog.platforms.flatMap((platform) => [
    ...platform.exchangePairs.map((pair) => ({ platform: platform.id, ...pair })),
    ...platform.currencies.flatMap(({ currency, inpoints, outpoints }) => [
      ...outpoints
        .filter((e) => e.currency !== currency)
        .map((e) => ({ platform: platform.id, source: currency, target: e.currency })),
      ...inpoints
        .filter((e) => e.currency !== currency)
        .map((e) => ({ platform: platform.id, source: e.currency, target: currency })),
    ]),
  ]);
  return keys.filter((key, index) => keys.findIndex((k) => rateKey(k) === rateKey(key)) === index);
}

/**
 * Mismatches between the Catalog's fixed/dynamic declarations and the fixed values: a fixed
 * Platform missing a value it needs, or a value listed for a Platform declared dynamic.
 * Should always be empty.
 */
function problems(catalog: Catalog, fixed: MarketDataValues): readonly string[] {
  const declared = (platform: PlatformId, of: "fees" | "rates") =>
    catalog.platforms.find((p) => p.id === platform)?.[of].kind;
  const rates = new Set(fixed.rates.map(rateKey));
  const fees = new Set(fixed.fees.map(feeKey));
  return [
    ...neededRates(catalog)
      .filter((k) => declared(k.platform, "rates") === "fixed" && !rates.has(rateKey(k)))
      .map((k) => `Missing fixed rate ${rateKey(k)}`),
    ...neededFees(catalog)
      .filter((k) => declared(k.platform, "fees") === "fixed" && !fees.has(feeKey(k)))
      .map((k) => `Missing fixed fee ${feeKey(k)}`),
    ...fixed.rates
      .filter((r) => declared(r.platform, "rates") !== "fixed")
      .map((r) => `Rate ${rateKey(r)} listed for a Platform whose rates are not fixed`),
    ...fixed.fees
      .filter((f) => declared(f.platform, "fees") !== "fixed")
      .map((f) => `Fee ${feeKey(f)} listed for a Platform whose fees are not fixed`),
  ];
}

export const MarketData = { fixedSchema, inMemory, neededFees, neededRates, problems };
