// Nombres d'un texte, au format attendu par `chiffres_utilises` (règle 5.13).
// On réutilise le vérificateur de P8 (pipeline/lib/verif.ts, ré-exporté par qa/verif.ts) pour être cohérent avec `bun run check`.

import { extraireJetons, extraireMotsNombres, normaliser, verifierChiffres } from "../../lib/verif";

/** Tous les nombres d'un ou plusieurs textes, en chaînes (« 806 », « 0.86 », « 1000000 »). */
export function chiffresDe(...textes: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const t of textes) {
    if (!t) continue;
    const n = normaliser(t);
    for (const j of extraireJetons(n)) out.add(String(j.valeur));
    for (const j of extraireMotsNombres(n)) out.add(String(j.valeur));
  }
  return [...out];
}

export { verifierChiffres };
