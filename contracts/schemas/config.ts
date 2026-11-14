import { z } from "zod";
import { DateISO, MetaSchema } from "./meta";
import { DatasetSchema, EtatDossierSchema, PositionCibleSchema } from "./enums";

// Objectifs du client dans l'ordre de préférence : rang 1 = principal, les suivants = replis.
export const ObjectifSchema = z.object({
  rang: z.number().int().positive(),
  texte: z.string().min(1),
  // Position du client sur la mesure (pas sur l'objectif).
  position_cible: PositionCibleSchema,
});
export type Objectif = z.infer<typeof ObjectifSchema>;

export const ObjectifsSchema = z
  .array(ObjectifSchema)
  .min(1)
  .refine((o) => o.filter((x) => x.rang === 1).length === 1, { message: "exactement un objectif de rang 1" })
  .refine((o) => new Set(o.map((x) => x.rang)).size === o.length, { message: "rangs en double" })
  .refine((o) => o.every((x, i) => i === 0 || o[i - 1].rang < x.rang), { message: "objectifs à trier par rang croissant" });
export type Objectifs = z.infer<typeof ObjectifsSchema>;

// La mesure suivie : la disposition qui peut toucher le client, pas le texte entier.
export const MesureSchema = z.object({
  label: z.string().min(1),
  article: z.string().min(1),
  texte_id: z.string().min(1),
});
export type Mesure = z.infer<typeof MesureSchema>;

export const DossierConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  // Le cabinet travaille pour ce client sur ce sujet.
  client: z.string().min(1),
  objectifs: ObjectifsSchema,
  mesure: MesureSchema,
  // Posée, tout est rejoué comme si on était ce jour-là (petits-colis : la veille du vote).
  date_reference: DateISO.nullable(),
  texte_id: z.string().min(1),
  etat: EtatDossierSchema,
  sujet: z.object({
    label: z.string().min(1),
    mots_cles: z.array(z.string().min(1)).min(1),
  }),
  // Rempli à 15 h avec la fiche la plus riche, null avant.
  pivot_demo: z.string().nullable(),
});
export type DossierConfig = z.infer<typeof DossierConfigSchema>;

export const ConfigSchema = z.object({
  // Écrit à la main par P0 : le bloc meta est facultatif sur ce seul fichier.
  meta: MetaSchema.optional(),
  produit: z.object({
    nom: z.string().min(1),
    accroche: z.string().min(1),
  }),
  dataset: DatasetSchema,
  dossiers: z.array(DossierConfigSchema).min(1),
  dossier_demo: z.string().min(1),
  cohesion: z.object({
    paires_demo: z.array(z.tuple([z.string(), z.string()])).min(1),
    curseur_presets: z.array(z.object({ label: z.string().min(1), date: DateISO })).min(1),
  }),
});
export type Config = z.infer<typeof ConfigSchema>;
