// Rédaction vérifiée : passe par `redigerVerifie` de P8 (pipeline/lib/llm.ts) avec
// le prompt de X3 quand les deux existent et que FEATHERLESS_API_KEY est posée ;
// sinon gabarit local. Tout texte rendu a passé le vérificateur de chiffres.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chiffresDe, verifierChiffres } from "./chiffres";
import { noter } from "./io";

export type Redige = {
  texte: string;
  mode: "llm" | "gabarit";
  modele: string | null;
  chiffres_utilises: string[];
  verifie: boolean;
  fautifs: string[];
};

export const RACINE = resolve(import.meta.dir, "../../..");
const CHEMIN_LLM = resolve(RACINE, "pipeline/lib/llm.ts");
const MODELE_PAR_DEFAUT = "Qwen/Qwen3.8-27B";

let moduleLlm: any | null | undefined;
let forceGabarit = false;
let raisonGabarit = "";
let sansCache = false;
const CACHE = resolve(import.meta.dir, "../.cache/redaction");
export const statsCache = { lus: 0, ecrits: 0 };

export function ignorerCache(v: boolean) {
  sansCache = v;
}

function cleCache(prompt: string, champ: string, entree: unknown): string {
  return createHash("sha256").update(`${prompt}\n${champ}\n${JSON.stringify(entree)}`).digest("hex").slice(0, 24);
}

export function forcerGabarit(v: boolean) {
  forceGabarit = v;
}

export function raisonDuGabarit(): string {
  return raisonGabarit;
}

/** Coût cumulé des appels Featherless du processus (P8), null si le modèle n'a pas été chargé. */
export function coutLlm(): { appels: number; dollars: number } | null {
  if (!moduleLlm || typeof moduleLlm.coutCumule !== "function") return null;
  const c = moduleLlm.coutCumule();
  return { appels: Number(c?.appels ?? 0), dollars: Number(c?.dollars ?? 0) };
}

async function chargerLlm(): Promise<any | null> {
  if (moduleLlm !== undefined) return moduleLlm;
  moduleLlm = null;
  if (forceGabarit) raisonGabarit = "gabarit forcé (--gabarit)";
  else if (!process.env.FEATHERLESS_API_KEY) raisonGabarit = "FEATHERLESS_API_KEY absente de .env";
  else if (!existsSync(CHEMIN_LLM)) raisonGabarit = "pipeline/lib/llm.ts (P8) absent";
  else {
    try {
      const m = await import(CHEMIN_LLM);
      if (typeof m.redigerVerifie !== "function") raisonGabarit = "pipeline/lib/llm.ts n'exporte pas redigerVerifie";
      else moduleLlm = m;
    } catch (e) {
      raisonGabarit = `pipeline/lib/llm.ts inchargeable : ${String(e).slice(0, 120)}`;
    }
  }
  if (moduleLlm === null) noter(`mode gabarit : ${raisonGabarit}`);
  else noter("mode llm : pipeline/lib/llm.ts chargé");
  return moduleLlm;
}

/** Contenu d'un prompt de X3 (chemin relatif à la racine du dépôt), null s'il n'existe pas. */
export function lirePrompt(relatif: string): string | null {
  const chemin = resolve(RACINE, relatif);
  if (!existsSync(chemin)) return null;
  const t = readFileSync(chemin, "utf8").trim();
  return t.length > 0 ? t : null;
}

function resultatGabarit(gabarit: string, fautifs: string[] = [], chiffresInjectes?: string[]): Redige {
  const chiffres = [...new Set([...(chiffresInjectes ?? []), ...chiffresDe(gabarit)])];
  return {
    texte: gabarit,
    mode: "gabarit",
    modele: null,
    chiffres_utilises: chiffres,
    verifie: verifierChiffres(gabarit, chiffres).ok,
    fautifs,
  };
}

/**
 * Rédige un champ. `entree` est l'objet JSON passé au modèle ; les chiffres autorisés
 * sont ceux de l'entrée (ou `chiffresAutorises`). Repli : le gabarit.
 */
export async function rediger(args: {
  prompt: string | null;
  champ: string;
  entree: unknown;
  gabarit: string;
  /** Nombres des variables injectées dans le gabarit (liste de X3), recopiés dans chiffres_utilises en mode gabarit. */
  chiffresGabarit?: string[];
  chiffresAutorises?: string[];
  etiquette: string;
}): Promise<Redige> {
  const m = await chargerLlm();
  if (!m || !args.prompt) {
    if (m && !args.prompt) noter(`${args.etiquette} : prompt de X3 absent, gabarit`);
    return resultatGabarit(args.gabarit, [], args.chiffresGabarit);
  }
  const autorises = args.chiffresAutorises ?? chiffresDe(JSON.stringify(args.entree));
  const prompt = `${args.prompt}\n\nChamp demandé : ${args.champ}\n\nEntrée (JSON) :\n${JSON.stringify(args.entree, null, 1)}`;
  // Cache disque : même prompt, même champ, même entrée → même texte, sans rappeler le modèle.
  const fichierCache = join(CACHE, `${cleCache(args.prompt, args.champ, args.entree)}.json`);
  if (!sansCache && existsSync(fichierCache)) {
    try {
      const c = JSON.parse(readFileSync(fichierCache, "utf8")) as Redige;
      if (c.mode === "llm" && verifierChiffres(c.texte, c.chiffres_utilises).ok) {
        statsCache.lus += 1;
        return c;
      }
    } catch { /* cache illisible : on rappelle le modèle */ }
  }
  try {
    const r = await m.redigerVerifie(prompt, autorises, args.gabarit);
    const fautifs: string[] = Array.isArray(r?.fautifs) ? r.fautifs : [];
    if (r && r.mode === "llm" && typeof r.texte === "string" && r.texte.trim().length > 0) {
      const chiffres: string[] = Array.isArray(r.chiffres_utilises) && r.chiffres_utilises.length > 0 ? r.chiffres_utilises : autorises;
      const verif = verifierChiffres(r.texte, chiffres);
      if (verif.ok) {
        const ok: Redige = { texte: r.texte.trim(), mode: "llm", modele: r.modele ?? m.MODELE ?? MODELE_PAR_DEFAUT, chiffres_utilises: chiffres, verifie: true, fautifs };
        try {
          mkdirSync(CACHE, { recursive: true });
          writeFileSync(fichierCache, JSON.stringify(ok, null, 1));
          statsCache.ecrits += 1;
        } catch { /* disque plein : pas de cache */ }
        return ok;
      }
      noter(`${args.etiquette} : sortie llm refusée par le vérificateur (${verif.fautifs.join(", ")}), gabarit`);
      return resultatGabarit(args.gabarit, verif.fautifs, args.chiffresGabarit);
    }
    noter(`${args.etiquette} : llm en échec après ${r?.tentatives ?? 3} essais${fautifs.length ? ` (jetons fautifs : ${fautifs.join(", ")})` : ""}, gabarit`);
    return resultatGabarit(args.gabarit, fautifs, args.chiffresGabarit);
  } catch (e) {
    noter(`${args.etiquette} : erreur llm (${String(e).slice(0, 120)}), gabarit`);
    return resultatGabarit(args.gabarit, [], args.chiffresGabarit);
  }
}
