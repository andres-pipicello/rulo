import { Amount } from "./amount";
import type { Endpoint } from "./catalog";
import { Catalog } from "./catalog";
import { Currency } from "./currency";
import type { ExchangeRate, Fee, MarketDataResolver } from "./market-data";
import { Rational } from "./rational";
import { Result } from "./result";
import type { SearchUniverse } from "./stop";
import { Stop } from "./stop";

/**
 * A direct move from one Stop to another, as the Catalog allows: through a Connection
 * (`via` is the matched Outpoint/Inpoint Endpoint) or within an Account (`via` is null).
 */
export type Hop = Readonly<{ from: Stop; to: Stop; via: Endpoint | null }>;

/** A Hop taken with a specific Amount. */
export type Leg = Readonly<{
  hop: Hop;
  sent: Amount;
  delivered: Amount;
  fees: readonly Readonly<{ fee: Fee; charged: Amount }>[];
  rates: readonly ExchangeRate[];
}>;

/** The Amount was used up by Fees or rounding. */
export type Insufficient = Readonly<{ kind: "insufficient" }>;

export type Context = Readonly<{ catalog: Catalog; market: MarketDataResolver }>;

/** Hops through a Connection between any two Stops, or within one Account, inside the Search Universe. */
function derive(catalog: Catalog, universe: SearchUniverse): readonly Hop[] {
  const hops: Hop[] = [];
  for (const from of universe) {
    const offer = Catalog.offered(catalog, from);
    if (!offer) continue;
    for (const to of universe) {
      if (Stop.equals(from, to)) continue;
      for (const via of offer.outpoints) {
        const accepts = Catalog.offered(catalog, to)?.inpoints.some(
          (i) => i.connection === via.connection && i.currency === via.currency,
        );
        if (accepts) hops.push({ from, to, via });
      }
      const differentAccounts =
        from.kind === "held" && to.kind === "held" && from.account !== to.account;
      const withinAccount =
        from.platform === to.platform &&
        !differentAccounts &&
        Catalog.platform(catalog, from.platform).exchangePairs.some(
          (p) => p.source === from.currency && p.target === to.currency,
        );
      if (withinAccount) hops.push({ from, to, via: null });
    }
  }
  return hops;
}

type Step =
  | Readonly<{ kind: "fee"; fee: Fee }>
  | Readonly<{ kind: "convert"; rate: ExchangeRate; scaled: Rational }>;

/** A Hop with every Market Data value it needs, in the order they apply. */
export type ResolvedHop = Readonly<{ hop: Hop; steps: readonly Step[] }>;

/**
 * Looks up what taking the Hop costs (see docs/domain-model.md, "Evaluating a Leg").
 * Undefined when any value is unknown: the search then skips the Hop.
 */
async function resolve({ catalog, market }: Context, hop: Hop): Promise<ResolvedHop | undefined> {
  const { from, to, via } = hop;
  const convert = async (
    platform: Stop["platform"],
    source: Currency["symbol"],
    target: Currency["symbol"],
  ) => {
    const rate = await market.rate({ platform, source, target });
    if (!rate) return undefined;
    const scaled = Rational.of(
      rate.rate.num * Currency.scale(Catalog.currency(catalog, target)),
      rate.rate.den * Currency.scale(Catalog.currency(catalog, source)),
    );
    return { kind: "convert" as const, rate, scaled };
  };
  const charge = async (key: Parameters<MarketDataResolver["fee"]>[0]) => {
    const fee = await market.fee(key);
    return fee && { kind: "fee" as const, fee };
  };

  const pending: Promise<Step | undefined>[] = via
    ? [
        charge({
          platform: from.platform,
          on: { kind: "outpoint", currency: from.currency, endpoint: via },
        }),
        ...(via.currency === from.currency
          ? []
          : [convert(from.platform, from.currency, via.currency)]),
        charge({
          platform: to.platform,
          on: { kind: "inpoint", currency: to.currency, endpoint: via },
        }),
        ...(via.currency === to.currency ? [] : [convert(to.platform, via.currency, to.currency)]),
      ]
    : [convert(from.platform, from.currency, to.currency)];
  const steps = await Promise.all(pending);
  return steps.every((s) => s !== undefined) ? { hop, steps } : undefined;
}

/** Fees round up and Conversions round down (ADR 0002); nothing left means the Leg cannot be taken. */
function take({ hop, steps }: ResolvedHop, sent: Amount): Result<Leg, Insufficient> {
  if (sent.currency !== hop.from.currency) {
    throw new TypeError(`Hop from ${hop.from.currency} given ${sent.currency}`);
  }
  const fees: { fee: Fee; charged: Amount }[] = [];
  const rates: ExchangeRate[] = [];
  let current = sent;
  for (const step of steps) {
    switch (step.kind) {
      case "fee": {
        const charged = step.fee.fixed + Rational.ceilMul(current.minor, step.fee.proportional);
        fees.push({ fee: step.fee, charged: Amount.of(current.currency, charged) });
        current = Amount.of(current.currency, current.minor - charged);
        break;
      }
      case "convert":
        rates.push(step.rate);
        current = Amount.of(step.rate.target, Rational.floorMul(current.minor, step.scaled));
        break;
    }
    if (current.minor <= 0n) return Result.err({ kind: "insufficient" });
  }
  return Result.ok({ hop, sent, delivered: current, fees, rates });
}

/** Upper bound when searching for an input; beyond it the target is unreachable. */
const SEARCH_LIMIT = 10n ** 30n;

/**
 * The smallest Amount that, taking this Hop, delivers at least `target`. Taking a Hop is
 * monotonic in the Amount (Fees below 100%, rounding down), so a binary search finds it.
 * Undefined when no Amount up to the search limit is enough.
 */
function minimumSent(resolved: ResolvedHop, target: Amount): Amount | undefined {
  const currency = resolved.hop.from.currency;
  const meets = (minor: bigint) => {
    const leg = take(resolved, Amount.of(currency, minor));
    return leg.ok && leg.value.delivered.minor >= target.minor;
  };
  let low = 0n;
  let high = 1n;
  while (!meets(high)) {
    low = high;
    high *= 2n;
    if (high > SEARCH_LIMIT) return undefined;
  }
  while (high - low > 1n) {
    const middle = (low + high) / 2n;
    if (meets(middle)) high = middle;
    else low = middle;
  }
  return Amount.of(currency, high);
}

export const Hop = { derive, resolve, take, minimumSent };
