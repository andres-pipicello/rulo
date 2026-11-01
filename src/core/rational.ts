import { z } from "zod";

/** Exact non-negative rational number. Always normalised: `den > 0`, `gcd(num, den) = 1`. */
export type Rational = Readonly<{ num: bigint; den: bigint }>;

const DECIMAL = /^(\d+)(?:\.(\d+))?$/;

function gcd(a: bigint, b: bigint): bigint {
  return b === 0n ? a : gcd(b, a % b);
}

function of(num: bigint, den: bigint): Rational {
  if (den <= 0n) throw new RangeError(`Rational denominator must be positive, got ${String(den)}`);
  if (num < 0n) throw new RangeError(`Rational must be non-negative, got ${String(num)}`);
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

/** Exactly parses a non-negative decimal string such as `"1180.50"`. */
function parseDecimal(text: string): Rational | undefined {
  const match = DECIMAL.exec(text);
  if (!match) return undefined;
  const whole = match[1] ?? "0";
  const fraction = match[2] ?? "";
  return of(BigInt(whole + fraction), 10n ** BigInt(fraction.length));
}

/** `floor(x × r)` for non-negative `x`. */
function floorMul(x: bigint, r: Rational): bigint {
  return (x * r.num) / r.den;
}

/** `ceil(x × r)` for non-negative `x`. */
function ceilMul(x: bigint, r: Rational): bigint {
  return (x * r.num + r.den - 1n) / r.den;
}

const schema = z.string().transform((text, ctx) => {
  const parsed = parseDecimal(text);
  if (parsed) return parsed;
  ctx.addIssue({ code: "custom", message: `Not a non-negative decimal: "${text}"` });
  return z.NEVER;
});

export const Rational = {
  schema,
  of,
  parseDecimal,
  floorMul,
  ceilMul,
  zero: of(0n, 1n),
};
