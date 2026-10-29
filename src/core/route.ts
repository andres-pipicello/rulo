import type { Catalog } from "./catalog";
import { Hop } from "./hop";
import type { SearchUniverse } from "./stop";
import { SearchUniverse as Universe, Stop } from "./stop";

/** An ordered sequence of Hops from a starting Stop to a destination Stop. */
export type Route = readonly Hop[];

/**
 * Every Route from `from` to `to` within the Search Universe, visiting no Stop twice.
 * Needs no Market Data. Exhaustive: fine for a Catalog of tens of Platforms and short Routes.
 */
function find(
  catalog: Catalog,
  universe: SearchUniverse,
  from: Stop,
  to: Stop,
  maxHops: number,
): readonly Route[] {
  const outgoing = new Map<string, Hop[]>();
  for (const hop of Hop.derive(catalog, Universe.add(Universe.add(universe, from), to))) {
    const key = Stop.key(hop.from);
    outgoing.set(key, [...(outgoing.get(key) ?? []), hop]);
  }

  const routes: Route[] = [];
  const walk = (at: Stop, route: Route, visited: ReadonlySet<string>) => {
    if (route.length >= maxHops) return;
    for (const hop of outgoing.get(Stop.key(at)) ?? []) {
      const next = Stop.key(hop.to);
      if (visited.has(next)) continue;
      if (Stop.equals(hop.to, to)) routes.push([...route, hop]);
      else walk(hop.to, [...route, hop], new Set([...visited, next]));
    }
  };
  walk(from, [], new Set([Stop.key(from)]));
  return routes;
}

export const Route = { find };
