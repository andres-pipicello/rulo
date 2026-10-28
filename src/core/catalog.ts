import { z } from "zod";

import { Currency, CurrencyCode } from "./currency";

export const PlatformId = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .brand<"PlatformId">();
export type PlatformId = z.infer<typeof PlatformId>;

export const ConnectionId = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .brand<"ConnectionId">();
export type ConnectionId = z.infer<typeof ConnectionId>;

export const Connection = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("rail"),
      id: ConnectionId,
      currencies: z.array(CurrencyCode).readonly(),
    })
    .readonly(),
  z
    .object({
      kind: z.literal("native"),
      id: ConnectionId,
      platform: PlatformId,
      currencies: z.array(CurrencyCode).readonly(),
    })
    .readonly(),
]);
export type Connection = z.infer<typeof Connection>;

/** An Inpoint or Outpoint: a Connection and the Currency travelling over it. */
export const Endpoint = z.object({ connection: ConnectionId, currency: CurrencyCode }).readonly();
export type Endpoint = z.infer<typeof Endpoint>;

export const ExchangePair = z.object({ source: CurrencyCode, target: CurrencyCode }).readonly();
export type ExchangePair = z.infer<typeof ExchangePair>;

export const HeldCurrency = z
  .object({
    currency: CurrencyCode,
    inpoints: z.array(Endpoint).readonly(),
    outpoints: z.array(Endpoint).readonly(),
  })
  .readonly();
export type HeldCurrency = z.infer<typeof HeldCurrency>;

export const Platform = z
  .object({
    id: PlatformId,
    name: z.string().min(1),
    currencies: z.array(HeldCurrency).readonly(),
    exchangePairs: z.array(ExchangePair).readonly(),
  })
  .readonly();
export type Platform = z.infer<typeof Platform>;

/** A Currency as held on a specific Platform. */
export type PlatformCurrency = Readonly<{ platform: PlatformId; currency: CurrencyCode }>;

export const PlatformCurrency = {
  key: (pc: PlatformCurrency): string => `${pc.platform}:${pc.currency}`,
};

function duplicates(values: readonly string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

const schema = z
  .object({
    currencies: z.array(Currency.schema).readonly(),
    connections: z.array(Connection).readonly(),
    platforms: z.array(Platform).readonly(),
  })
  .readonly()
  .superRefine((catalog, ctx) => {
    const issue = (message: string) => {
      ctx.addIssue({ code: "custom", message });
    };
    const currencies = new Set<string>(catalog.currencies.map((c) => c.symbol));
    const connections = new Map<string, Connection>(catalog.connections.map((c) => [c.id, c]));
    const platforms = new Set<string>(catalog.platforms.map((p) => p.id));

    for (const d of duplicates(catalog.currencies.map((c) => c.symbol))) {
      issue(`Duplicate currency ${d}`);
    }
    for (const d of duplicates(catalog.connections.map((c) => c.id))) {
      issue(`Duplicate connection ${d}`);
    }
    for (const d of duplicates(catalog.platforms.map((p) => p.id))) {
      issue(`Duplicate platform ${d}`);
    }

    for (const connection of catalog.connections) {
      for (const currency of connection.currencies) {
        if (!currencies.has(currency))
          issue(`Connection ${connection.id}: unknown currency ${currency}`);
      }
      if (connection.kind === "native" && !platforms.has(connection.platform)) {
        issue(`Connection ${connection.id}: unknown platform ${connection.platform}`);
      }
    }

    for (const platform of catalog.platforms) {
      for (const d of duplicates(platform.currencies.map((h) => h.currency))) {
        issue(`Platform ${platform.id}: currency ${d} listed twice`);
      }
      for (const held of platform.currencies) {
        const where = `Platform ${platform.id} ${held.currency}`;
        if (!currencies.has(held.currency)) issue(`${where}: unknown currency`);
        for (const endpoint of [...held.inpoints, ...held.outpoints]) {
          const connection = connections.get(endpoint.connection);
          if (!connection) {
            issue(`${where}: unknown connection ${endpoint.connection}`);
          } else if (!connection.currencies.includes(endpoint.currency)) {
            issue(`${where}: connection ${connection.id} does not carry ${endpoint.currency}`);
          }
        }
      }
      for (const pair of platform.exchangePairs) {
        if (pair.source === pair.target) issue(`Platform ${platform.id}: exchange pair to itself`);
        for (const currency of [pair.source, pair.target]) {
          if (!currencies.has(currency))
            issue(`Platform ${platform.id}: unknown currency ${currency}`);
        }
      }
    }
  });

export type Catalog = z.infer<typeof schema>;

function currency(catalog: Catalog, code: CurrencyCode): Currency {
  const found = catalog.currencies.find((c) => c.symbol === code);
  if (!found) throw new Error(`Currency ${code} is not in the catalog`);
  return found;
}

function holds(catalog: Catalog, pc: PlatformCurrency): boolean {
  return catalog.platforms.some(
    (p) => p.id === pc.platform && p.currencies.some((h) => h.currency === pc.currency),
  );
}

export const Catalog = { schema, currency, holds };
