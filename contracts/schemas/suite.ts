import { z } from "zod";
import { DateISO, MetaSchema, Proba, Url } from "./meta";
import { LieuEcheanceSchema } from "./enums";
import { PreuveSchema } from "./preuve";

export const EcheanceSchema = z.object({
  // null = date inconnue (par exemple nouvelle lecture non encore inscrite).
  date: DateISO.nullable(),
  titre: z.string().min(1),
  lieu: LieuEcheanceSchema,
  url: Url,
  preuve: PreuveSchema,
});
export type Echeance = z.infer<typeof EcheanceSchema>;

export const ProbableSchema = z.object({
  titre: z.string().min(1),
  // null = pas de probabilité chiffrée.
  proba: Proba.nullable(),
  detail: z.string().min(1),
  preuve: PreuveSchema,
});
export type Probable = z.infer<typeof ProbableSchema>;

// Bloc 3 : prochaines dates et ce qui a le plus de chances d'arriver.
export const SuiteSchema = z.object({
  meta: MetaSchema,
  echeances: z.array(EcheanceSchema),
  // La dernière occasion d'agir sur la mesure ; null si inconnue.
  derniere_occasion: EcheanceSchema.nullable(),
  probables: z.array(ProbableSchema),
});
export type Suite = z.infer<typeof SuiteSchema>;
