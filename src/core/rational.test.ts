import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { Rational } from "./rational";

const minor = fc.bigInt({ min: 0n, max: 10n ** 15n });
const rational = fc
  .tuple(fc.bigInt({ min: 0n, max: 10n ** 6n }), fc.bigInt({ min: 1n, max: 10n ** 6n }))
  .map(([num, den]) => Rational.of(num, den));

describe("parseDecimal", () => {
  test.each([
    ["1180.50", 2361n, 2n],
    ["0.0008", 1n, 1250n],
    ["0", 0n, 1n],
    ["12", 12n, 1n],
  ])("%s is exactly %d/%d", (text, num, den) => {
    expect(Rational.parseDecimal(text)).toEqual({ num, den });
  });

  test.each(["", "-1", "1.", ".5", "1e3", "1,5"])("rejects %j", (text) => {
    expect(Rational.parseDecimal(text)).toBeUndefined();
  });
});

describe("rounding", () => {
  test("floorMul never exceeds the exact product, by less than one unit", () => {
    fc.assert(
      fc.property(minor, rational, (x, r) => {
        const result = Rational.floorMul(x, r);
        expect(result * r.den).toBeLessThanOrEqual(x * r.num);
        expect((result + 1n) * r.den).toBeGreaterThan(x * r.num);
      }),
    );
  });

  test("ceilMul never falls short of the exact product, by less than one unit", () => {
    fc.assert(
      fc.property(minor, rational, (x, r) => {
        const result = Rational.ceilMul(x, r);
        expect(result * r.den).toBeGreaterThanOrEqual(x * r.num);
        expect((result - 1n) * r.den).toBeLessThan(x * r.num);
      }),
    );
  });
});
