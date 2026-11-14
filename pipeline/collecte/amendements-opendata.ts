// Livrable 5 (repli open data) : amendements du texte de chaque dossier filtrés sur les mots-clés du sujet.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { ROOT, lireConfig, filtreMotsCles, nowIso } from "./lib/config";
const BASE = ROOT + "data/raw/opendata/Amendements/json/";
const arr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const nil = (x: any) => (x && typeof x === "object" && x["@xsi:nil"] ? null : x);
const ent = (s: string) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const texte = (h: any) => (typeof h === "string" ? ent(h.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() : "");
const dossiersTexte: Record<string, string> = {};
for (const d of readdirSync(BASE)) for (const t of readdirSync(BASE + d)) dossiersTexte[t] = d;

const cfg = lireConfig(); const resume: any = {};
for (const dos of cfg.dossiers) {
  const dir = dossiersTexte[dos.texte_id];
  if (!dir) { console.error("texte absent de l'open data", dos.texte_id); continue; }
  const garde = filtreMotsCles(dos.sujet.mots_cles);
  const path = BASE + dir + "/" + dos.texte_id + "/";
  const tous = readdirSync(path); const out: any[] = [];
  for (const f of tous) {
    const a = JSON.parse(readFileSync(path + f, "utf8")).amendement;
    const c = a.corps?.contenuAuteur ?? {};
    const dispositif = texte(c.dispositif), expose = texte(c.exposeSommaire);
    const div = a.pointeurFragmentTexte?.division ?? {};
    if (!garde(dispositif + " " + expose + " " + (div.titre ?? ""))) continue;
    const au = a.signataires?.auteur ?? {}; const cv = a.cycleDeVie ?? {};
    const cos = arr(nil(a.signataires?.cosignataires)?.acteurRef);
    const num = a.identification?.numeroLong;
    const etat = cv.etatDesTraitements?.etat?.libelle ?? null, sousEtat = nil(cv.etatDesTraitements?.sousEtat)?.libelle ?? null;
    out.push({
      id: a.uid, numero: num, numero_ordre: Number(a.identification?.numeroOrdreDepot), texte: a.texteLegislatifRef, examen: a.examenRef,
      organe_examen: a.identification?.prefixeOrganeExamen, article: div.titre ?? null, article_additionnel: div.articleAdditionnel === "true",
      dispositif, expose, auteur: nil(au.acteurRef) ?? null, type_auteur: au.typeAuteur ?? null, groupe: nil(au.groupePolitiqueRef) ?? null,
      auteur_libelle: ent(a.signataires?.libelle ?? ""), signataires: cos, sort: nil(cv.sort) ?? null, etat, sous_etat: sousEtat,
      date_depot: cv.dateDepot ?? null, date_sort: nil(cv.dateSort) ? String(cv.dateSort).slice(0, 10) : null,
      seance_ref: nil(a.seanceDiscussionRef) ?? null,
      url: `https://www.assemblee-nationale.fr/dyn/17/amendements/${a.uid}`,
      avis_rapporteur: null, avis_gouvernement: null,
    });
  }
  out.sort((x, y) => (x.date_depot ?? "").localeCompare(y.date_depot ?? "") || x.numero_ordre - y.numero_ordre);
  mkdirSync(ROOT + `data/raw/${dos.id}`, { recursive: true });
  const parSort: Record<string, number> = {};
  for (const a of out) { const k = a.sort ?? `(sans sort : ${a.etat}${a.sous_etat ? " / " + a.sous_etat : ""})`; parSort[k] = (parSort[k] ?? 0) + 1; }
  writeFileSync(ROOT + `data/raw/${dos.id}/amendements.json`, JSON.stringify({
    source: "opendata", generated_at: nowIso(), texte_id: dos.texte_id, dossier_legislatif: dir, mots_cles: dos.sujet.mots_cles,
    total_texte: tous.length, total_sujet: out.length, par_sort: parSort,
    limites: "Open data AN (Amendements.json.zip). Pas d'avis du rapporteur ni du gouvernement dans ce format (champs à null). Filtre mots-clés sur dispositif, exposé et titre d'article, sans accents.",
    amendements: out }, null, 1));
  resume[dos.id] = { texte: dos.texte_id, total_texte: tous.length, sujet: out.length, parSort };
}
console.log(JSON.stringify(resume, null, 1));
