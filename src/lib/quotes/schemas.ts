import { z } from "zod";

export const quoteLineItemInputSchema = z.object({
  type: z.enum(["LABOR", "MATERIAL"]),
  description: z.string().trim().min(1, "Kuvaus vaaditaan."),
  quantity: z.coerce.number().positive("Määrän tulee olla suurempi kuin 0."),
  unitPriceCents: z.coerce.number().int().min(0, "Yksikköhinta ei voi olla negatiivinen."),
});
export type QuoteLineItemFormInput = z.infer<typeof quoteLineItemInputSchema>;

export const quoteFormSchema = z.object({
  customerId: z.string().min(1, "Valitse asiakas."),
  title: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().optional()
  ),
  vatRatePercent: z.coerce.number().min(0).max(100),
  discountPercent: z.coerce.number().min(0).max(100),
  reverseVatApplies: z.coerce.boolean(),
  notes: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().optional()
  ),
  items: z.array(quoteLineItemInputSchema).min(1, "Lisää vähintään yksi rivi."),
});
export type QuoteFormInput = z.infer<typeof quoteFormSchema>;
