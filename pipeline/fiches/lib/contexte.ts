// Contexte d'un dossier : tout ce que les trois constructions lisent.

import type { Config, Deputes, DossierConfig, Etat, Groupes, Hatvp, Pivots, Texte } from "../../../contracts/index";
import { lireKind } from "./io";

export type Contexte = {
  root: string;
  config: Config;
  dossier: DossierConfig;
  groupes: Groupes;
  deputes: Deputes;
  texte: Texte | null;
  hatvp: Hatvp | null;
  pivots: Pivots | null;
  etat: Etat | null;
};

export function chargerContexte(root: string, config: Config, groupes: Groupes, deputes: Deputes, dossier: DossierConfig): Contexte {
  return {
    root,
    config,
    dossier,
    groupes,
    deputes,
    texte: lireKind(root, dossier.id, "texte"),
    hatvp: lireKind(root, dossier.id, "hatvp"),
    pivots: lireKind(root, dossier.id, "pivots"),
    etat: lireKind(root, dossier.id, "etat"),
  };
}

export function nomDepute(ctx: Contexte, id: string): string {
  const d = ctx.deputes.deputes.find((x) => x.id === id);
  return d ? `${d.prenom} ${d.nom}` : id;
}

export function sigleGroupe(ctx: Contexte, groupeId: string | null): string | null {
  if (!groupeId) return null;
  return ctx.groupes.groupes.find((g) => g.id === groupeId)?.sigle ?? groupeId;
}

export function positionGroupe(ctx: Contexte, groupeId: string | null): { position: string | null; confiance: number } | null {
  if (!groupeId || !ctx.texte) return null;
  const p = ctx.texte.positions.find((x) => x.groupe_id === groupeId);
  return p ? { position: p.position, confiance: p.confiance } : null;
}

/** Dernière date connue du texte (étape faite ou en cours) qui ne dépasse pas `limite`, sinon null. */
export function dateEtape(ctx: Contexte, limite: string): string | null {
  const dates = (ctx.etat?.etapes ?? []).filter((e) => e.date && e.statut !== "a_venir" && e.date <= limite).map((e) => e.date as string).sort();
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

/** Le label d'un amendement du texte par identifiant (numéro et résumé). */
export function amendementDuTexte(ctx: Contexte, id: string) {
  return ctx.texte?.amendements.find((a) => a.id === id) ?? null;
}
