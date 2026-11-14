// Livrable 5 suite + 7 : texte brut (document + dossier législatif), scrutins liés au sujet, scrutins imposés du dossier rejoué.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { ROOT, lireConfig, filtreMotsCles, nowIso } from "./lib/config";
const DL = ROOT + "data/raw/opendata/Dossiers_Legislatifs/json/";
const SC = ROOT + "data/raw/scrutins/";
const index: any[] = JSON.parse(readFileSync(SC + "_index.json", "utf8"));
const cfg = lireConfig(); const resume: any = {};
// Scrutins imposés par le brief pour le dossier rejoué (votes des 19 et 20 novembre 2025).
const IMPOSES: Record<string, string[]> = { "petits-colis": [...Array.from({ length: 11 }, (_, i) => `VTANR5L17V${3987 + i}`), "VTANR5L17V4022", "VTANR5L17V4205"] };
for (const dos of cfg.dossiers) {
  const out = ROOT + `data/raw/${dos.id}/`; mkdirSync(out + "scrutins", { recursive: true });
  const doc = JSON.parse(readFileSync(DL + `document/${dos.texte_id}.json`, "utf8")).document;
  const dref = doc.dossierRef;
  const dossier = existsSync(DL + `dossierParlementaire/${dref}.json`) ? JSON.parse(readFileSync(DL + `dossierParlementaire/${dref}.json`, "utf8")).dossierParlementaire : null;
  writeFileSync(out + "texte.json", JSON.stringify({ source: "opendata", generated_at: nowIso(), texte_id: dos.texte_id, dossier_ref: dref,
    url_texte: `https://www.assemblee-nationale.fr/dyn/17/textes/l17b${dos.texte_id.match(/B(\d+)/)?.[1]}_projet-loi`,
    url_dossier: dossier ? `https://www.assemblee-nationale.fr/dyn/17/dossiers/${dossier.titreDossier?.titreChemin ?? dref}` : null,
    document: doc, dossier }, null, 1));
  const garde = filtreMotsCles(dos.sujet.mots_cles);
  // Lien scrutin -> sujet : (a) mots-clés dans le titre ; (b) numéro d'un amendement de séance du sujet cité dans le titre d'un scrutin
  // du même texte ; (c) article de la mesure cité dans le titre (si config.mesure.article).
  const titreTexte = String(doc.titres?.titrePrincipalCourt ?? "").toLowerCase();
  const am = JSON.parse(readFileSync(out + "amendements.json", "utf8")).amendements;
  const nums = new Set(am.filter((a: any) => a.organe_examen === "AN").map((a: any) => String(a.numero_ordre)));
  const art = dos.mesure?.article ? new RegExp(`(?:à|de) l'article ${dos.mesure.article}(?![0-9])(?! bis| ter)`) : null;
  const memeTexte = (s: any) => s.dossier_ref === dref || (titreTexte && s.titre.toLowerCase().includes(titreTexte));
  const raison = (s: any) => { const r: string[] = [];
    if (garde(s.titre)) r.push("mots_cles");
    if (memeTexte(s)) { const ns = [...s.titre.matchAll(/amendements? n[°o]\s*(\d+)/g)].map((m) => m[1]); if (ns.some((n) => nums.has(n))) r.push("amendement_du_sujet");
      if (art && art.test(s.titre)) r.push("article_mesure"); }
    return r; };
  const lies = index.map((s) => ({ ...s, raisons: raison(s) })).filter((s) => s.raisons.length).map((s) => ({ ...s, meme_dossier: memeTexte(s) }));
  const imposes = IMPOSES[dos.id] ?? [];
  const ids = new Set([...lies.map((s) => s.id), ...imposes]);
  const manquants: string[] = [];
  for (const id of ids) { if (existsSync(SC + id + ".json")) copyFileSync(SC + id + ".json", out + "scrutins/" + id + ".json"); else manquants.push(id); }
  writeFileSync(out + "scrutins-lies.json", JSON.stringify({ source: "opendata", generated_at: nowIso(), methode: "Scrutin lié si son titre contient un mot-clé du sujet, ou cite le numéro d'un amendement de séance du sujet (même texte), ou l'article de la mesure (même texte) ; plus les scrutins imposés par le brief pour le dossier rejoué.",
    mots_cles: dos.sujet.mots_cles, dossier_ref: dref, imposes, manquants,
    scrutins: [...ids].filter((id) => !manquants.includes(id)).map((id) => index.find((s) => s.id === id)).sort((a, b) => a.numero - b.numero)
      .map((s) => ({ ...s, meme_texte: memeTexte(s), raisons: raison(s), impose: imposes.includes(s.id) })) }, null, 1));
  resume[dos.id] = { dossier_ref: dref, titre: doc.titres?.titrePrincipalCourt, lies: lies.length, lies_meme_dossier: lies.filter((s) => s.meme_dossier).length, imposes: imposes.length, manquants };
}
console.log(JSON.stringify(resume, null, 1));
