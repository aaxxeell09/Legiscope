// Lit data/config.json (P0), sinon les fixtures. Rien en dur.
import { existsSync, readFileSync } from "node:fs";
export const ROOT = new URL("../../../", import.meta.url).pathname;
export function lireConfig(): any {
  const p = existsSync(ROOT + "data/config.json") ? ROOT + "data/config.json" : ROOT + "contracts/fixtures/config.json";
  return JSON.parse(readFileSync(p, "utf8"));
}
export const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Regex mots-clés : mots courts en majuscules (ISF, IFF) sensibles à la casse et en mot entier.
export function filtreMotsCles(mots: string[]): (txt: string) => boolean {
  const courts = mots.filter((m) => m.length <= 4 && m === m.toUpperCase()).map((m) => new RegExp(`\\b${m}\\b`));
  const longs = mots.filter((m) => !(m.length <= 4 && m === m.toUpperCase())).map((m) => sansAccents(m));
  return (txt: string) => {
    if (!txt) return false;
    const t = sansAccents(txt);
    return longs.some((m) => t.includes(m)) || courts.some((r) => r.test(txt));
  };
}
export const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
