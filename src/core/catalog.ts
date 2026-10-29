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

export const Connection = z
  .object({ id: ConnectionId, currencies: z.array(CurrencyCode).readonly() })
  .readonly();
export type Connection = z.infer<typeof Connection>;

/** An Inpoint or Outpoint: a Connection and the Currency travelling over it. */
export const Endpoint = z.object({ connection: ConnectionId, currency: CurrencyCode }).readonly();
export type Endpoint = z.infer<typeof Endpoint>;

export const ExchangePair = z.object({ source: CurrencyCode, target: CurrencyCode }).readonly();
export type ExchangePair = z.infer<typeof ExchangePair>;

/** A Platform Currency as the Catalog describes it: its Inpoints and Outpoints. */
export const OfferedCurrency = z
  .object({
    currency: CurrencyCode,
    inpoints: z.array(Endpoint).readonly(),
    outpoints: z.array(Endpoint).readonly(),
  })
  .readonly();
export type OfferedCurrency = z.infer<typeof OfferedCurrency>;

export const Platform = z
  .object({
    id: PlatformId,
    name: z.string().min(1),
    currencies: z.array(OfferedCurrency).readonly(),
    exchangePairs: z.array(ExchangePair).readonly(),
  })
  .readonly();
export type Platform = z.infer<typeof Platform>;

/** A Currency as held on a specific Platform. */
export type PlatformCurrency = Readonly<{ platform: PlatformId; currency: CurrencyCode }>;

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

function platform(catalog: Catalog, id: PlatformId): Platform {
  const found = catalog.platforms.find((p) => p.id === id);
  if (!found) throw new Error(`Platform ${id} is not in the catalog`);
  return found;
}

/** The Catalog entry for a Platform Currency, if the Platform offers that Currency. */
function offered(catalog: Catalog, pc: PlatformCurrency): OfferedCurrency | undefined {
  return catalog.platforms
    .find((p) => p.id === pc.platform)
    ?.currencies.find((c) => c.currency === pc.currency);
}

/** Every Platform Currency the Catalog offers. */
function platformCurrencies(catalog: Catalog): readonly PlatformCurrency[] {
  return catalog.platforms.flatMap((p) =>
    p.currencies.map((c) => ({ platform: p.id, currency: c.currency })),
  );
}

export const Catalog = { schema, currency, platform, offered, platformCurrencies };
