import { z } from "zod";
import { MetaSchema, SourceSchema } from "./meta";
import { ModeSchema } from "./enums";
import { ObjectifsSchema } from "./config";

// Bloc 5 : compte rendu. `client` et `objectifs` sont recopiés depuis config.json.
export const NoteSchema = z.object({
  meta: MetaSchema,
  client: z.string().min(1),
  objectifs: ObjectifsSchema,
  // Environ 150 mots ; chaque nombre du texte figure dans chiffres_utilises.
  texte: z.string().min(1),
  chiffres_utilises: z.array(z.string()),
  sources: z.array(SourceSchema),
  limites: z.string(),
  mode: ModeSchema,
  // null en mode gabarit.
  modele: z.string().nullable(),
  verifie: z.boolean(),
});
export type Note = z.infer<typeof NoteSchema>;
