import { z } from "zod";

const optionalTrim = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);

export const jobTaskInputSchema = z.object({
  description: z.string().trim().min(1, "Tehtävän kuvaus vaaditaan."),
});
export type JobTaskFormInput = z.infer<typeof jobTaskInputSchema>;

export const jobFormSchema = z
  .object({
    customerId: z.string().min(1, "Valitse asiakas."),
    title: z.string().trim().min(1, "Otsikko vaaditaan."),
    startAt: z.coerce.date(),
    endAt: z.preprocess(optionalTrim, z.coerce.date().optional()),
    street: z.preprocess(optionalTrim, z.string().trim().optional()),
    postalCode: z.preprocess(
      optionalTrim,
      z.string().trim().regex(/^\d{5}$/, "Postinumero on 5 numeroa.").optional()
    ),
    city: z.preprocess(optionalTrim, z.string().trim().optional()),
    notes: z.preprocess(optionalTrim, z.string().trim().optional()),
    assigneeIds: z.array(z.string()).default([]),
    tasks: z.array(jobTaskInputSchema).default([]),
  })
  .refine((data) => !data.endAt || data.endAt >= data.startAt, {
    message: "Lopetusajan tulee olla aloitusajan jälkeen tai samaan aikaan.",
    path: ["endAt"],
  });
export type JobFormInput = z.infer<typeof jobFormSchema>;
