// Jeu Hémicycle `evenements_parlementaires` (flux des 30 derniers jours par texte),
// autorisé pour A4 par P0 (13 h 35) : 5 crédits par page de 200 lignes, plafond 300.
// Réponse mise en cache dans pipeline/fiches/.cache/ (ignoré par git) ; `--api` rafraîchit.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { noter } from "./io";

export type LigneEvenement = {
  event_type: string;
  event_date: string;
  titre: string;
  sous_titre: string | null;
  statut: string | null;
  texte_uid: string;
  nb: number;
  payload: any;
  item_key: string;
};
export type EvenementsTexte = { lignes: LigneEvenement[]; consulte_le: string | null; provenance: "api" | "cache" };

const CACHE = resolve(import.meta.dir, "../.cache");
export const creditsConsommes = { appels: 0, credits: 0 };

export async function lireEvenementsTexte(texteId: string, rafraichir: boolean): Promise<EvenementsTexte | null> {
  const chemin = join(CACHE, `evenements-${texteId}.json`);
  if (rafraichir) {
    try {
      const h = await import(resolve(import.meta.dir, "../../collecte/lib/hemicycle.ts"));
      if (!h.cleDisponible()) noter("evenements_parlementaires : HEMICYCLE_API_KEY absente, cache seul");
      else {
        const r = await h.api("POST", "/jeux/interroger", { jeu: "evenements_parlementaires", filtres: [{ colonne: "texte_uid", op: "eq", valeur: texteId }], limite: 200 });
        creditsConsommes.appels += 1;
        creditsConsommes.credits += r.cost;
        if (r.status === 200 && Array.isArray(r.json?.lignes)) {
          mkdirSync(CACHE, { recursive: true });
          writeFileSync(chemin, JSON.stringify(r.json, null, 1));
          noter(`evenements_parlementaires ${texteId} : ${r.json.nombre} lignes, ${r.cost} crédits${r.json.tronque ? ", réponse tronquée à 200 lignes" : ""}`);
        } else noter(`evenements_parlementaires ${texteId} : réponse ${r.status}, cache seul`);
      }
    } catch (e) {
      noter(`evenements_parlementaires ${texteId} : appel impossible (${String(e).slice(0, 100)}), cache seul`);
    }
  }
  if (!existsSync(chemin)) return null;
  try {
    const j = JSON.parse(readFileSync(chemin, "utf8"));
    return { lignes: Array.isArray(j.lignes) ? j.lignes : [], consulte_le: j.consulte_le ?? null, provenance: rafraichir ? "api" : "cache" };
  } catch {
    return null;
  }
}

/** Dates de dépôt lisibles dans les exemples du jeu : identifiant d'amendement → date. */
export function datesDepotDepuisEvenements(ev: EvenementsTexte | null): Map<string, string> {
  const out = new Map<string, string>();
  for (const l of ev?.lignes ?? []) {
    if (l.event_type !== "amendements" || !/^\d{4}-\d{2}-\d{2}$/.test(l.event_date)) continue;
    for (const ex of l.payload?.exemples ?? []) if (typeof ex?.uid === "string" && !out.has(ex.uid)) out.set(ex.uid, l.event_date);
  }
  return out;
}
