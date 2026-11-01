import { z } from "zod";

import { Amount } from "./amount";
import { Catalog, PlatformId } from "./catalog";

export const AccountId = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .brand<"AccountId">();
export type AccountId = z.infer<typeof AccountId>;

const schema = z
  .object({
    id: AccountId,
    platform: PlatformId,
    /** One per Currency; the keys declare what the Account holds, even at zero. */
    balances: z.array(Amount.schema).readonly(),
  })
  .readonly();

export type Account = z.infer<typeof schema>;

/** A user's Accounts, checked against the Catalog: their Balances must be Currencies the Platform offers. */
function listSchema(catalog: Catalog) {
  return z
    .array(schema)
    .readonly()
    .superRefine((accounts, ctx) => {
      const issue = (message: string) => {
        ctx.addIssue({ code: "custom", message });
      };
      const ids = accounts.map((a) => a.id);
      for (const [index, id] of ids.entries()) {
        if (ids.indexOf(id) !== index) issue(`Duplicate account ${id}`);
      }
      for (const account of accounts) {
        const currencies = account.balances.map((b) => b.currency);
        for (const [index, currency] of currencies.entries()) {
          if (currencies.indexOf(currency) !== index) {
            issue(`Account ${account.id}: ${currency} balance listed twice`);
          }
          const pc = { platform: account.platform, currency };
          if (!Catalog.offered(catalog, pc)) {
            issue(`Account ${account.id}: ${account.platform} does not offer ${currency}`);
          }
        }
      }
    });
}

export const Account = { schema, listSchema };
