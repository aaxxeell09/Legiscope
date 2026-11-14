import { z } from "zod";

// Formats de dates (ISO 8601). Les identifiants restent des chaînes libres.
export const DateISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date attendue au format AAAA-MM-JJ");
export const MonthISO = z.string().regex(/^\d{4}-\d{2}$/, "mois attendu au format AAAA-MM");
export const DateTimeISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/, "horodatage ISO 8601 attendu");
export const Proba = z.number().min(0).max(1);
export const Url = z.string().url();

export const SourceSchema = z.object({
  label: z.string().min(1),
  url: Url,
});
export type Source = z.infer<typeof SourceSchema>;

// Bloc `meta` porté par chaque fichier. `dossier_id` vaut null pour les fichiers
// de la racine (groupes, deputes, cohesion) et l'identifiant du dossier sinon.
export const MetaSchema = z.object({
  generated_at: DateTimeISO,
  sources: z.array(SourceSchema),
  limits: z.string(),
  producer: z.string().min(1),
  dossier_id: z.string().min(1).nullable(),
});
export type Meta = z.infer<typeof MetaSchema>;
