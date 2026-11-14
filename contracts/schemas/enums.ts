import { z } from "zod";

// Vocabulaire unique (PLAN.md, section 5). Ne jamais dupliquer ces listes ailleurs.

export const SortSchema = z.enum(["en_attente", "adopte", "rejete", "retire", "tombe", "non_examine", "non_soutenu", "irrecevable"]);
export type Sort = z.infer<typeof SortSchema>;

export const VoteSchema = z.enum(["pour", "contre", "abstention", "non_votant"]);
export type Vote = z.infer<typeof VoteSchema>;

// `position` est nullable là où elle est utilisée (null = pas de position majoritaire).
export const PositionSchema = z.enum(["pour", "contre", "abstention", "divise"]);
export type Position = z.infer<typeof PositionSchema>;

export const RoleAuditionSchema = z.enum(["rapporteur", "rapporteur_general", "rapporteur_avis", "president", "membre"]);
export type RoleAudition = z.infer<typeof RoleAuditionSchema>;

export const LieuSchema = z.enum(["seance", "commission"]);
export type Lieu = z.infer<typeof LieuSchema>;

export const TypeOrganisationSchema = z.enum(["entreprise", "federation", "cabinet", "association", "administration", "syndicat", "autre"]);
export type TypeOrganisation = z.infer<typeof TypeOrganisationSchema>;

export const ModeSchema = z.enum(["llm", "gabarit"]);
export type Mode = z.infer<typeof ModeSchema>;

// Enums secondaires, eux aussi fixés en section 5.
export const EventTypeSchema = z.enum(["censure", "49-3", "dissolution", "nomination", "vote"]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const BasePivotSchema = z.enum(["sujet", "general"]);
export type BasePivot = z.infer<typeof BasePivotSchema>;

export const RoleAmendementSchema = z.enum(["auteur", "cosignataire"]);
export type RoleAmendement = z.infer<typeof RoleAmendementSchema>;

export const EtatDossierSchema = z.enum(["en_cours", "clos"]);
export type EtatDossier = z.infer<typeof EtatDossierSchema>;

export const DatasetSchema = z.enum(["live", "fixtures"]);
export type Dataset = z.infer<typeof DatasetSchema>;

// Enums du tableau de bord (rendu-final.md, cinq blocs).
export const PositionCibleSchema = z.enum(["pour", "contre"]);
export type PositionCible = z.infer<typeof PositionCibleSchema>;

export const VerdictValeurSchema = z.enum(["bonne_voie", "incertain", "mal_engage"]);
export type VerdictValeur = z.infer<typeof VerdictValeurSchema>;

export const TendanceSchema = z.enum(["amelioration", "stable", "degradation"]);
export type Tendance = z.infer<typeof TendanceSchema>;

export const TypeEvenementSchema = z.enum([
  "amendement_depose", "amendement_sort", "scrutin", "rapport", "audition", "seance", "commission", "hatvp", "agenda",
]);
export type TypeEvenement = z.infer<typeof TypeEvenementSchema>;

export const LieuEcheanceSchema = z.enum(["seance", "commission", "senat", "cmp", "autre"]);
export type LieuEcheance = z.infer<typeof LieuEcheanceSchema>;

export const StatutEtapeSchema = z.enum(["fait", "en_cours", "a_venir"]);
export type StatutEtape = z.infer<typeof StatutEtapeSchema>;

export const StatutArticleSchema = z.enum(["vote", "reste", "supprime"]);
export type StatutArticle = z.infer<typeof StatutArticleSchema>;

export const SituationSchema = z.enum(["favorable", "incertaine", "defavorable", "insuffisant"]);
export type Situation = z.infer<typeof SituationSchema>;

export const NiveauConfianceSchema = z.enum(["elevee", "moyenne", "faible"]);
export type NiveauConfiance = z.infer<typeof NiveauConfianceSchema>;

// fait = publié par l'Assemblée ; deduction = produit par l'outil ; inconnue = on ne sait pas.
export const NaturePreuveSchema = z.enum(["fait", "deduction", "inconnue"]);
export type NaturePreuve = z.infer<typeof NaturePreuveSchema>;

export const EffetSchema = z.enum(["renforce", "affaiblit", "neutre"]);
export type Effet = z.infer<typeof EffetSchema>;

export const RoleDecideurSchema = z.enum(["rapporteur", "rapporteur_general", "rapporteur_avis", "gouvernement", "chef_de_file", "president_commission"]);
export type RoleDecideur = z.infer<typeof RoleDecideurSchema>;

export const PositionDecideurSchema = z.enum(["pour", "contre", "inconnue"]);
export type PositionDecideur = z.infer<typeof PositionDecideurSchema>;

// Sur quoi un député est classé : ses propres actes seulement, jamais son groupe seul.
export const FondementSchema = z.enum(["dit", "depose", "vote"]);
export type Fondement = z.infer<typeof FondementSchema>;

// Compléments d'Axel, 14 h 05.
export const AuteurTypeSchema = z.enum(["depute", "gouvernement", "commission"]);
export type AuteurType = z.infer<typeof AuteurTypeSchema>;
export const NatureAmendementSchema = z.enum(["supprime", "reduit", "reporte", "aggrave", "autre"]);
export type NatureAmendement = z.infer<typeof NatureAmendementSchema>;
export const NatureModeSchema = z.enum(["regle", "llm", "defaut"]);
export type NatureMode = z.infer<typeof NatureModeSchema>;
export const TexteStatutSchema = z.enum(["en_discussion", "adopte", "rejete", "retire"]);
export type TexteStatut = z.infer<typeof TexteStatutSchema>;
