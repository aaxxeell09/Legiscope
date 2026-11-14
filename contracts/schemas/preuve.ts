import { z } from "zod";
import { SourceSchema } from "./meta";
import { NaturePreuveSchema } from "./enums";

// Bloc commun « pourquoi » (rendu-final.md, règle de fiabilité) : chaque élément
// affiché porte sa source et son raisonnement en une à trois phrases.
export const PreuveSchema = z.object({
  sources: z.array(SourceSchema).min(1),
  raisonnement: z.string().min(1),
  // On sépare ce qu'on sait (fait publié) de ce qu'on déduit et de ce qu'on ignore.
  nature: NaturePreuveSchema,
});
export type Preuve = z.infer<typeof PreuveSchema>;
