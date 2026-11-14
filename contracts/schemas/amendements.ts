import { z } from "zod";
import { MetaSchema, Url } from "./meta";
import { RoleAmendementSchema, SortSchema } from "./enums";

export const AmendementDeputeSchema = z.object({
  id: z.string().min(1),
  texte_id: z.string().min(1),
  role: RoleAmendementSchema,
  resume: z.string().min(1),
  sort: SortSchema,
  // Organisations citées dans l'exposé des motifs (« travaillé avec »).
  travaille_avec: z.array(z.string().min(1)),
  url: Url,
});
export type AmendementDepute = z.infer<typeof AmendementDeputeSchema>;

export const AmendementsSchema = z.object({
  meta: MetaSchema,
  depute_id: z.string().min(1),
  amendements: z.array(AmendementDeputeSchema),
});
export type Amendements = z.infer<typeof AmendementsSchema>;
