import { Temporal } from "temporal-polyfill";

import { Amount } from "./amount";
import { Catalog } from "./catalog";
import type { Context, Leg, ResolvedHop } from "./hop";
import { Hop } from "./hop";
import type { MarketDataResolver } from "./market-data";
import { Result } from "./result";
import type { SearchUniverse } from "./stop";
import { SearchUniverse as Universe, Stop } from "./stop";

/** An ordered sequence of Hops from a starting Stop to a destination Stop. */
export type Route = readonly Hop[];

/** A Route taken at a moment with one side fixed: its Legs and both Amounts. */
export type Quote = Readonly<{
  route: Route;
  legs: readonly Leg[];
  sent: Amount;
  delivered: Amount;
  /** The oldest fetch among the values used; undefined when all were fixed. */
  oldestFetchedAt: Temporal.Instant | undefined;
  /** Only possible when Exchange Rates contradict each other across Platforms. */
  repeatsStop: boolean;
}>;

/** Which side of the Quote the user fixes. */
export type Fixed = Readonly<{ side: "sent" | "delivered"; amount: Amount }>;

export type QuoteQuery = Readonly<{
  from: Stop;
  to: Stop;
  universe: SearchUniverse;
  fixed: Fixed;
  /** Longest Route considered, in Hops. */
  maxHops: number;
}>;

export type SearchError =
  | Readonly<{ kind: "not-offered"; stop: Stop }>
  | Readonly<{ kind: "amount-currency-mismatch" }>
  | Readonly<{ kind: "non-positive-amount" }>
  | Readonly<{ kind: "no-quote" }>;

/** The best Amount found at a Stop, with the Route that achieves it. */
type Label = Readonly<{ minor: bigint; route: Route }>;

/** Resolves each Hop's Market Data at most once per search, only when the search reaches it. */
function resolver(context: Context): (hop: Hop) => Promise<ResolvedHop | undefined> {
  const cache = new Map<Hop, Promise<ResolvedHop | undefined>>();
  return (hop) => {
    let resolved = cache.get(hop);
    if (!resolved) {
      resolved = Hop.resolve(context, hop);
      cache.set(hop, resolved);
    }
    return resolved;
  };
}

/**
 * Hop-bounded best-Amount search. Each round extends only the Stops improved in the previous
 * round; a label is replaced only by a strictly better one, so ties keep the Route with fewer
 * Hops. Sound because taking a Hop is monotonic in the Amount.
 *
 * `forward`: labels hold the most money that can reach each Stop.
 * `backward`: labels hold the least money each Stop needs to reach the destination.
 */
async function relax(
  hops: readonly Hop[],
  start: Stop,
  startMinor: bigint,
  maxHops: number,
  direction: "forward" | "backward",
  extend: (hop: Hop, minor: bigint) => Promise<bigint | undefined>,
): Promise<ReadonlyMap<string, Label>> {
  const adjacent = new Map<string, Hop[]>();
  for (const hop of hops) {
    const key = Stop.key(direction === "forward" ? hop.from : hop.to);
    adjacent.set(key, [...(adjacent.get(key) ?? []), hop]);
  }
  const better = (a: bigint, b: bigint) => (direction === "forward" ? a > b : a < b);

  const labels = new Map<string, Label>([[Stop.key(start), { minor: startMinor, route: [] }]]);
  let frontier = [Stop.key(start)];
  for (let round = 0; round < maxHops && frontier.length > 0; round++) {
    const improved = new Map<string, Label>();
    for (const key of frontier) {
      const label = labels.get(key);
      if (!label) continue;
      for (const hop of adjacent.get(key) ?? []) {
        const minor = await extend(hop, label.minor);
        if (minor === undefined) continue;
        const next = Stop.key(direction === "forward" ? hop.to : hop.from);
        const route = direction === "forward" ? [...label.route, hop] : [hop, ...label.route];
        const current = improved.get(next) ?? labels.get(next);
        if (!current || better(minor, current.minor)) improved.set(next, { minor, route });
      }
    }
    for (const [key, label] of improved) labels.set(key, label);
    frontier = [...improved.keys()];
  }
  return labels;
}

/** Takes every Hop of a Route in order, starting with `sent`. */
async function along(context: Context, route: Route, sent: Amount): Promise<Quote | undefined> {
  const resolve = resolver(context);
  const legs: Leg[] = [];
  let current = sent;
  for (const hop of route) {
    const resolved = await resolve(hop);
    if (!resolved) return undefined;
    const leg = Hop.take(resolved, current);
    if (!leg.ok) return undefined;
    legs.push(leg.value);
    current = leg.value.delivered;
  }
  const fetchedAt = legs
    .flatMap((leg) => [...leg.rates, ...leg.fees.map((f) => f.fee)])
    .flatMap(({ provenance: p }) => (p.kind === "fetched" ? [p.fetchedAt] : []));
  const stops = [
    ...route.map((h) => Stop.key(h.from)),
    ...route.slice(-1).map((h) => Stop.key(h.to)),
  ];
  return {
    route,
    legs,
    sent,
    delivered: current,
    oldestFetchedAt: fetchedAt.sort((a, b) => Temporal.Instant.compare(a, b))[0],
    repeatsStop: new Set(stops).size < stops.length,
  };
}

/** The best Quote from `query.from` to `query.to` within the Search Universe. */
async function best(
  catalog: Catalog,
  market: MarketDataResolver,
  query: QuoteQuery,
): Promise<Result<Quote, SearchError>> {
  const { from, to, fixed, maxHops } = query;
  for (const stop of [from, to]) {
    if (!Catalog.offered(catalog, stop)) return Result.err({ kind: "not-offered", stop });
  }
  const expected = fixed.side === "sent" ? from.currency : to.currency;
  if (fixed.amount.currency !== expected) return Result.err({ kind: "amount-currency-mismatch" });
  if (fixed.amount.minor <= 0n) return Result.err({ kind: "non-positive-amount" });

  const context = { catalog, market };
  const resolve = resolver(context);
  const hops = Hop.derive(catalog, Universe.add(Universe.add(query.universe, from), to));

  let route: Route | undefined;
  let sent: Amount | undefined;
  switch (fixed.side) {
    case "sent": {
      const labels = await relax(
        hops,
        from,
        fixed.amount.minor,
        maxHops,
        "forward",
        async (hop, minor) => {
          const resolved = await resolve(hop);
          const leg = resolved && Hop.take(resolved, Amount.of(hop.from.currency, minor));
          return leg?.ok ? leg.value.delivered.minor : undefined;
        },
      );
      route = labels.get(Stop.key(to))?.route;
      sent = fixed.amount;
      break;
    }
    case "delivered": {
      const labels = await relax(
        hops,
        to,
        fixed.amount.minor,
        maxHops,
        "backward",
        async (hop, minor) => {
          const resolved = await resolve(hop);
          return resolved && Hop.minimumSent(resolved, Amount.of(hop.to.currency, minor))?.minor;
        },
      );
      const label = labels.get(Stop.key(from));
      route = label?.route;
      sent = label && Amount.of(from.currency, label.minor);
      break;
    }
  }
  if (!route?.length || !sent) return Result.err({ kind: "no-quote" });
  const quote = await along(context, route, sent);
  return quote ? Result.ok(quote) : Result.err({ kind: "no-quote" });
}

export const Quote = { best, along };
