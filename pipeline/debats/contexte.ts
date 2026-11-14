// Lecture de la configuration et des référentiels : data/ si config.json y existe, sinon contracts/fixtures/.
// Liste des députés à traiter : groupes-action.json, sinon pivots.json, sinon la fixture.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ConfigSchema, DeputesSchema, GroupesSchema, PivotsSchema, type Config, type DossierConfig, type Depute } from "../../contracts";

export const RACINE = join(import.meta.dir, "..", "..");
export const RAW = join(RACINE, "data", "raw", "opendata");

export type Contexte = {
  root: "data" | "contracts/fixtures";
  config: Config;
  deputes: Map<string, Depute>;
  groupes: Map<string, { id: string; sigle: string }>;
  /** nom complet normalisé (« prenom nom ») → id */
  parNom: Map<string, string>;
  /** sigle de groupe → id */
  parSigle: Map<string, string>;
};

function lire<T>(fichier: string, parse: (x: unknown) => T): T {
  return parse(JSON.parse(readFileSync(fichier, "utf8")));
}

export function normaliserNom(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function chargerContexte(rootForce?: string): Contexte {
  const root = (rootForce ?? (existsSync(join(RACINE, "data", "config.json")) ? "data" : "contracts/fixtures")) as Contexte["root"];
  const base = join(RACINE, root);
  const config = lire(join(base, "config.json"), (x) => ConfigSchema.parse(x));
  const deputesListe = lire(join(base, "deputes.json"), (x) => DeputesSchema.parse(x)).deputes;
  const groupesListe = lire(join(base, "groupes.json"), (x) => GroupesSchema.parse(x)).groupes;
  const deputes = new Map(deputesListe.map((d) => [d.id, d]));
  const groupes = new Map(groupesListe.map((g) => [g.id, { id: g.id, sigle: g.sigle }]));
  const parNom = new Map<string, string>();
  for (const d of deputesListe) parNom.set(normaliserNom(`${d.prenom} ${d.nom}`), d.id);
  const parSigle = new Map<string, string>();
  for (const g of groupesListe) parSigle.set(g.sigle.toUpperCase(), g.id);
  return { root, config, deputes, groupes, parNom, parSigle };
}

/** Députés à traiter pour un dossier : union des trois groupes de groupes-action.json et des pivots (pivots.json). */
export function deputesDuDossier(ctx: Contexte, dossier: DossierConfig): { ids: string[]; source: string } {
  const base = join(RACINE, ctx.root, dossier.id);
  const ids = new Set<string>();
  const sources: string[] = [];
  const ga = join(base, "groupes-action.json");
  if (existsSync(ga)) {
    const j = JSON.parse(readFileSync(ga, "utf8")) as { actionnables?: { depute_id: string }[]; allies?: { depute_id: string }[]; perdus?: { depute_id: string }[] };
    for (const d of [...(j.actionnables ?? []), ...(j.allies ?? []), ...(j.perdus ?? [])]) ids.add(d.depute_id);
    sources.push(`${ctx.root}/${dossier.id}/groupes-action.json`);
  }
  const pv = join(base, "pivots.json");
  if (existsSync(pv)) {
    const p = lire(pv, (x) => PivotsSchema.parse(x));
    for (const d of p.deputes) ids.add(d.id);
    sources.push(`${ctx.root}/${dossier.id}/pivots.json`);
  }
  // Sur data/ sans liste de P3 : aucun fichier par député, on le dit.
  if (ids.size === 0) return { ids: [], source: `${ctx.root}/${dossier.id}/ : ni groupes-action.json ni pivots.json` };
  return { ids: [...ids], source: sources.join(" et ") };
}

export function horodatage(): string {
  const d = new Date();
  const tz = -d.getTimezoneOffset();
  const signe = tz >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(tz) / 60)).padStart(2, "0");
  const mm = String(Math.abs(tz) % 60).padStart(2, "0");
  const local = new Date(d.getTime() + tz * 60000).toISOString().slice(0, 19);
  return `${local}${signe}${hh}:${mm}`;
}
