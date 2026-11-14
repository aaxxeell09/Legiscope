// Classement d'une prise de parole pour ou contre la mesure (pas l'objectif du client), par le modèle
// Featherless via le client partagé de P8 (`pipeline/lib/llm.ts`, sortie structurée par outil), avec cache
// sur disque. Sans FEATHERLESS_API_KEY, rien n'est appelé : les arguments viennent du seul repli manuel,
// pipeline/debats/classement-manuel/<dossier>.json (même format, relu par une personne), et meta.limits le dit.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { DossierConfig } from "../../contracts";
import { appelStructure, cleDisponible, LLMIndisponible, MODELE } from "../lib/llm";
import { RAW } from "./contexte";
import { citationDansSource } from "./texte";
import type { Intervention } from "./types";

export const ClassementSchema = z.object({
  sur_le_sujet: z.boolean().describe("true si l'orateur prend position sur la mesure elle-même"),
  camp: z.enum(["pour", "contre", "neutre"]).describe("pour = défend ou soutient la mesure ; contre = s'y oppose ou veut la supprimer, la réduire, la reporter ; neutre = pas de position"),
  argument: z.string().describe("L'argument en une ligne, 120 caractères au plus, sans nom d'orateur, formulé comme une raison (ex. « La taxe pèse sur les ménages modestes »)"),
  citation: z.string().describe("1 à 3 phrases entières recopiées MOT POUR MOT depuis le texte, sans rien changer ni couper au milieu d'une phrase, qui portent l'argument"),
  confiance: z.number().min(0).max(1).describe("entre 0 et 1 : certitude que le camp et l'argument sont justes"),
});
export type Classement = z.infer<typeof ClassementSchema>;

export type ClassementVerifie = Classement & { origine: "modele" | "manuel"; modele: string | null };

export { cleDisponible };
const CONCURRENCE = Number(process.env.FEATHERLESS_CONCURRENCE ?? "2");

function consigne(dossier: DossierConfig): string {
  return [
    "Tu lis une prise de parole d'un débat parlementaire français (séance publique ou commission des finances).",
    `La mesure étudiée : ${dossier.mesure.label} (sujet : ${dossier.sujet.label}).`,
    "Tu dois dire si l'orateur prend position sur CETTE mesure, dans quel camp, et avec quel argument.",
    "« pour » = il défend, soutient ou veut renforcer la mesure. « contre » = il s'y oppose, veut la supprimer, la réduire, la reporter ou dit qu'elle ne marchera pas.",
    "Ne juge jamais par rapport à un client ou à un objectif : seulement par rapport à la mesure.",
    "Un orateur peut critiquer la mesure tout en étant protectionniste : c'est « contre ». Un orateur qui soutient la mesure en regrettant qu'elle n'aille pas assez loin est « pour ».",
    "Si la prise de parole ne porte pas sur la mesure (autre sujet, procédure, question sans position), mets sur_le_sujet=false et camp=neutre.",
    "La citation doit être recopiée exactement, phrases entières, 1 à 3 phrases, prise dans le texte fourni.",
  ].join("\n");
}

/** Un appel au modèle via le client partagé de P8 (`appelStructure`). null si le modèle ne répond pas. */
async function appelModele(dossier: DossierConfig, it: Intervention): Promise<Classement | null> {
  const user = `Orateur : ${it.orateur_nom}${it.orateur_qualite ? ` (${it.orateur_qualite})` : ""}, ${it.lieu === "seance" ? "séance publique" : "commission des finances"} du ${it.date}.\n\nTexte :\n${it.texte}`;
  try {
    return await appelStructure(consigne(dossier), user, ClassementSchema);
  } catch (e) {
    if (e instanceof LLMIndisponible) return null;
    throw e;
  }
}

type Cache = Record<string, Classement | null>;

function fichierCache(dossierId: string): string {
  mkdirSync(join(RAW, "debats"), { recursive: true });
  return join(RAW, "debats", `classement-${dossierId}.json`);
}

function lireManuel(dossierId: string): Record<string, Classement> {
  const f = join(import.meta.dir, "classement-manuel", `${dossierId}.json`);
  if (!existsSync(f)) return {};
  const j = JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>;
  const out: Record<string, Classement> = {};
  for (const [k, v] of Object.entries(j)) {
    if (k.startsWith("_")) continue;
    const r = ClassementSchema.safeParse(v);
    if (r.success) out[k] = r.data;
  }
  return out;
}

/**
 * Classe toutes les interventions. Priorité : classement manuel relu, puis cache du modèle, puis appel.
 * Ne renvoie que les classements dont la citation est retrouvée mot pour mot dans le texte source.
 */
export async function classerTout(
  dossier: DossierConfig,
  interventions: Intervention[],
  log: (s: string) => void,
): Promise<{ resultats: Map<string, ClassementVerifie>; modeleUtilise: boolean; rejets: number; appels: number }> {
  const resultats = new Map<string, ClassementVerifie>();
  const manuel = lireManuel(dossier.id);
  const fc = fichierCache(dossier.id);
  const cache: Cache = existsSync(fc) ? JSON.parse(readFileSync(fc, "utf8")) : {};
  let rejets = 0;
  let appels = 0;
  const aAppeler: Intervention[] = [];

  for (const it of interventions) {
    if (manuel[it.id]) {
      const c = manuel[it.id];
      if (citationDansSource(c.citation, it.texte)) resultats.set(it.id, { ...c, origine: "manuel", modele: null });
      else { rejets += 1; log(`manuel ${it.id} : citation introuvable dans le texte, rejetée`); }
      continue;
    }
    if (it.id in cache) {
      const c = cache[it.id];
      if (c && citationDansSource(c.citation, it.texte)) resultats.set(it.id, { ...c, origine: "modele", modele: MODELE });
      else if (c) rejets += 1;
      continue;
    }
    aAppeler.push(it);
  }

  const modeleUtilise = cleDisponible() && aAppeler.length > 0;
  if (aAppeler.length > 0 && !cleDisponible()) {
    log(`${aAppeler.length} interventions non classées : FEATHERLESS_API_KEY absente`);
    return { resultats, modeleUtilise: false, rejets, appels };
  }

  let i = 0;
  const sauver = () => writeFileSync(fc, JSON.stringify(cache, null, 2));
  const worker = async () => {
    while (i < aAppeler.length) {
      const it = aAppeler[i++];
      try {
        const c = await appelModele(dossier, it);
        appels += 1;
        cache[it.id] = c;
        if (c && citationDansSource(c.citation, it.texte)) resultats.set(it.id, { ...c, origine: "modele", modele: MODELE });
        else if (c) { rejets += 1; log(`modèle ${it.id} : citation non retrouvée mot pour mot, rejetée`); }
        if (appels % 10 === 0) { sauver(); log(`classement ${appels}/${aAppeler.length}`); }
      } catch (e) {
        log(`modèle ${it.id} : ${String(e).slice(0, 200)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCE) }, worker));
  sauver();
  return { resultats, modeleUtilise, rejets, appels };
}
