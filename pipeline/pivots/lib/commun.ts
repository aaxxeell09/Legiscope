import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT } from "./opendata";

export const DATA = join(ROOT, "data");
export const PRODUCER = "pipeline/pivots";

export function lireJson<T = any>(chemin: string): T | null {
  return existsSync(chemin) ? JSON.parse(readFileSync(chemin, "utf8")) : null;
}

export function ecrireJson(chemin: string, obj: unknown) {
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, JSON.stringify(obj, null, 2) + "\n");
}

export function maintenant(): string {
  // Horodatage local avec décalage (format attendu par MetaSchema).
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const s = off >= 0 ? "+" : "-";
  const p = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const loc = new Date(d.getTime() + off * 60000).toISOString().slice(0, 19);
  return `${loc}${s}${p(off / 60)}:${p(off % 60)}`;
}

export const urlScrutin = (numero: number) => `https://www.assemblee-nationale.fr/dyn/17/scrutins/${numero}`;
export const urlDepute = (pa: string) => `https://www.assemblee-nationale.fr/dyn/deputes/${pa}`;
export const URL_SCRUTINS_OD = "https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip";
export const URL_AMDTS_OD = "https://data.assemblee-nationale.fr/static/openData/repository/17/loi/amendements_div_legis/Amendements.json.zip";
export const URL_DOSSIERS_OD = "https://data.assemblee-nationale.fr/static/openData/repository/17/loi/dossiers_legislatifs/Dossiers_Legislatifs.json.zip";

export const r2 = (x: number) => Math.round(x * 100) / 100;
