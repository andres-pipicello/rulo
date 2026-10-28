import { z } from "zod";

export const CurrencyCode = z
  .string()
  .regex(/^[A-Z0-9]{2,10}$/)
  .brand<"CurrencyCode">();
export type CurrencyCode = z.infer<typeof CurrencyCode>;

const schema = z
  .object({
    symbol: CurrencyCode,
    decimals: z.int().min(0).max(18),
  })
  .readonly();

export type Currency = z.infer<typeof schema>;

export const Currency = {
  schema,
  /** Minor units per major unit. */
  scale: (currency: Currency): bigint => 10n ** BigInt(currency.decimals),
};
