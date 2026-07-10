import { z } from "zod";

const emptyToUndefined = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? undefined : val;

export const customerFormSchema = z.object({
  type: z.enum(["INDIVIDUAL", "ORGANIZATION"]),
  name: z.string().trim().min(1, "Nimi vaaditaan."),
  email: z.preprocess(emptyToUndefined, z.string().trim().email("Virheellinen sähköposti.").optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  businessId: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^\d{7}-\d$/, "Y-tunnuksen muoto on 1234567-8.")
      .optional()
  ),
  street: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  postalCode: z.preprocess(
    emptyToUndefined,
    z.string().trim().regex(/^\d{5}$/, "Postinumero on 5 numeroa.").optional()
  ),
  city: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});
export type CustomerFormInput = z.infer<typeof customerFormSchema>;

export const customerNoteSchema = z.object({
  content: z.string().trim().min(1, "Muistiinpano ei voi olla tyhjä.").max(4000),
});
