// Gabarits de secours : ceux de X3, lus dans pipeline/fiches/prompts/gabarit-synthese.md et
// pipeline/action/prompts/gabarit-contre-argument.md (blocs ```gabarit id=...```, variables {{x}}).
// Copie identique en dur si un fichier manque. Les gabarits n'ajoutent aucun nombre : tout chiffre
// du texte vient d'une variable injectée.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Lieu, PositionCible, Sort } from "../../../contracts/index";
import { chiffresDe } from "./chiffres";
import { dateFr } from "./io";

export const SORT_LIBELLE: Record<Sort, string> = {
  en_attente: "en attente",
  adopte: "adopté",
  rejete: "rejeté",
  retire: "retiré",
  tombe: "tombé",
  non_examine: "non examiné",
  non_soutenu: "non soutenu",
  irrecevable: "irrecevable",
};
export const LIEU_LIBELLE: Record<Lieu, string> = { seance: "séance publique", commission: "commission" };
const LIEU_MOT: Record<Lieu, string> = { seance: "séance", commission: "commission" };

const RACINE = resolve(import.meta.dir, "../../..");
const GABARITS_PAR_DEFAUT: Record<string, string> = {
  "position.depose": "A {{role_verbe}} l'amendement n° {{numero}}, {{sort_mot}} (« {{resume}} »).",
  "position.dit": "A dit en {{lieu_mot}} le {{date_debat}} : « {{citation}} »",
  "position.vote": "A voté autrement que son groupe sur {{n_ecarts}} scrutin{{s}} lié{{s}} au sujet ; loyauté à son groupe sur un an : {{loyaute}}.",
  "position.inconnue": "Position personnelle non connue : aucun amendement, aucune intervention et aucun écart de vote relevés sur la mesure.",
  "argument.depose_dit": "Présenter à ce député la position du client ({{client}}) en partant de son amendement n° {{numero}} et de sa déclaration du {{date_debat}} en {{lieu_mot}} : « {{citation}} »",
  "argument.depose": "Présenter à ce député la position du client ({{client}}) en partant de son amendement n° {{numero}} (« {{resume}} »).",
  "argument.dit": "Présenter à ce député la position du client ({{client}}) en partant de sa déclaration du {{date_debat}} en {{lieu_mot}} : « {{citation}} »",
  "argument.auditions": "Présenter à ce député la position du client ({{client}}) : il a déjà entendu {{organisations}} sur ce texte.",
  "argument.contact": "Présenter à ce député la position du client ({{client}}) sur la mesure : aucun acte personnel relevé, premier contact à établir.",
  "contre_argument.allie": "À l'argument « {{repond_a}} », opposer celui déjà entendu en {{lieu_mot}} le {{date_allie}} : « {{argument_allie}} ». Citation à reprendre : « {{citation_allie}} »",
  "contre_argument.vide": "À l'argument « {{repond_a}} », aucun argument du camp du client n'a encore été entendu dans les débats. Réponse à construire avec les chiffres du dossier.",
};

const cache = new Map<string, Map<string, string>>();
/** Blocs ```gabarit id=X ... ``` d'un fichier de X3 (chemin relatif à la racine du dépôt). */
export function lireGabaritsMd(relatif: string): Map<string, string> {
  if (cache.has(relatif)) return cache.get(relatif)!;
  const out = new Map<string, string>();
  const chemin = resolve(RACINE, relatif);
  if (existsSync(chemin)) {
    const md = readFileSync(chemin, "utf8");
    for (const m of md.matchAll(/```gabarit id=([\w.]+)\n([\s\S]*?)\n```/g)) out.set(m[1], m[2].trim());
  }
  cache.set(relatif, out);
  return out;
}

export function gabarit(relatif: string, id: string): { texte: string; origine: "x3" | "local" } {
  const t = lireGabaritsMd(relatif).get(id);
  if (t) return { texte: t, origine: "x3" };
  return { texte: GABARITS_PAR_DEFAUT[id] ?? "", origine: "local" };
}

export function remplir(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

export function sansPoint(s: string): string {
  return s.trim().replace(/[.。]+$/, "");
}

function dec(n: number): string {
  return String(n).replace(".", ",");
}

export type EntreeSynthese = {
  depute: { id: string; nom: string; prenom: string; groupe_sigle: string | null };
  mesure: string;
  client: string;
  position_cible: PositionCible;
  position_groupe: { position: string | null; confiance: number } | null;
  amendements: { numero: string | null; role: "auteur" | "cosignataire"; resume: string; sort: Sort; travaille_avec: string[]; id?: string }[];
  debats: { date: string; lieu: Lieu; citation: string }[];
  auditions: { date: string; role: string; organisations: string[] }[];
};
export type EcartsPivot = { n_ecarts: number; loyaute_12m: number } | null;
export type Gabarise = { position_probable: string; argument: string; chiffres: string[]; origine: "x3" | "local" };

const MD_SYNTHESE = "pipeline/fiches/prompts/gabarit-synthese.md";
const MD_CONTRE = "pipeline/action/prompts/gabarit-contre-argument.md";

/** Synthèse selon le gabarit de X3 : k = premier amendement auteur sinon le premier ; j = débat le plus récent. */
export function gabaritSynthese(e: EntreeSynthese, pivot: EcartsPivot): Gabarise {
  const k = e.amendements.find((a) => a.role === "auteur") ?? e.amendements[0] ?? null;
  const j = [...e.debats].sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null;
  const numero = k ? k.numero ?? (k.id?.match(/N0*(\d+)$/)?.[1] ?? "") : "";
  const organisations = [...new Set(e.auditions.flatMap((a) => a.organisations))].slice(0, 3).join(", ");
  const nEcarts = pivot?.n_ecarts ?? 0;
  const vars: Record<string, string> = {
    client: e.client,
    role_verbe: k?.role === "cosignataire" ? "cosigné" : "déposé",
    numero,
    sort_mot: k ? SORT_LIBELLE[k.sort] : "",
    resume: k ? sansPoint(k.resume) : "",
    date_debat: j ? dateFr(j.date) : "",
    lieu_mot: j ? LIEU_MOT[j.lieu] : "",
    citation: j?.citation ?? "",
    n_ecarts: String(nEcarts),
    s: nEcarts > 1 ? "s" : "",
    loyaute: pivot ? dec(pivot.loyaute_12m) : "",
    organisations,
  };
  const idPosition = k ? "position.depose" : j ? "position.dit" : pivot && nEcarts >= 1 ? "position.vote" : "position.inconnue";
  const idArgument = k && j ? "argument.depose_dit" : k ? "argument.depose" : j ? "argument.dit" : organisations ? "argument.auditions" : "argument.contact";
  const gp = gabarit(MD_SYNTHESE, idPosition);
  const ga = gabarit(MD_SYNTHESE, idArgument);
  const chiffres = new Set<string>();
  const injecter = (id: string, tpl: string) => {
    for (const m of tpl.matchAll(/\{\{(\w+)\}\}/g)) {
      const v = m[1];
      if (v === "date_debat" && j) chiffres.add(j.date);
      else if (v === "n_ecarts") chiffres.add(String(nEcarts));
      else if (v === "loyaute" && pivot) chiffres.add(String(pivot.loyaute_12m));
      else if (v === "s") continue;
      else for (const c of chiffresDe(vars[v])) chiffres.add(c);
    }
  };
  injecter(idPosition, gp.texte);
  injecter(idArgument, ga.texte);
  return {
    position_probable: remplir(gp.texte, vars),
    argument: remplir(ga.texte, vars),
    chiffres: [...chiffres],
    origine: gp.origine === "x3" && ga.origine === "x3" ? "x3" : "local",
  };
}

export type ArgumentEntendu = { argument: string; citation: string; date: string; lieu: Lieu; url?: string };
export type EntreeContreArgument = {
  argument: ArgumentEntendu;
  appuis: ArgumentEntendu[];
  mesure: string;
  client: string;
  position_cible: PositionCible;
};

/** Contre-argument selon le gabarit de X3 : l'adverse d'indice i reçoit l'allié d'indice i modulo le nombre d'alliés. */
export function gabaritContreArgument(e: EntreeContreArgument, indexAdverse: number): { texte: string; appui: ArgumentEntendu | null; chiffres: string[]; origine: "x3" | "local" } {
  const appui = e.appuis.length > 0 ? e.appuis[indexAdverse % e.appuis.length] : null;
  const g = gabarit(MD_CONTRE, appui ? "contre_argument.allie" : "contre_argument.vide");
  const vars: Record<string, string> = {
    repond_a: e.argument.argument,
    argument_allie: appui ? sansPoint(appui.argument) : "",
    citation_allie: appui?.citation ?? "",
    date_allie: appui ? dateFr(appui.date) : "",
    lieu_mot: appui ? LIEU_MOT[appui.lieu] : "",
  };
  const chiffres = new Set<string>(chiffresDe(vars.repond_a));
  if (appui) {
    for (const c of chiffresDe(vars.argument_allie, vars.citation_allie)) chiffres.add(c);
    chiffres.add(appui.date);
  }
  return { texte: remplir(g.texte, vars), appui, chiffres: [...chiffres], origine: g.origine };
}
