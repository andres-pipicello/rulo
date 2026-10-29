import type { Account, AccountId } from "./account";
import type { PlatformCurrency } from "./catalog";
import { Catalog } from "./catalog";

/** Where money can sit during a search: a Balance the user holds, or a Platform Currency they could hold. */
export type Stop =
  | (PlatformCurrency & Readonly<{ kind: "held"; account: AccountId }>)
  | (PlatformCurrency & Readonly<{ kind: "prospective" }>);

function key(stop: Stop): string {
  switch (stop.kind) {
    case "held":
      return `held:${stop.account}:${stop.currency}`;
    case "prospective":
      return `prospective:${stop.platform}:${stop.currency}`;
  }
}

function equals(a: Stop, b: Stop): boolean {
  return key(a) === key(b);
}

function held(accounts: readonly Account[]): readonly Stop[] {
  return accounts.flatMap((account) =>
    account.balances.map((balance) => ({
      kind: "held" as const,
      account: account.id,
      platform: account.platform,
      currency: balance.currency,
    })),
  );
}

/** One prospective Stop per Platform Currency that no Account holds. */
function prospective(catalog: Catalog, accounts: readonly Account[]): readonly Stop[] {
  const heldKeys = new Set(held(accounts).map((s) => `${s.platform}:${s.currency}`));
  return Catalog.platformCurrencies(catalog)
    .filter((pc) => !heldKeys.has(`${pc.platform}:${pc.currency}`))
    .map((pc) => ({ kind: "prospective" as const, ...pc }));
}

export const Stop = { key, equals, held, prospective };

/** The Stops a search may pass through. */
export type SearchUniverse = readonly Stop[];

function add(universe: SearchUniverse, stop: Stop): SearchUniverse {
  return universe.some((s) => equals(s, stop)) ? universe : [...universe, stop];
}

function remove(universe: SearchUniverse, stop: Stop): SearchUniverse {
  return universe.filter((s) => !equals(s, stop));
}

export const SearchUniverse = {
  /** Preset: every held and prospective Stop. */
  everything: (catalog: Catalog, accounts: readonly Account[]): SearchUniverse => [
    ...held(accounts),
    ...prospective(catalog, accounts),
  ],
  /** Preset: only the user's own Balances. */
  onlyMine: (accounts: readonly Account[]): SearchUniverse => held(accounts),
  add,
  remove,
};
