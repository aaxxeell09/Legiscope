// Gabarits locaux PROVISOIRES (A4), remplis mécaniquement depuis les champs JSON.
// Ils n'ajoutent aucun nombre : tout chiffre du texte vient d'un champ d'entrée.
// À remplacer par les gabarits de X3 (pipeline/fiches/prompts/gabarit-synthese.md,
// pipeline/action/prompts/gabarit-contre-argument.md) dès qu'ils sont utilisables.

import type { Lieu, PositionCible, Sort } from "../../../contracts/index";
import { dateFr } from "./io";

export const SORT_LIBELLE: Record<Sort, string> = {
  en_attente: "en attente",
  adopte: "adopté",
  rejete: "rejeté",
  retire: "retiré",
  tombe: "tombé",
  non_examine: "non examiné",
};

export const LIEU_LIBELLE: Record<Lieu, string> = { seance: "séance publique", commission: "commission" };

const POSITION_LIBELLE: Record<string, string> = {
  pour: "pour la mesure",
  contre: "contre la mesure",
  abstention: "en abstention sur la mesure",
  divise: "divisé sur la mesure",
};

export type EntreeSynthese = {
  depute: { id: string; nom: string; prenom: string; groupe_sigle: string | null };
  mesure: string;
  client: string;
  position_cible: PositionCible;
  position_groupe: { position: string | null; confiance: number } | null;
  amendements: { numero: string | null; role: "auteur" | "cosignataire"; resume: string; sort: Sort; travaille_avec: string[] }[];
  debats: { date: string; lieu: Lieu; citation: string }[];
  auditions: { date: string; role: string; organisations: string[] }[];
};

function sansPointFinal(s: string): string {
  return s.trim().replace(/[.。]+$/, "");
}

function majuscule(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function libelleAmendement(a: EntreeSynthese["amendements"][number]): string {
  const num = a.numero ? ` n° ${a.numero}` : "";
  return `${a.role === "auteur" ? "auteur" : "cosignataire"} de l'amendement${num} (${sansPointFinal(a.resume)}, ${SORT_LIBELLE[a.sort]})`;
}

export function gabaritSynthese(e: EntreeSynthese): { position_probable: string; argument: string } {
  const debats = [...e.debats].sort((a, b) => (a.date < b.date ? 1 : -1));
  const dernier = debats[0];
  const parts: string[] = [];

  if (e.amendements.length > 0) {
    const premier = e.amendements[0];
    let s = libelleAmendement(premier);
    if (e.amendements.length > 1) s += ` et de ${e.amendements.length - 1} autre${e.amendements.length > 2 ? "s" : ""} sur le sujet`;
    parts.push(s);
  }
  if (dernier) {
    parts.push(`a déclaré en ${LIEU_LIBELLE[dernier.lieu]} le ${dateFr(dernier.date)} : « ${sansPointFinal(dernier.citation)} »`);
  }
  if (parts.length === 0) {
    parts.push("position propre non connue : aucun amendement ni intervention sur le sujet dans les sources lues");
  }
  if (e.position_groupe?.position && e.depute.groupe_sigle) {
    parts.push(`son groupe (${e.depute.groupe_sigle}) est classé ${POSITION_LIBELLE[e.position_groupe.position] ?? e.position_groupe.position}`);
  }
  const position_probable = majuscule(parts.join(" ; ")) + ".";

  let argument: string;
  if (dernier) {
    argument = `S'appuyer sur sa propre intervention en ${LIEU_LIBELLE[dernier.lieu]} le ${dateFr(dernier.date)} (« ${sansPointFinal(dernier.citation)} ») : lui présenter les chiffres du dossier qui y répondent.`;
  } else if (e.amendements.length > 0) {
    const a = e.amendements[0];
    argument = `S'appuyer sur son amendement${a.numero ? ` n° ${a.numero}` : ""} (${sansPointFinal(a.resume)}) : lui présenter les éléments qui le confortent ou qui en montrent les limites.`;
  } else if (e.auditions.length > 0) {
    const orgs = e.auditions.flatMap((a) => a.organisations).slice(0, 3);
    argument = orgs.length > 0
      ? `Il a entendu ${orgs.join(", ")} : lui présenter la position de ${e.client} en regard de ces auditions.`
      : `Aucun acte propre relevé : lui présenter les arguments déjà entendus dans le dossier, avec leurs sources.`;
  } else {
    argument = `Aucun acte propre relevé : lui présenter les arguments déjà entendus dans le dossier, avec leurs sources.`;
  }
  return { position_probable, argument };
}

export type ArgumentEntendu = { argument: string; citation: string; date: string; lieu: Lieu };
export type EntreeContreArgument = {
  argument: ArgumentEntendu;
  appuis: ArgumentEntendu[];
  mesure: string;
  client: string;
  position_cible: PositionCible;
};

function mots(s: string): Set<string> {
  return new Set(s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((m) => m.length > 3));
}

/** L'argument du camp du client le plus proche (mots communs) ; à score égal, un appui pas encore utilisé. */
export function choisirAppui(cible: ArgumentEntendu, appuis: ArgumentEntendu[], dejaUtilises: Set<string> = new Set()): ArgumentEntendu | null {
  if (appuis.length === 0) return null;
  const ref = mots(cible.argument + " " + cible.citation);
  let meilleur: ArgumentEntendu | null = null;
  let score = -1;
  for (const a of appuis) {
    const m = mots(a.argument + " " + a.citation);
    let commun = 0;
    for (const x of m) if (ref.has(x)) commun += 1;
    if (dejaUtilises.has(a.argument)) commun -= 0.5;
    if (commun > score) {
      score = commun;
      meilleur = a;
    }
  }
  return meilleur;
}

export function gabaritContreArgument(e: EntreeContreArgument, dejaUtilises: Set<string> = new Set()): string {
  const appui = choisirAppui(e.argument, e.appuis, dejaUtilises);
  if (appui) dejaUtilises.add(appui.argument);
  const arg = sansPointFinal(e.argument.argument);
  if (!appui) {
    return `Aucun argument contraire n'a encore été entendu dans les comptes rendus lus pour répondre à « ${arg} ». À construire à partir de la mesure (${sansPointFinal(e.mesure)}) et des sources du dossier.`;
  }
  return `À l'argument « ${arg} », on peut opposer ce qui a été dit en ${LIEU_LIBELLE[appui.lieu]} le ${dateFr(appui.date)} : « ${sansPointFinal(appui.citation)} ». Ce contre-argument reprend un propos déjà tenu dans les débats ; à étayer avec les chiffres du dossier avant usage.`;
}
