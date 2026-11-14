// Rédaction vérifiée : passe par `redigerVerifie` de P8 (pipeline/lib/llm.ts) avec
// le prompt de X3 quand les deux existent et que FEATHERLESS_API_KEY est posée ;
// sinon gabarit local. Tout texte rendu a passé le vérificateur de chiffres.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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

export function forcerGabarit(v: boolean) {
  forceGabarit = v;
}

export function raisonDuGabarit(): string {
  return raisonGabarit;
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

function resultatGabarit(gabarit: string, fautifs: string[] = []): Redige {
  const chiffres = chiffresDe(gabarit);
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
  chiffresAutorises?: string[];
  etiquette: string;
}): Promise<Redige> {
  const m = await chargerLlm();
  if (!m || !args.prompt) {
    if (m && !args.prompt) noter(`${args.etiquette} : prompt de X3 absent, gabarit`);
    return resultatGabarit(args.gabarit);
  }
  const autorises = args.chiffresAutorises ?? chiffresDe(JSON.stringify(args.entree));
  const prompt = `${args.prompt}\n\nChamp demandé : ${args.champ}\n\nEntrée (JSON) :\n${JSON.stringify(args.entree, null, 1)}`;
  try {
    const r = await m.redigerVerifie(prompt, autorises, args.gabarit);
    const fautifs: string[] = Array.isArray(r?.fautifs) ? r.fautifs : [];
    if (r && r.mode === "llm" && typeof r.texte === "string" && r.texte.trim().length > 0) {
      const chiffres: string[] = Array.isArray(r.chiffres_utilises) && r.chiffres_utilises.length > 0 ? r.chiffres_utilises : autorises;
      const verif = verifierChiffres(r.texte, chiffres);
      if (verif.ok) {
        return { texte: r.texte.trim(), mode: "llm", modele: m.MODELE ?? m.MODEL ?? MODELE_PAR_DEFAUT, chiffres_utilises: chiffres, verifie: true, fautifs };
      }
      noter(`${args.etiquette} : sortie llm refusée par le vérificateur (${verif.fautifs.join(", ")}), gabarit`);
      return resultatGabarit(args.gabarit, verif.fautifs);
    }
    noter(`${args.etiquette} : llm en échec après 3 essais${fautifs.length ? ` (jetons fautifs : ${fautifs.join(", ")})` : ""}, gabarit`);
    return resultatGabarit(args.gabarit, fautifs);
  } catch (e) {
    noter(`${args.etiquette} : erreur llm (${String(e).slice(0, 120)}), gabarit`);
    return resultatGabarit(args.gabarit);
  }
}
