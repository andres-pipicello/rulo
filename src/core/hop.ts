import { Amount } from "./amount";
import type { Endpoint, PlatformId } from "./catalog";
import { Catalog } from "./catalog";
import type { CurrencyCode } from "./currency";
import { Currency } from "./currency";
import type { ExchangeRate, FeeTarget } from "./market-data";
import { MarketData } from "./market-data";
import { Rational } from "./rational";
import { Result } from "./result";
import type { SearchUniverse } from "./stop";
import { Stop } from "./stop";

/** A direct way from one Stop to another, as the Catalog allows. */
export type Hop =
  | Readonly<{ kind: "transfer"; from: Stop; to: Stop; via: Endpoint }>
  | Readonly<{ kind: "exchange"; from: Stop; to: Stop }>;

/** A Hop taken with a specific Amount. */
export type Leg = Readonly<{
  hop: Hop;
  sent: Amount;
  delivered: Amount;
  fees: readonly Amount[];
  rates: readonly ExchangeRate[];
}>;

export type Unquotable =
  | Readonly<{
      kind: "missing-rate";
      platform: PlatformId;
      source: CurrencyCode;
      target: CurrencyCode;
    }>
  | Readonly<{ kind: "missing-fee"; platform: PlatformId; on: FeeTarget }>
  | Readonly<{ kind: "insufficient" }>;

export type Context = Readonly<{ catalog: Catalog; market: MarketData }>;

/** Transfers between any two Stops, Exchanges within one Account, restricted to the Search Universe. */
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
        if (accepts) hops.push({ kind: "transfer", from, to, via });
      }
      const differentAccounts =
        from.kind === "held" && to.kind === "held" && from.account !== to.account;
      const exchangeable =
        from.platform === to.platform &&
        !differentAccounts &&
        Catalog.platform(catalog, from.platform).exchangePairs.some(
          (p) => p.source === from.currency && p.target === to.currency,
        );
      if (exchangeable) hops.push({ kind: "exchange", from, to });
    }
  }
  return hops;
}

type Step =
  | Readonly<{ kind: "fee"; platform: PlatformId; on: FeeTarget }>
  | Readonly<{ kind: "convert"; platform: PlatformId; source: CurrencyCode; target: CurrencyCode }>;

/** What taking a Hop does to an Amount, in order (see docs/domain-model.md, "Evaluating a Leg"). */
function steps(hop: Hop): readonly Step[] {
  const { from, to } = hop;
  switch (hop.kind) {
    case "transfer": {
      const { via } = hop;
      const all: Step[] = [
        {
          kind: "fee",
          platform: from.platform,
          on: { kind: "outpoint", currency: from.currency, endpoint: via },
        },
        { kind: "convert", platform: from.platform, source: from.currency, target: via.currency },
        {
          kind: "fee",
          platform: to.platform,
          on: { kind: "inpoint", currency: to.currency, endpoint: via },
        },
        { kind: "convert", platform: to.platform, source: via.currency, target: to.currency },
      ];
      return all.filter((s) => s.kind === "fee" || s.source !== s.target);
    }
    case "exchange":
      return [
        { kind: "convert", platform: from.platform, source: from.currency, target: to.currency },
      ];
  }
}

/** The Market Data a Hop needs that is missing, independent of any Amount. */
function missing({ market }: Context, hop: Hop): readonly Unquotable[] {
  return steps(hop).flatMap((step): Unquotable[] => {
    switch (step.kind) {
      case "fee":
        return MarketData.fee(market, step.platform, step.on)
          ? []
          : [{ kind: "missing-fee", platform: step.platform, on: step.on }];
      case "convert":
        return MarketData.rate(market, step.platform, step.source, step.target)
          ? []
          : [
              {
                kind: "missing-rate",
                platform: step.platform,
                source: step.source,
                target: step.target,
              },
            ];
    }
  });
}

/** Fees round up and conversions round down (ADR 0002); nothing left means the Leg cannot be taken. */
function take(context: Context, hop: Hop, sent: Amount): Result<Leg, Unquotable> {
  if (sent.currency !== hop.from.currency) {
    throw new TypeError(`Hop from ${hop.from.currency} given ${sent.currency}`);
  }
  const fees: Amount[] = [];
  const rates: ExchangeRate[] = [];
  let current = sent;
  for (const step of steps(hop)) {
    switch (step.kind) {
      case "fee": {
        const fee = MarketData.fee(context.market, step.platform, step.on);
        if (!fee) return Result.err({ kind: "missing-fee", platform: step.platform, on: step.on });
        const charged = fee.fixed + Rational.ceilMul(current.minor, fee.proportional);
        fees.push(Amount.of(current.currency, charged));
        current = Amount.of(current.currency, current.minor - charged);
        break;
      }
      case "convert": {
        const found = MarketData.rate(context.market, step.platform, step.source, step.target);
        if (!found)
          return Result.err({
            kind: "missing-rate",
            platform: step.platform,
            source: step.source,
            target: step.target,
          });
        const scaled = Rational.of(
          found.rate.num * Currency.scale(Catalog.currency(context.catalog, step.target)),
          found.rate.den * Currency.scale(Catalog.currency(context.catalog, step.source)),
        );
        rates.push(found);
        current = Amount.of(step.target, Rational.floorMul(current.minor, scaled));
        break;
      }
    }
    if (current.minor <= 0n) return Result.err({ kind: "insufficient" });
  }
  return Result.ok({ hop, sent, delivered: current, fees, rates });
}

export const Hop = { derive, missing, take };
