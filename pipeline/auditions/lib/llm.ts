// Pont vers le client Featherless partagé (pipeline/lib/llm.ts, P8) : même modèle,
// même file de concurrence, même compteur de coût. Ici : sortie nulle au lieu d'une exception.
import type { z } from "zod";
import { appelStructure as appelPartage, cleDisponible, coutCumule, LLMIndisponible, MODELE as MODELE_PARTAGE } from "../../lib/llm";

export const MODELE = MODELE_PARTAGE;

export function modeleDisponible(): boolean {
  return cleDisponible() && process.env.AUDITIONS_SANS_MODELE !== "1";
}

export { coutCumule };

/** Appel structuré : null si le modèle est indisponible ou si la sortie ne respecte pas le schéma après deux essais. */
export async function appelStructure<T>(schema: z.ZodType<T>, systeme: string, utilisateur: string, essais = 2): Promise<T | null> {
  if (!modeleDisponible()) return null;
  for (let i = 0; i < essais; i++) {
    try {
      return await appelPartage(systeme, utilisateur, schema);
    } catch (e) {
      if (e instanceof LLMIndisponible) {
        console.warn(`  modèle indisponible : ${e.message}`);
        return null;
      }
      console.warn(`  modèle : ${(e as Error).message}`);
    }
  }
  return null;
}
