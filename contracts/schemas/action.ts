import { z } from "zod";
import { DateISO, MetaSchema, Proba, Url } from "./meta";
import { FondementSchema, LieuSchema, ModeSchema, PositionDecideurSchema, RoleDecideurSchema } from "./enums";
import { PreuveSchema } from "./preuve";

// Un député n'est classé que sur ce qu'il a lui-même dit, déposé ou voté, jamais sur son groupe seul.
export const DeputeActionSchema = z
  .object({
    depute_id: z.string().min(1),
    groupe_id: z.string().min(1),
    score: Proba,
    raison: z.string().min(1),
    // true = une fiche existe dans fiches/index.json.
    fiche: z.boolean(),
    fondement: z.array(FondementSchema),
    // false = position non connue, et on l'écrit.
    position_connue: z.boolean(),
    preuve: PreuveSchema,
  })
  .refine((d) => d.position_connue === d.fondement.length > 0, {
    message: "position_connue vaut true si et seulement si fondement est non vide",
    path: ["position_connue"],
  });
export type DeputeAction = z.infer<typeof DeputeActionSchema>;

// Ceux qui décident sur la mesure : rapporteur, gouvernement, chef de file, président de commission.
export const DecideurSchema = z.object({
  role: RoleDecideurSchema,
  // null pour le gouvernement.
  depute_id: z.string().nullable(),
  nom: z.string().min(1),
  groupe_id: z.string().nullable(),
  position: PositionDecideurSchema,
  preuve: PreuveSchema,
});
export type Decideur = z.infer<typeof DecideurSchema>;

// « pour » et « contre » sont relatifs à la MESURE, pas à l'objectif du client.
export const ArgumentSchema = z.object({
  argument: z.string().min(1),
  citation: z.string().min(1),
  orateur_id: z.string().nullable(),
  groupe_id: z.string().nullable(),
  date: DateISO,
  lieu: LieuSchema,
  url: Url,
  preuve: PreuveSchema,
});
export type Argument = z.infer<typeof ArgumentSchema>;

export const ContreArgumentSchema = z.object({
  texte: z.string().min(1),
  // L'argument adverse auquel il répond (son champ `argument`).
  repond_a: z.string().min(1),
  chiffres_utilises: z.array(z.string()),
  mode: ModeSchema,
  verifie: z.boolean(),
  preuve: PreuveSchema,
});
export type ContreArgument = z.infer<typeof ContreArgumentSchema>;

// Bloc 4 : sur qui agir, avec quels arguments.
export const ActionSchema = z.object({
  meta: MetaSchema,
  decideurs: z.array(DecideurSchema),
  groupes: z.object({
    actionnables: z.array(DeputeActionSchema),
    allies: z.array(DeputeActionSchema),
    perdus: z.array(DeputeActionSchema),
  }),
  arguments: z.object({
    pour: z.array(ArgumentSchema),
    contre: z.array(ArgumentSchema),
  }),
  contre_arguments: z.array(ContreArgumentSchema),
});
export type Action = z.infer<typeof ActionSchema>;
