import { z } from "zod";
import { DateISO, MetaSchema, Url } from "./meta";
import { RoleAuditionSchema, TypeOrganisationSchema } from "./enums";

export const OrganisationEntendueSchema = z.object({
  nom: z.string().min(1),
  type: TypeOrganisationSchema,
  hatvp_id: z.string().nullable(),
});
export type OrganisationEntendue = z.infer<typeof OrganisationEntendueSchema>;

export const AuditionSchema = z.object({
  texte_id: z.string().min(1),
  rapport_url: Url.nullable(),
  date: DateISO,
  role: RoleAuditionSchema,
  organisations: z.array(OrganisationEntendueSchema),
});
export type Audition = z.infer<typeof AuditionSchema>;

export const CouvertureAuditionsSchema = z.object({
  rapports_total: z.number().int().nonnegative(),
  rapports_avec_liste: z.number().int().nonnegative(),
});
export type CouvertureAuditions = z.infer<typeof CouvertureAuditionsSchema>;

export const AuditionsSchema = z.object({
  meta: MetaSchema,
  depute_id: z.string().min(1),
  auditions: z.array(AuditionSchema),
  couverture: CouvertureAuditionsSchema,
});
export type Auditions = z.infer<typeof AuditionsSchema>;
