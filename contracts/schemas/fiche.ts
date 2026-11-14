import { z } from "zod";
import { DateISO, MetaSchema } from "./meta";
import { ModeSchema } from "./enums";
import { AuditionSchema } from "./auditions";
import { DebatSchema } from "./debats";
import { AmendementDeputeSchema } from "./amendements";
import { OrganisationHatvpSchema } from "./hatvp";

export const SyntheseSchema = z.object({
  position_probable: z.string().min(1),
  argument: z.string().min(1),
  // Tout nombre du texte doit figurer ici (règle 5.13, qa/verif.ts).
  chiffres_utilises: z.array(z.string()),
  mode: ModeSchema,
  // null en mode gabarit.
  modele: z.string().nullable(),
  verifie: z.boolean(),
  date: DateISO,
});
export type Synthese = z.infer<typeof SyntheseSchema>;

export const CouvertureFicheSchema = z.object({
  rapports_total: z.number().int().nonnegative(),
  rapports_avec_liste: z.number().int().nonnegative(),
  comptes_rendus_lus: z.number().int().nonnegative(),
});
export type CouvertureFiche = z.infer<typeof CouvertureFicheSchema>;

// Fusion pure de auditions/<PA>, debats/<PA>, amendements/<PA> et hatvp.json,
// plus la synthèse (null tant qu'elle n'est pas produite).
export const FicheSchema = z.object({
  meta: MetaSchema,
  depute_id: z.string().min(1),
  auditions: z.array(AuditionSchema),
  debats: z.array(DebatSchema),
  amendements: z.array(AmendementDeputeSchema),
  hatvp: z.array(OrganisationHatvpSchema),
  synthese: SyntheseSchema.nullable(),
  couverture: CouvertureFicheSchema,
});
export type Fiche = z.infer<typeof FicheSchema>;
