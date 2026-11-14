import { z } from "zod";
import { DateISO, MetaSchema, MonthISO, Proba, Url } from "./meta";
import { EventTypeSchema } from "./enums";

// accord = part des scrutins du mois où les deux groupes ont une position
// majoritaire non nulle et identique ; null quand n_scrutins vaut 0.
export const CohesionPointSchema = z
  .object({
    month: MonthISO,
    accord: Proba.nullable(),
    n_scrutins: z.number().int().nonnegative(),
  })
  .refine((p) => (p.n_scrutins === 0) === (p.accord === null), {
    message: "accord doit être null si et seulement si n_scrutins vaut 0",
    path: ["accord"],
  });
export type CohesionPoint = z.infer<typeof CohesionPointSchema>;

export const CohesionPairSchema = z.object({
  a: z.string().min(1),
  b: z.string().min(1),
  series: z.array(CohesionPointSchema).min(1),
});
export type CohesionPair = z.infer<typeof CohesionPairSchema>;

export const CohesionEventSchema = z.object({
  date: DateISO,
  type: EventTypeSchema,
  label: z.string().min(1),
  url: Url,
  dossier_id: z.string().optional(),
});
export type CohesionEvent = z.infer<typeof CohesionEventSchema>;

export const CohesionSignalSchema = z.object({
  date: DateISO,
  pair: z.tuple([z.string(), z.string()]),
  drop: z.number().max(0),
  label: z.string().min(1),
  suivi_de_censure: z.boolean(),
});
export type CohesionSignal = z.infer<typeof CohesionSignalSchema>;

export const CohesionSchema = z.object({
  meta: MetaSchema,
  periode: z.object({ from: MonthISO, to: MonthISO }),
  pairs: z.array(CohesionPairSchema).min(1),
  events: z.array(CohesionEventSchema),
  signals: z.array(CohesionSignalSchema),
});
export type Cohesion = z.infer<typeof CohesionSchema>;
