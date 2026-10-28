import { z } from "zod";

import { CurrencyCode } from "./currency";

/** Integer count of minor units, carried as a decimal string at the edges (ADR 0001). */
export const MinorUnits = z
  .string()
  .regex(/^-?\d+$/)
  .transform((text) => BigInt(text));

const schema = z.object({ currency: CurrencyCode, minor: MinorUnits }).readonly();

export type Amount = z.infer<typeof schema>;

function of(currency: CurrencyCode, minor: bigint): Amount {
  return { currency, minor };
}

function assertSameCurrency(a: Amount, b: Amount): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Cannot combine ${a.currency} with ${b.currency}`);
  }
}

function add(a: Amount, b: Amount): Amount {
  assertSameCurrency(a, b);
  return of(a.currency, a.minor + b.minor);
}

function subtract(a: Amount, b: Amount): Amount {
  assertSameCurrency(a, b);
  return of(a.currency, a.minor - b.minor);
}

/** Negative, zero or positive as `a` is less than, equal to or greater than `b`. */
function compare(a: Amount, b: Amount): number {
  assertSameCurrency(a, b);
  return a.minor < b.minor ? -1 : a.minor > b.minor ? 1 : 0;
}

export const Amount = { schema, of, add, subtract, compare };
