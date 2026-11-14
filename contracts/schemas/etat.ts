import { z } from "zod";
import { DateISO, MetaSchema, Url } from "./meta";
import { StatutArticleSchema, StatutEtapeSchema } from "./enums";
import { PreuveSchema } from "./preuve";

export const EtapeSchema = z.object({
  nom: z.string().min(1),
  date: DateISO.nullable(),
  statut: StatutEtapeSchema,
  url: Url,
});
export type Etape = z.infer<typeof EtapeSchema>;

export const ArticleSchema = z.object({
  numero: z.string().min(1),
  titre: z.string().min(1),
  statut: StatutArticleSchema,
  sort_detail: z.string(),
  url: Url,
});
export type Article = z.infer<typeof ArticleSchema>;

export const ModificationMesureSchema = z.object({
  date: DateISO,
  par: z.string().min(1),
  quoi: z.string().min(1),
  url: Url,
  preuve: PreuveSchema,
});
export type ModificationMesure = z.infer<typeof ModificationMesureSchema>;

// L'état de la mesure suivie : toujours dans le texte ? dans quelle rédaction ? modifiée par quoi ?
export const EtatMesureSchema = z.object({
  label: z.string().min(1),
  article: z.string().min(1),
  dans_le_texte: z.boolean(),
  redaction_actuelle: z.string().min(1),
  modifications: z.array(ModificationMesureSchema),
});
export type EtatMesure = z.infer<typeof EtatMesureSchema>;

// En fond : où en est la mesure et le texte, ce qui est voté, ce qui reste.
export const EtatSchema = z.object({
  meta: MetaSchema,
  mesure: EtatMesureSchema,
  etape: z.string().min(1),
  etapes: z.array(EtapeSchema).min(1),
  articles: z.array(ArticleSchema),
});
export type Etat = z.infer<typeof EtatSchema>;
