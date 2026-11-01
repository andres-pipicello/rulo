import { describe, expect, test } from "vitest";
import type { z } from "zod";

import { Account } from "./account";
import { Catalog } from "./catalog";
import { SearchUniverse, Stop } from "./stop";

const platform = (id: string) => ({
  id,
  name: id,
  currencies: ["USD", "ARS"].map((currency) => ({ currency, inpoints: [], outpoints: [] })),
  exchangePairs: [],
  fees: { kind: "seeded" } as const,
  rates: { kind: "seeded" } as const,
});

const catalog = Catalog.schema.parse({
  currencies: [
    { symbol: "USD", decimals: 2 },
    { symbol: "ARS", decimals: 2 },
  ],
  connections: [],
  platforms: [platform("bank"), platform("wallet")],
} satisfies z.input<typeof Catalog.schema>);

const accounts = Account.listSchema(catalog).parse([
  { id: "personal", platform: "bank", balances: [{ currency: "ARS", minor: "0" }] },
  { id: "joint", platform: "bank", balances: [{ currency: "USD", minor: "0" }] },
]);

const describeStop = (s: Stop) => `${s.kind} ${s.account ?? `new ${s.platform}`} ${s.currency}`;

describe("SearchUniverse.everything", () => {
  test("each Account enables what it lacks; only Platforms with no Account get one to open", () => {
    expect(SearchUniverse.everything(catalog, accounts).map(describeStop)).toEqual([
      "held personal ARS",
      "held joint USD",
      "prospective personal USD",
      "prospective joint ARS",
      "prospective new wallet USD",
      "prospective new wallet ARS",
    ]);
  });

  test("with no Accounts, the Stops are exactly the Platform Currencies", () => {
    const stops = SearchUniverse.everything(catalog, []);
    expect(stops.map((s) => `${s.platform} ${s.currency}`)).toEqual(
      Catalog.platformCurrencies(catalog).map((pc) => `${pc.platform} ${pc.currency}`),
    );
  });
});

describe("Stop.prerequisites", () => {
  test("lists each Account to open and Currency to enable once, in order", () => {
    const stops = SearchUniverse.everything(catalog, accounts);
    const twice = [...stops, ...stops];
    expect(Stop.prerequisites(twice)).toEqual({
      accountsToOpen: ["wallet"],
      currenciesToEnable: [
        { account: "personal", platform: "bank", currency: "USD" },
        { account: "joint", platform: "bank", currency: "ARS" },
      ],
    });
  });
});
