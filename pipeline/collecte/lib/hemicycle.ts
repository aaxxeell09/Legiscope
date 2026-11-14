// Client API Hémicycle : seule porte d'entrée (P1). Compteur de crédits, plafond 150.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { ROOT } from "./config";

const BASE = "https://api.hemicycle.ai/v1";
const PLANCHER = 150;
function cle(): string {
  let k = process.env.HEMICYCLE_API_KEY ?? "";
  if (!k && existsSync(ROOT + ".env")) {
    const m = readFileSync(ROOT + ".env", "utf8").match(/^HEMICYCLE_API_KEY=(.*)$/m);
    k = m?.[1]?.trim() ?? "";
  }
  return k;
}
export const cleDisponible = () => cle().length > 0;
export const compteur = { appels: 0, credits: 0, restant: null as number | null };
export class PlancherAtteint extends Error {}

export async function api(method: "GET" | "POST", chemin: string, body?: unknown): Promise<{ status: number; json: any; cost: number }> {
  if (compteur.restant !== null && compteur.restant < PLANCHER) throw new PlancherAtteint(`solde ${compteur.restant} < ${PLANCHER}`);
  for (let essai = 0; essai < 5; essai++) {
    const r = await fetch(BASE + chemin, {
      method,
      headers: { Authorization: `Bearer ${cle()}`, "Hemicycle-Version": "2026-10-01", "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 429) { await Bun.sleep(1000 * Number(r.headers.get("Retry-After") ?? 5)); continue; }
    const cost = Number(r.headers.get("X-Credits-Cost") ?? 0);
    const rest = r.headers.get("X-Credits-Remaining");
    compteur.appels++; compteur.credits += cost;
    if (rest !== null) compteur.restant = Number(rest);
    const txt = await r.text();
    let json: any; try { json = JSON.parse(txt); } catch { json = { brut: txt }; }
    appendFileSync(ROOT + "data/raw/hemicycle-journal.ndjson", JSON.stringify({ t: new Date().toISOString(), method, chemin, status: r.status, cost, restant: compteur.restant }) + "\n");
    if (compteur.restant !== null && compteur.restant < PLANCHER) throw new PlancherAtteint(`solde ${compteur.restant} < ${PLANCHER}`);
    return { status: r.status, json, cost };
  }
  throw new Error("429 répétés sur " + chemin);
}

// Toutes les pages d'une liste (curseur), avec plafond de pages.
export async function toutes(chemin: string, maxPages = 50): Promise<any[]> {
  const out: any[] = []; let cursor: string | null = null;
  for (let p = 0; p < maxPages; p++) {
    const sep = chemin.includes("?") ? "&" : "?";
    const { status, json } = await api("GET", chemin + sep + "limit=100" + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""));
    if (status !== 200) break;
    out.push(...(json.data ?? []));
    if (!json.has_more || !json.next_cursor) break;
    cursor = json.next_cursor;
  }
  return out;
}
