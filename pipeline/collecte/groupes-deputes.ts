// Livrable 2 depuis l'open data AN (AMO10, députés en exercice). Repli tant que la clé Hémicycle manque.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { ROOT, nowIso } from "./lib/config";
const DIR = ROOT + "data/raw/opendata/AMO10/json/";
const SRC = { label: "Open data Assemblée nationale, députés en exercice (AMO10)", url: "https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip" };
const arr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const organes: Record<string, any> = {};
for (const f of readdirSync(DIR + "organe")) { const o = JSON.parse(readFileSync(DIR + "organe/" + f, "utf8")).organe; organes[o.uid] = o; }
const deputes: any[] = []; const effectif: Record<string, number> = {};
for (const f of readdirSync(DIR + "acteur")) {
  const a = JSON.parse(readFileSync(DIR + "acteur/" + f, "utf8")).acteur;
  const ms = arr(a.mandats?.mandat).filter((m: any) => !m.dateFin);
  const an = ms.find((m: any) => m.typeOrgane === "ASSEMBLEE" && m.organes?.organeRef === "PO838901");
  if (!an) continue;
  const gp = ms.find((m: any) => m.typeOrgane === "GP");
  let gid: string | null = gp?.organes?.organeRef ?? null;
  if (gid && /^NI$|non inscrit/i.test(organes[gid]?.libelleAbrev ?? organes[gid]?.libelle ?? "")) gid = null;
  if (gid) effectif[gid] = (effectif[gid] ?? 0) + 1;
  const lieu = an.election?.lieu ?? {};
  const uid = typeof a.uid === "string" ? a.uid : a.uid["#text"];
  deputes.push({ id: uid, nom: a.etatCivil.ident.nom, prenom: a.etatCivil.ident.prenom, groupe_id: gid,
    departement: lieu.numDepartement ?? "inconnu", circonscription: Number(lieu.numCirco) || 1,
    commissions: [...new Set(ms.filter((m: any) => m.typeOrgane === "COMPER").map((m: any) => m.organes.organeRef))] });
}
deputes.sort((x, y) => x.id.localeCompare(y.id));
const groupes = Object.keys(effectif).map((id) => { const o = organes[id];
  const c = /^#[0-9A-Fa-f]{6}$/.test(o.couleurAssociee ?? "") ? o.couleurAssociee : "#888888";
  return { id, sigle: o.libelleAbrev || o.libelleAbrege, nom: o.libelle, couleur: c, effectif: effectif[id] };
}).sort((a, b) => b.effectif - a.effectif);
const ni = deputes.filter((d) => !d.groupe_id).length;
const meta = (limits: string) => ({ generated_at: nowIso(), sources: [SRC], limits, producer: "pipeline/collecte", dossier_id: null });
mkdirSync(ROOT + "data", { recursive: true });
writeFileSync(ROOT + "data/groupes.json", JSON.stringify({ meta: meta(`Groupes à la date de l'export open data (${new Date().toISOString().slice(0, 10)}), apparentés inclus, ${ni} non-inscrits exclus. Couleurs officielles de l'Assemblée. Source open data, pas l'API Hémicycle (clé absente).`), groupes }, null, 2));
writeFileSync(ROOT + "data/deputes.json", JSON.stringify({ meta: meta(`Députés en exercice uniquement (${deputes.length}) ; les anciens députés qui ont voté depuis juillet 2024 n'y sont pas. groupe_id null = non-inscrit. Commissions permanentes seulement. Source open data, pas l'API Hémicycle.`), deputes }, null, 2));
console.log(groupes.length, "groupes", deputes.length, "députés", ni, "NI");
console.table(groupes.map((g) => ({ id: g.id, sigle: g.sigle, eff: g.effectif, c: g.couleur })));
