import { Amount } from "./amount";
import type { Endpoint, ExchangePair, PlatformCurrency, PlatformId } from "./catalog";
import { Catalog } from "./catalog";
import type { CurrencyCode } from "./currency";
import { Currency } from "./currency";
import type { Fee, FeeTarget } from "./market-data";
import { MarketData } from "./market-data";
import { Rational } from "./rational";
import { Result } from "./result";

export type Route =
  | Readonly<{ kind: "transfer"; from: PlatformCurrency; to: PlatformCurrency; via: Endpoint }>
  | Readonly<{ kind: "exchange"; from: PlatformCurrency; to: PlatformCurrency }>;

export type Unusable =
  | Readonly<{
      kind: "missing-rate";
      platform: PlatformId;
      source: CurrencyCode;
      target: CurrencyCode;
    }>
  | Readonly<{ kind: "missing-fee"; platform: PlatformId; on: FeeTarget }>
  | Readonly<{ kind: "consumed-by-fees" }>;

/** Every Route the Catalog implies (Transfers between Platforms, Exchanges within one). */
function derive(catalog: Catalog): readonly Route[] {
  const routes: Route[] = [];
  for (const source of catalog.platforms) {
    for (const held of source.currencies) {
      const from = { platform: source.id, currency: held.currency };
      for (const outpoint of held.outpoints) {
        for (const target of catalog.platforms) {
          if (target.id === source.id) continue;
          for (const arriving of target.currencies) {
            const matches = arriving.inpoints.some(
              (i) => i.connection === outpoint.connection && i.currency === outpoint.currency,
            );
            if (matches) {
              routes.push({
                kind: "transfer",
                from,
                to: { platform: target.id, currency: arriving.currency },
                via: outpoint,
              });
            }
          }
        }
      }
    }
    for (const pair of source.exchangePairs) {
      const from = { platform: source.id, currency: pair.source };
      const to = { platform: source.id, currency: pair.target };
      if (Catalog.holds(catalog, from) && Catalog.holds(catalog, to)) {
        routes.push({ kind: "exchange", from, to });
      }
    }
  }
  return routes;
}

type Context = Readonly<{ catalog: Catalog; market: MarketData }>;

function charge(
  { market }: Context,
  minor: bigint,
  platform: PlatformId,
  on: FeeTarget,
): Result<bigint, Unusable> {
  const fee: Fee | undefined = MarketData.fee(market, platform, on);
  if (!fee) return Result.err({ kind: "missing-fee", platform, on });
  const remaining = minor - fee.fixed - Rational.ceilMul(minor, fee.proportional);
  return remaining > 0n ? Result.ok(remaining) : Result.err({ kind: "consumed-by-fees" });
}

function convert(
  { catalog, market }: Context,
  minor: bigint,
  platform: PlatformId,
  pair: ExchangePair,
): Result<bigint, Unusable> {
  if (pair.source === pair.target) return Result.ok(minor);
  const found = MarketData.rate(market, platform, pair.source, pair.target);
  if (!found) return Result.err({ kind: "missing-rate", platform, ...pair });
  const scale = Rational.of(
    found.rate.num * Currency.scale(Catalog.currency(catalog, pair.target)),
    found.rate.den * Currency.scale(Catalog.currency(catalog, pair.source)),
  );
  const converted = Rational.floorMul(minor, scale);
  return converted > 0n ? Result.ok(converted) : Result.err({ kind: "consumed-by-fees" });
}

type Step = (minor: bigint) => Result<bigint, Unusable>;

function pipe(minor: bigint, steps: readonly Step[]): Result<bigint, Unusable> {
  return steps.reduce<Result<bigint, Unusable>>(
    (result, step) => (result.ok ? step(result.value) : result),
    Result.ok(minor),
  );
}

/** What arrives at `route.to` when `amount` (in `route.from`'s Currency) takes the Route. */
function evaluate(context: Context, route: Route, amount: Amount): Result<Amount, Unusable> {
  if (amount.currency !== route.from.currency) {
    throw new TypeError(`Route from ${route.from.currency} given ${amount.currency}`);
  }
  const { from, to } = route;
  let steps: readonly Step[];
  switch (route.kind) {
    case "transfer": {
      const { via } = route;
      steps = [
        (x) =>
          charge(context, x, from.platform, {
            kind: "outpoint",
            currency: from.currency,
            endpoint: via,
          }),
        (x) => convert(context, x, from.platform, { source: from.currency, target: via.currency }),
        (x) =>
          charge(context, x, to.platform, {
            kind: "inpoint",
            currency: to.currency,
            endpoint: via,
          }),
        (x) => convert(context, x, to.platform, { source: via.currency, target: to.currency }),
      ];
      break;
    }
    case "exchange": {
      const pair = { source: from.currency, target: to.currency };
      steps = [
        (x) => charge(context, x, from.platform, { kind: "exchange", pair }),
        (x) => convert(context, x, from.platform, pair),
      ];
      break;
    }
  }
  const delivered = pipe(amount.minor, steps);
  return delivered.ok ? Result.ok(Amount.of(to.currency, delivered.value)) : delivered;
}

export const Route = { derive, evaluate };
