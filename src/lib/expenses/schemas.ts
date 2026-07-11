import { z } from "zod";

const optionalTrim = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);

export const expenseFormSchema = z.object({
  category: z.enum(["MATERIAL", "FUEL", "EQUIPMENT", "OTHER"]),
  description: z.string().trim().min(1, "Kuvaus vaaditaan."),
  amountCents: z.coerce.number().int().positive("Summan tulee olla suurempi kuin 0."),
  vendor: z.preprocess(optionalTrim, z.string().trim().optional()),
  incurredAt: z.coerce.date(),
  jobId: z.preprocess(optionalTrim, z.string().optional()),
  notes: z.preprocess(optionalTrim, z.string().trim().optional()),
});
export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;
