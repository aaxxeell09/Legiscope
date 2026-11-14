import { z } from "zod";
import { DateISO, MetaSchema, Url } from "./meta";
import { LieuSchema } from "./enums";

export const DebatSchema = z.object({
  date: DateISO,
  lieu: LieuSchema,
  texte_id: z.string().min(1),
  citation: z.string().min(1),
  url: Url,
});
export type Debat = z.infer<typeof DebatSchema>;

export const CouvertureDebatsSchema = z.object({
  comptes_rendus_lus: z.number().int().nonnegative(),
});
export type CouvertureDebats = z.infer<typeof CouvertureDebatsSchema>;

export const DebatsSchema = z.object({
  meta: MetaSchema,
  depute_id: z.string().min(1),
  debats: z.array(DebatSchema),
  couverture: CouvertureDebatsSchema,
});
export type Debats = z.infer<typeof DebatsSchema>;
