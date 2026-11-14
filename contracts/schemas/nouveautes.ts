import { z } from "zod";
import { DateISO, MetaSchema, Url } from "./meta";
import { EffetSchema, TypeEvenementSchema } from "./enums";
import { PreuveSchema } from "./preuve";

export const EvenementSchema = z.object({
  id: z.string().min(1),
  date: DateISO,
  type: TypeEvenementSchema,
  titre: z.string().min(1),
  detail: z.string().min(1),
  // 3 = compte vraiment, 1 = bruit.
  importance: z.number().int().min(1).max(3),
  url: Url,
  // Effet sur le verdict de l'objectif visé (objectif_rang, 1 = principal).
  effet: EffetSchema,
  objectif_rang: z.number().int().positive(),
  preuve: PreuveSchema,
});
export type Evenement = z.infer<typeof EvenementSchema>;

// Bloc 2 : événements triés par importance décroissante puis date décroissante.
export const NouveautesSchema = z.object({
  meta: MetaSchema,
  evenements: z.array(EvenementSchema).refine(
    (e) => e.every((x, i) => i === 0 || e[i - 1].importance > x.importance || (e[i - 1].importance === x.importance && e[i - 1].date >= x.date)),
    { message: "événements à trier par importance décroissante puis date décroissante" },
  ),
});
export type Nouveautes = z.infer<typeof NouveautesSchema>;
