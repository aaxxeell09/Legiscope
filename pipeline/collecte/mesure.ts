// Livrable 1 : un appel de chaque type, coût réel. Sortie : data/raw/mesure.json + résumé stdout.
import { mkdirSync, writeFileSync } from "node:fs";
import { ROOT, lireConfig, filtreMotsCles } from "./lib/config";
import { api, cleDisponible, compteur, toutes } from "./lib/hemicycle";

if (!cleDisponible()) { console.error("HEMICYCLE_API_KEY vide"); process.exit(2); }
mkdirSync(ROOT + "data/raw", { recursive: true });
const cfg = lireConfig();
const vivant = cfg.dossiers.find((d: any) => !d.date_reference);
const res: Record<string, any> = {};
const note = (k: string, r: any, extra: any = {}) => { res[k] = { status: r.status, cost: r.cost, restant: compteur.restant, ...extra }; console.log(k, JSON.stringify(res[k])); };

let r = await api("GET", "/scrutins?limit=1"); note("scrutins_limit1", r, { exemple: r.json.data?.[0] });
const sid = r.json.data?.[0]?.id;
// votes : pages jusqu'au bout
let pages = 0, nvotes = 0, cout = 0, cursor: string | null = null, exempleVote: any = null;
do {
  const q = await api("GET", `/scrutins/${sid}/votes?limit=100` + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""));
  pages++; cout += q.cost; nvotes += q.json.data?.length ?? 0; exempleVote ??= q.json.data?.[0] ?? q.json;
  cursor = q.json.has_more ? q.json.next_cursor : null;
} while (cursor && pages < 10);
res.votes = { scrutin: sid, pages, nvotes, cout, exempleVote, restant: compteur.restant }; console.log("votes", JSON.stringify(res.votes));

r = await api("POST", "/agregats/accord-groupes", { debut: "2026-10-01", fin: "2026-10-31" }); note("accord_groupes", r, { extrait: JSON.stringify(r.json).slice(0, 800) });
r = await api("POST", "/agregats/loyaute-deputes", { groupe: "PO845401", min_votes: 10, limite: 5 }); note("loyaute", r, { extrait: JSON.stringify(r.json).slice(0, 800) });

r = await api("GET", "/scrutins/VTANR5L17V9759"); note("scrutin_V9759", r, { data: r.json });
r = await api("GET", "/textes/PRJLANR5L17B3210"); note("texte_3210", r, { data: JSON.stringify(r.json).slice(0, 1500) });

// amendements du texte vivant (première page, puis comptage sujet sur toutes les pages, plafonné)
const garde = filtreMotsCles(vivant.sujet.mots_cles);
r = await api("GET", `/amendements?texte=${vivant.texte_id}&limit=1`); note("amendements_limit1", r, { champs: Object.keys(r.json.data?.[0] ?? {}), exemple: r.json.data?.[0] });
writeFileSync(ROOT + "data/raw/mesure.json", JSON.stringify({ res, compteur }, null, 2));
console.log("COMPTEUR", JSON.stringify(compteur));
