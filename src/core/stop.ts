import type { Account, AccountId } from "./account";
import type { PlatformCurrency, PlatformId } from "./catalog";
import { Catalog } from "./catalog";

/**
 * A Balance money can sit in during a search, of exactly one Account (ADR 0004): `held` when the
 * user declared it, otherwise `prospective`. `account` is null for the Prospective Account of a
 * Platform where the user has none.
 */
export type Stop =
  | (PlatformCurrency & Readonly<{ kind: "held"; account: AccountId }>)
  | (PlatformCurrency & Readonly<{ kind: "prospective"; account: AccountId | null }>);

function key(stop: Stop): string {
  return `${stop.account ?? `new:${stop.platform}`}:${stop.currency}`;
}

function equals(a: Stop, b: Stop): boolean {
  return key(a) === key(b);
}

/** Whether two Stops are Balances of the same Account, real or prospective. */
function sameAccount(a: Stop, b: Stop): boolean {
  return a.account === b.account && a.platform === b.platform;
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

/**
 * Prospective Balances: in each Account, every Currency its Platform offers that it does not hold
 * (a Currency to enable); on each Platform with no Account, every Currency of its Prospective
 * Account (an Account to open).
 */
function prospective(catalog: Catalog, accounts: readonly Account[]): readonly Stop[] {
  const toEnable = accounts.flatMap((account) =>
    Catalog.platform(catalog, account.platform)
      .currencies.filter(({ currency }) => !account.balances.some((b) => b.currency === currency))
      .map(({ currency }) => ({
        kind: "prospective" as const,
        account: account.id,
        platform: account.platform,
        currency,
      })),
  );
  const toOpen = Catalog.platformCurrencies(catalog)
    .filter((pc) => !accounts.some((a) => a.platform === pc.platform))
    .map((pc) => ({ kind: "prospective" as const, account: null, ...pc }));
  return [...toEnable, ...toOpen];
}

/** A Currency an existing Account must enable. */
export type CurrencyToEnable = PlatformCurrency & Readonly<{ account: AccountId }>;

/** What the user must do before a sequence of Stops can be used. */
export type Prerequisites = Readonly<{
  accountsToOpen: readonly PlatformId[];
  currenciesToEnable: readonly CurrencyToEnable[];
}>;

function prerequisites(stops: readonly Stop[]): Prerequisites {
  const accountsToOpen = new Set<PlatformId>();
  const currenciesToEnable = new Map<string, CurrencyToEnable>();
  for (const stop of stops) {
    if (stop.kind === "held") continue;
    const { account, platform, currency } = stop;
    if (account === null) accountsToOpen.add(platform);
    else currenciesToEnable.set(key(stop), { account, platform, currency });
  }
  return {
    accountsToOpen: [...accountsToOpen],
    currenciesToEnable: [...currenciesToEnable.values()],
  };
}

export const Stop = { key, equals, sameAccount, held, prospective, prerequisites };

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
  /** Preset: only the user's own held Balances. */
  onlyMine: (accounts: readonly Account[]): SearchUniverse => held(accounts),
  add,
  remove,
};
