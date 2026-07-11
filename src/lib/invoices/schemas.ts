import { z } from "zod";

const optionalTrim = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);

export const invoiceLineItemInputSchema = z.object({
  type: z.enum(["LABOR", "MATERIAL"]),
  description: z.string().trim().min(1, "Kuvaus vaaditaan."),
  quantity: z.coerce.number().positive("Määrän tulee olla suurempi kuin 0."),
  unitPriceCents: z.coerce.number().int().min(0, "Yksikköhinta ei voi olla negatiivinen."),
});
export type InvoiceLineItemFormInput = z.infer<typeof invoiceLineItemInputSchema>;

export const invoiceFormSchema = z.object({
  customerId: z.string().min(1, "Valitse asiakas."),
  title: z.preprocess(optionalTrim, z.string().trim().optional()),
  vatRatePercent: z.coerce.number().min(0).max(100),
  discountPercent: z.coerce.number().min(0).max(100),
  reverseVatApplies: z.coerce.boolean(),
  dueDate: z.preprocess(optionalTrim, z.coerce.date().optional()),
  notes: z.preprocess(optionalTrim, z.string().trim().optional()),
  items: z.array(invoiceLineItemInputSchema).min(1, "Lisää vähintään yksi rivi."),
});
export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>;

export const paymentFormSchema = z.object({
  amountCents: z.coerce.number().int().positive("Summan tulee olla suurempi kuin 0."),
  paidAt: z.coerce.date(),
  method: z.preprocess(optionalTrim, z.string().trim().optional()),
});
export type PaymentFormInput = z.infer<typeof paymentFormSchema>;
