import { z } from "zod";
import { MetaSchema, Url } from "./meta";
import { TypeOrganisationSchema } from "./enums";

export const OrganisationHatvpSchema = z.object({
  hatvp_id: z.string().min(1),
  nom: z.string().min(1),
  type: TypeOrganisationSchema,
  fiche_url: Url,
  objet: z.string().min(1),
  actions: z.array(z.string().min(1)),
});
export type OrganisationHatvp = z.infer<typeof OrganisationHatvpSchema>;

export const HatvpSchema = z.object({
  meta: MetaSchema,
  organisations: z.array(OrganisationHatvpSchema),
});
export type Hatvp = z.infer<typeof HatvpSchema>;
