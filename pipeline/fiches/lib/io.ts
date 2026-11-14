// Lecture et écriture des JSON, chemins, dates. Aucune logique métier ici.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ZodTypeAny, z } from "zod";
import { SCHEMAS, dataPath, type Kind, type Source } from "../../../contracts/index";

export type Rapport = { lignes: string[] };
export const rapport: Rapport = { lignes: [] };
export function noter(ligne: string) {
  rapport.lignes.push(ligne);
  console.log(ligne);
}

export function lireJsonBrut(chemin: string): unknown | null {
  if (!existsSync(chemin)) return null;
  try {
    return JSON.parse(readFileSync(chemin, "utf8"));
  } catch (e) {
    noter(`! ${chemin} : JSON illisible (${String(e).slice(0, 80)})`);
    return null;
  }
}

/** Lit et valide un fichier contre un schéma ; null s'il manque ou s'il est invalide (et on le note). */
export function lireValide<S extends ZodTypeAny>(chemin: string, schema: S): z.infer<S> | null {
  const brut = lireJsonBrut(chemin);
  if (brut === null) return null;
  const res = schema.safeParse(brut);
  if (!res.success) {
    const premiere = res.error.issues[0];
    noter(`! ${chemin} : invalide (${premiere?.path.join(".")} : ${premiere?.message})`);
    return null;
  }
  return res.data;
}

export function lireKind<K extends Kind>(root: string, dossier: string | null, kind: K, pa?: string): z.infer<(typeof SCHEMAS)[K]> | null {
  return lireValide(dataPath(dossier, kind, pa, root), SCHEMAS[kind]) as any;
}

export function ecrireJson(chemin: string, obj: unknown) {
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, JSON.stringify(obj, null, 2) + "\n");
}

export function listerJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith(".json")).sort().map((n) => join(dir, n));
}

export function maintenant(): string {
  return new Date().toISOString();
}

export function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

/** true si `date` dépasse la date de référence (quand elle est posée). */
export function posterieur(date: string, reference: string | null): boolean {
  return reference !== null && date > reference;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** 2025-11-19 → « 19 novembre 2025 » (les trois nombres restent ceux de la date ISO). */
export function dateFr(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const jour = Number(m[3]);
  return `${jour === 1 ? "1er" : jour} ${MOIS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Union de listes de sources, sans doublon d'URL, dans l'ordre d'apparition. */
export function fusionnerSources(...listes: (Source[] | undefined | null)[]): Source[] {
  const vues = new Set<string>();
  const out: Source[] = [];
  for (const liste of listes) for (const s of liste ?? []) {
    if (vues.has(s.url)) continue;
    vues.add(s.url);
    out.push(s);
  }
  return out;
}

export function slug(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}
