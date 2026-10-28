import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { Amount } from "./amount";
import { CurrencyCode } from "./currency";

const USD = CurrencyCode.parse("USD");
const ARS = CurrencyCode.parse("ARS");
const usd = fc.bigInt().map((minor) => Amount.of(USD, minor));

describe("Amount", () => {
  test("add is commutative and associative", () => {
    fc.assert(
      fc.property(usd, usd, usd, (a, b, c) => {
        expect(Amount.add(a, b)).toEqual(Amount.add(b, a));
        expect(Amount.add(Amount.add(a, b), c)).toEqual(Amount.add(a, Amount.add(b, c)));
      }),
    );
  });

  test("subtract undoes add", () => {
    fc.assert(
      fc.property(usd, usd, (a, b) => {
        expect(Amount.subtract(Amount.add(a, b), b)).toEqual(a);
      }),
    );
  });

  test("mixing currencies is a bug", () => {
    expect(() => Amount.add(Amount.of(USD, 1n), Amount.of(ARS, 1n))).toThrow(TypeError);
  });

  test("parses minor units from a string", () => {
    expect(Amount.schema.parse({ currency: "USD", minor: "12345" })).toEqual(
      Amount.of(USD, 12345n),
    );
    expect(Amount.schema.safeParse({ currency: "USD", minor: "1.5" }).success).toBe(false);
  });
});
