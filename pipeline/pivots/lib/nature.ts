// Nature d'un amendement vis-à-vis de la mesure : supprime, reduit, reporte, aggrave, autre.
// Règle d'abord ; le reste par appelStructure (P8) avec contrôle (la citation doit figurer mot pour mot dans le dispositif ou l'exposé).
// Résultats du modèle mis en cache (pipeline/pivots/.cache/nature.json) pour que la relance soit gratuite et stable.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CACHE, sansAccents } from "./opendata";
import type { AmdtSujet } from "./sujet";
import { appelStructure, cleDisponible } from "../../lib/llm";

export type Nature = "supprime" | "reduit" | "reporte" | "aggrave" | "autre";
export type NatureMode = "regle" | "llm" | "defaut";

const RE_REPORT = /\b(report|differ|entree en vigueur|date d.application|a compter du|1er (janvier|mars|juillet) 20\d\d)/;

/** Règle : suppression, montant remplacé, ou sens lu par P3 (création, réduction, renforcement). */
export function natureParRegle(a: AmdtSujet): Nature | null {
  const disp = sansAccents(a.dispositif);
  if (/^supprimer cet article/.test(disp) && a.sur_mesure) return "supprime";
  if (/^supprimer cet article/.test(disp)) return a.sens === -1 ? "supprime" : null;
  // Montant ou taux remplacé : la règle lit le sens sans ambiguïté.
  if (/^releve le montant/.test(sansAccents(a.sens_raison))) return "aggrave";
  if (/^abaisse le montant/.test(sansAccents(a.sens_raison))) return "reduit";
  return null;
}

const CHEMIN = join(CACHE, "nature.json");
const cache: Record<string, { nature: Nature; mode: NatureMode }> = existsSync(CHEMIN) ? JSON.parse(readFileSync(CHEMIN, "utf8")) : {};

const Sortie = z.object({
  nature: z.enum(["supprime", "reduit", "reporte", "aggrave", "autre"]),
  citation: z.string(),
});

const SYSTEM =
  "Tu classes un amendement parlementaire par son effet sur une mesure fiscale précise. " +
  "supprime : retire la mesure. reduit : diminue son montant, son taux ou son assiette, ajoute une exonération ou une exclusion. " +
  "reporte : repousse son entrée en vigueur ou son application. aggrave : l'étend, la relève ou la crée. autre : rédactionnel, sans lien avec la mesure, ou incertain. " +
  "Tu recopies dans citation un extrait exact (10 à 120 caractères) du dispositif ou de l'exposé qui justifie ton choix. En cas de doute : autre.";

/** Classe une liste en parallèle (concurrence limitée) ; résultats dans l'ordre. */
export async function naturesEnLot(as: AmdtSujet[], mesure: string, concurrence = 4) {
  const res = new Map<string, { nature: Nature; mode: NatureMode }>();
  let i = 0;
  await Promise.all(Array.from({ length: concurrence }, async () => {
    while (i < as.length) { const a = as[i++]; res.set(a.id, await natureAmendement(a, mesure)); }
  }));
  return res;
}

export async function natureAmendement(a: AmdtSujet, mesure: string): Promise<{ nature: Nature; mode: NatureMode }> {
  const r = natureParRegle(a);
  if (r) return { nature: r, mode: "regle" };
  if (!a.pertinent && a.typeAuteur === "Député") return { nature: "autre", mode: "defaut" };
  if (cache[a.id]) return cache[a.id];
  if (!cleDisponible()) return { nature: "autre", mode: "defaut" };
  let res: { nature: Nature; mode: NatureMode } = { nature: "autre", mode: "defaut" };
  try {
    const o = await appelStructure(
      SYSTEM,
      `Mesure : ${mesure}\nArticle visé : ${a.article}\nDispositif : ${a.dispositif.slice(0, 2500)}\nExposé : ${a.expose.slice(0, 1200)}`,
      Sortie,
    );
    // Contrôle : la citation doit figurer dans le dispositif (espaces et casse normalisés).
    const norm = (s: string) => sansAccents(s).replace(/[^a-z0-9]+/g, " ").trim();
    const ok = o.citation.length >= 8 && (norm(a.dispositif).includes(norm(o.citation)) || norm(a.expose).includes(norm(o.citation)));
    res = ok && o.nature !== "autre" ? { nature: o.nature, mode: "llm" } : { nature: "autre", mode: "defaut" };
  } catch {
    res = { nature: "autre", mode: "defaut" };
  }
  cache[a.id] = res;
  writeFileSync(CHEMIN, JSON.stringify(cache, null, 1));
  return res;
}
