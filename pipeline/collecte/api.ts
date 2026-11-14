// Collecte par l'API Hémicycle (livrables 4 et 5 Orcet). Ne tourne que si la clé est présente. Plafond 150 crédits.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { ROOT, lireConfig } from "./lib/config";
import { api, cleDisponible, compteur, PlancherAtteint } from "./lib/hemicycle";
if (!cleDisponible()) { console.error("HEMICYCLE_API_KEY vide : collecte API sautée (open data seulement)"); process.exit(0); }
const cfg = lireConfig();
const groupes = JSON.parse(readFileSync(ROOT + "data/groupes.json", "utf8")).groupes;
try {
  // Orcet d'abord (le plus utile au verdict) : amendements en attente des dossiers, 50 crédits chacun, 404 non facturé.
  for (const dos of cfg.dossiers) {
    const am = JSON.parse(readFileSync(ROOT + `data/raw/${dos.id}/amendements.json`, "utf8")).amendements;
    const attente = am.filter((a: any) => !a.sort && /traitement/i.test(a.etat ?? ""));
    mkdirSync(ROOT + `data/raw/${dos.id}/orcet`, { recursive: true });
    for (const a of attente) {
      const f = ROOT + `data/raw/${dos.id}/orcet/${a.id}.json`; if (existsSync(f)) continue;
      const r = await api("POST", "/orcet/predictions", { amendement: a.id });
      writeFileSync(f, JSON.stringify(r.status === 200 ? r.json : { prediction: null, status: r.status, reponse: r.json }, null, 1));
      console.log("orcet", a.id, r.status, r.cost, compteur.restant);
    }
  }
  // Accord entre groupes par mois depuis juillet 2024 (5 crédits par mois).
  mkdirSync(ROOT + "data/raw/accord-groupes", { recursive: true });
  for (let d = new Date(Date.UTC(2024, 6, 1)); d < new Date(); d.setUTCMonth(d.getUTCMonth() + 1)) {
    const m = d.toISOString().slice(0, 7); const f = ROOT + `data/raw/accord-groupes/${m}.json`; if (existsSync(f)) continue;
    const fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const r = await api("POST", "/agregats/accord-groupes", { depuis: `${m}-01`, jusqu_a: fin });
    writeFileSync(f, JSON.stringify(r.json, null, 1)); console.log("accord", m, r.status, compteur.restant);
  }
  // Loyauté par groupe sur 12 mois.
  mkdirSync(ROOT + "data/raw/loyaute", { recursive: true });
  for (const g of groupes) {
    const f = ROOT + `data/raw/loyaute/${g.id}.json`; if (existsSync(f)) continue;
    const r = await api("POST", "/agregats/loyaute-deputes", { groupe: g.sigle, depuis: new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10), min_votes: 10, limite: 100 });
    writeFileSync(f, JSON.stringify(r.json, null, 1)); console.log("loyaute", g.sigle, r.status, compteur.restant);
  }
} catch (e) {
  if (e instanceof PlancherAtteint) console.error("ARRÊT plancher crédits :", e.message); else throw e;
}
writeFileSync(ROOT + "data/raw/compteur-credits.json", JSON.stringify(compteur, null, 1));
console.log("COMPTEUR", JSON.stringify(compteur));
