import { z } from "zod";
import { MetaSchema, Proba } from "./meta";
import { ModeSchema, NiveauConfianceSchema, SituationSchema, TendanceSchema } from "./enums";
import { PreuveSchema } from "./preuve";

export const RaisonVerdictSchema = z.object({
  titre: z.string().min(1),
  detail: z.string().min(1),
  preuve: PreuveSchema,
});
export type RaisonVerdict = z.infer<typeof RaisonVerdictSchema>;

// Une phrase rédigée ; ses nombres figurent dans chiffres_utilises (règle 5.13).
export const LectureSchema = z.object({
  texte: z.string().min(1),
  chiffres_utilises: z.array(z.string()),
  mode: ModeSchema,
  modele: z.string().nullable(),
  verifie: z.boolean(),
});
export type Lecture = z.infer<typeof LectureSchema>;

// Ce qui est établi, ce qui reste inconnu : l'outil a le droit de dire « pas assez d'information ».
export const ConfianceSchema = z.object({
  niveau: NiveauConfianceSchema,
  etabli: z.array(z.string().min(1)),
  inconnu: z.array(z.string().min(1)),
});
export type Confiance = z.infer<typeof ConfianceSchema>;

// L'information précise qui a fait bouger le verdict (un événement de nouveautes.json).
export const CauseDuChangementSchema = z.object({
  evenement_id: z.string().min(1),
  titre: z.string().min(1),
  preuve: PreuveSchema,
});
export type CauseDuChangement = z.infer<typeof CauseDuChangementSchema>;

// Un verdict par objectif du dossier (config.dossiers[].objectifs).
export const VerdictObjectifSchema = z.object({
  objectif_rang: z.number().int().positive(),
  situation: SituationSchema,
  // Probabilité que l'objectif soit atteint ; null quand la situation est « insuffisant ».
  score: Proba.nullable(),
  // Complément 4 (14 h 05) : le score est un rapport de forces, jamais une probabilité.
  score_libelle: z.string().min(1).optional(),
  tendance: TendanceSchema,
  confiance: ConfianceSchema,
  lecture: LectureSchema,
  favorable: z.array(RaisonVerdictSchema),
  bloquant: z.array(RaisonVerdictSchema),
  cause_du_changement: CauseDuChangementSchema.nullable(),
});
export type VerdictObjectif = z.infer<typeof VerdictObjectifSchema>;

// Bloc 1 : verdicts proposés, le cabinet décide.
export const VerdictSchema = z.object({
  meta: MetaSchema,
  verdicts: z
    .array(VerdictObjectifSchema)
    .min(1)
    .refine((v) => v.filter((x) => x.objectif_rang === 1).length === 1, { message: "exactement un verdict pour l'objectif de rang 1" })
    .refine((v) => new Set(v.map((x) => x.objectif_rang)).size === v.length, { message: "objectif_rang en double" }),
});
export type Verdict = z.infer<typeof VerdictSchema>;
