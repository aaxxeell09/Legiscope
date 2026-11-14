import { z } from "zod";
import { DateISO, MetaSchema, Proba, Url } from "./meta";
import { BasePivotSchema, PositionSchema, VoteSchema } from "./enums";

export const EcartSchema = z.object({
  scrutin_id: z.string().min(1),
  date: DateISO,
  titre: z.string().min(1),
  vote: VoteSchema,
  // null = le groupe n'avait pas de position majoritaire sur ce scrutin.
  position_groupe: PositionSchema.nullable(),
  groupe_id_au_vote: z.string().min(1),
  url: Url,
});
export type Ecart = z.infer<typeof EcartSchema>;

export const PivotSchema = z.object({
  id: z.string().min(1),
  groupe_id: z.string().min(1),
  rang: z.number().int().positive(),
  score_imprevisibilite: Proba,
  loyaute_12m: Proba,
  base: BasePivotSchema,
  ecarts: z.array(EcartSchema),
});
export type Pivot = z.infer<typeof PivotSchema>;

export const PivotsSchema = z.object({
  meta: MetaSchema,
  // Entre 5 et 15 députés, triés par rang.
  deputes: z
    .array(PivotSchema)
    .min(5)
    .max(15)
    .refine((d) => d.every((p, i) => i === 0 || d[i - 1].rang <= p.rang), {
      message: "les pivots doivent être triés par rang croissant",
    }),
});
export type Pivots = z.infer<typeof PivotsSchema>;
