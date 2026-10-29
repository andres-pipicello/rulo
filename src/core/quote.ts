import { Amount } from "./amount";
import { Catalog } from "./catalog";
import type { Context, Leg, Unquotable } from "./hop";
import { Hop } from "./hop";
import type { MarketData } from "./market-data";
import { Result } from "./result";
import { Route } from "./route";
import type { SearchUniverse, Stop } from "./stop";

/** A Route taken at a moment with one side fixed: its Legs and both Amounts. */
export type Quote = Readonly<{
  route: Route;
  legs: readonly Leg[];
  sent: Amount;
  delivered: Amount;
}>;

/** Which side of the Quote the user fixes. */
export type Fixed = Readonly<{ side: "sent" | "delivered"; amount: Amount }>;

export type QuoteQuery = Readonly<{
  from: Stop;
  to: Stop;
  universe: SearchUniverse;
  fixed: Fixed;
  maxHops: number;
}>;

export type SearchError =
  | Readonly<{ kind: "not-offered"; stop: Stop }>
  | Readonly<{ kind: "amount-currency-mismatch" }>
  | Readonly<{ kind: "non-positive-amount" }>
  | Readonly<{ kind: "no-route" }>
  | Readonly<{ kind: "no-quote"; reasons: readonly Unquotable[] }>;

/** Upper bound when searching for a Sent Amount; beyond it the target is unreachable. */
const SEARCH_LIMIT = 10n ** 30n;

function forward(context: Context, route: Route, sent: Amount): Result<Quote, Unquotable> {
  const legs: Leg[] = [];
  let current = sent;
  for (const hop of route) {
    const leg = Hop.take(context, hop, current);
    if (!leg.ok) return leg;
    legs.push(leg.value);
    current = leg.value.delivered;
  }
  return Result.ok({ route, legs, sent, delivered: current });
}

/**
 * The smallest Sent Amount that delivers at least `target`. Every step is monotonic in the Amount
 * (Fees below 100%, rounding down), so a binary search over the forward run finds it.
 */
function backward(context: Context, route: Route, target: Amount): Result<Quote, Unquotable> {
  const [first] = route;
  if (!first) throw new Error("A Route has at least one Hop");
  const meets = (minor: bigint) => {
    const quote = forward(context, route, Amount.of(first.from.currency, minor));
    return quote.ok && quote.value.delivered.minor >= target.minor ? quote.value : undefined;
  };
  let low = 0n;
  let high = target.minor;
  while (!meets(high)) {
    low = high;
    high *= 2n;
    if (high > SEARCH_LIMIT) return Result.err({ kind: "insufficient" });
  }
  while (high - low > 1n) {
    const middle = (low + high) / 2n;
    if (meets(middle)) high = middle;
    else low = middle;
  }
  const quote = meets(high);
  if (!quote) throw new Error("Binary search lost its upper bound");
  return Result.ok(quote);
}

function make(context: Context, route: Route, fixed: Fixed): Result<Quote, Unquotable> {
  const [missing] = route.flatMap((hop) => Hop.missing(context, hop));
  if (missing) return Result.err(missing);
  switch (fixed.side) {
    case "sent":
      return forward(context, route, fixed.amount);
    case "delivered":
      return backward(context, route, fixed.amount);
  }
}

/** Best first: the most delivered (or the least sent), then the fewest Hops. */
function compare(side: Fixed["side"]): (a: Quote, b: Quote) => number {
  return (a, b) => {
    const byAmount =
      side === "sent" ? Amount.compare(b.delivered, a.delivered) : Amount.compare(a.sent, b.sent);
    return byAmount || a.route.length - b.route.length;
  };
}

/** The best Quote from `query.from` to `query.to` within the Search Universe. */
function best(catalog: Catalog, market: MarketData, query: QuoteQuery): Result<Quote, SearchError> {
  const { from, to, fixed } = query;
  for (const stop of [from, to]) {
    if (!Catalog.offered(catalog, stop)) return Result.err({ kind: "not-offered", stop });
  }
  const expected = fixed.side === "sent" ? from.currency : to.currency;
  if (fixed.amount.currency !== expected) return Result.err({ kind: "amount-currency-mismatch" });
  if (fixed.amount.minor <= 0n) return Result.err({ kind: "non-positive-amount" });

  const routes = Route.find(catalog, query.universe, from, to, query.maxHops);
  if (routes.length === 0) return Result.err({ kind: "no-route" });

  const context = { catalog, market };
  const quotes: Quote[] = [];
  const reasons: Unquotable[] = [];
  for (const route of routes) {
    const quote = make(context, route, fixed);
    if (quote.ok) quotes.push(quote.value);
    else reasons.push(quote.error);
  }
  const [winner] = quotes.sort(compare(fixed.side));
  return winner ? Result.ok(winner) : Result.err({ kind: "no-quote", reasons });
}

export const Quote = { make, best, compare };
