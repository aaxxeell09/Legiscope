import { z } from "zod";
import { MetaSchema } from "./meta";

// Liste des fiches disponibles ; le front grise un pivot listé dans `absents`
// et ne plante jamais sur une fiche manquante.
export const FichesIndexSchema = z.object({
  meta: MetaSchema,
  disponibles: z.array(z.string().min(1)),
  absents: z.array(z.string().min(1)),
});
export type FichesIndex = z.infer<typeof FichesIndexSchema>;
