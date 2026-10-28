import { Amount } from "./amount";
import { Catalog, PlatformCurrency } from "./catalog";
import type { MarketData } from "./market-data";
import { Result } from "./result";
import { Route } from "./route";

export type Path = Readonly<{ routes: readonly Route[]; delivered: Amount }>;

export type PathError =
  | Readonly<{ kind: "not-held"; place: PlatformCurrency }>
  | Readonly<{ kind: "amount-currency-mismatch" }>
  | Readonly<{ kind: "no-path" }>;

export type PathQuery = Readonly<{
  from: PlatformCurrency;
  to: PlatformCurrency;
  amount: Amount;
  /** Longest Path considered, in Routes. */
  maxRoutes: number;
}>;

/** Ranks by Delivered Amount (highest first), then by fewer Routes. */
function compare(a: Path, b: Path): number {
  return Amount.compare(b.delivered, a.delivered) || a.routes.length - b.routes.length;
}

/**
 * Every usable Path from `query.from` to `query.to`, best first.
 * Exhaustive search: fine for a catalog of tens of Platforms and short Paths.
 */
function find(
  catalog: Catalog,
  market: MarketData,
  query: PathQuery,
): Result<readonly Path[], PathError> {
  for (const place of [query.from, query.to]) {
    if (!Catalog.holds(catalog, place)) return Result.err({ kind: "not-held", place });
  }
  if (query.amount.currency !== query.from.currency) {
    return Result.err({ kind: "amount-currency-mismatch" });
  }

  const outgoing = new Map<string, Route[]>();
  for (const route of Route.derive(catalog)) {
    const key = PlatformCurrency.key(route.from);
    outgoing.set(key, [...(outgoing.get(key) ?? []), route]);
  }

  const target = PlatformCurrency.key(query.to);
  const found: Path[] = [];
  const context = { catalog, market };

  const walk = (
    place: PlatformCurrency,
    amount: Amount,
    routes: readonly Route[],
    visited: ReadonlySet<string>,
  ) => {
    if (routes.length >= query.maxRoutes) return;
    for (const route of outgoing.get(PlatformCurrency.key(place)) ?? []) {
      const next = PlatformCurrency.key(route.to);
      if (visited.has(next)) continue;
      const delivered = Route.evaluate(context, route, amount);
      if (!delivered.ok) continue;
      const taken = [...routes, route];
      if (next === target) {
        found.push({ routes: taken, delivered: delivered.value });
      } else {
        walk(route.to, delivered.value, taken, new Set([...visited, next]));
      }
    }
  };
  walk(query.from, query.amount, [], new Set([PlatformCurrency.key(query.from)]));

  return found.length > 0 ? Result.ok(found.sort(compare)) : Result.err({ kind: "no-path" });
}

export const Path = { find, compare };
