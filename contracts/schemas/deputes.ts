import { z } from "zod";
import { MetaSchema } from "./meta";

export const DeputeSchema = z.object({
  id: z.string().min(1),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  // null = non-inscrit (exclu des agrégats).
  groupe_id: z.string().nullable(),
  departement: z.string().min(1),
  circonscription: z.number().int().positive(),
  commissions: z.array(z.string()),
});
export type Depute = z.infer<typeof DeputeSchema>;

export const DeputesSchema = z.object({
  meta: MetaSchema,
  deputes: z.array(DeputeSchema).min(1),
});
export type Deputes = z.infer<typeof DeputesSchema>;
