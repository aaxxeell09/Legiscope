import { z } from "zod";
import { MetaSchema } from "./meta";

export const GroupeSchema = z.object({
  id: z.string().min(1),
  sigle: z.string().min(1),
  nom: z.string().min(1),
  couleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "couleur hexadécimale attendue"),
  effectif: z.number().int().nonnegative(),
});
export type Groupe = z.infer<typeof GroupeSchema>;

export const GroupesSchema = z.object({
  meta: MetaSchema,
  groupes: z.array(GroupeSchema).min(1),
});
export type Groupes = z.infer<typeof GroupesSchema>;
