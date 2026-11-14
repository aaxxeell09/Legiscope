import { z } from "zod";
import { DateISO, MetaSchema, Proba, Url } from "./meta";
import { PositionSchema, SortSchema, AuteurTypeSchema, NatureAmendementSchema, NatureModeSchema } from "./enums";

export const PositionGroupeSchema = z.object({
  groupe_id: z.string().min(1),
  // null = pas de position majoritaire.
  position: PositionSchema.nullable(),
  confiance: Proba,
  base: z.string(),
  // 0 pour tous les groupes = positions déduites des amendements seuls.
  n_scrutins_sujet: z.number().int().nonnegative(),
});
export type PositionGroupe = z.infer<typeof PositionGroupeSchema>;

// proba_pour = moyenne des probabilités individuelles de voter pour,
// jamais une probabilité d'adoption.
export const PredictionSchema = z.object({
  proba_pour: Proba,
  confiance: Proba,
  modele: z.string().min(1),
  date: DateISO,
});
export type Prediction = z.infer<typeof PredictionSchema>;

export const AmendementTexteSchema = z.object({
  id: z.string().min(1),
  numero: z.string().min(1),
  url: Url,
  auteur_id: z.string().min(1),
  cosignataires_ids: z.array(z.string().min(1)),
  // null quand l'auteur est non-inscrit.
  groupe_id: z.string().nullable(),
  resume: z.string().min(1),
  sort: SortSchema,
  // null = Orcet n'a pas de prédiction (404 non facturé).
  prediction: PredictionSchema.nullable(),
  // Dates de l'open data (P1), pour les nouveautés (A4). Optionnelles tant que P3 ne les recopie pas.
  date_depot: DateISO.nullable().optional(),
  date_sort: DateISO.nullable().optional(),
  // Compléments 14 h 05 (optionnels) : auteur non député, nature vis-à-vis de la mesure.
  auteur_type: AuteurTypeSchema.optional(),
  auteur_libelle: z.string().min(1).optional(),
  nature: NatureAmendementSchema.optional(),
  nature_mode: NatureModeSchema.optional(),
});
export type AmendementTexte = z.infer<typeof AmendementTexteSchema>;

export const TexteSchema = z.object({
  meta: MetaSchema,
  texte: z.object({
    id: z.string().min(1),
    titre: z.string().min(1),
    etape: z.string().min(1),
    url: Url,
  }),
  positions: z.array(PositionGroupeSchema),
  amendements: z.array(AmendementTexteSchema),
});
export type Texte = z.infer<typeof TexteSchema>;
