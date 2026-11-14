// Lecture de l'open data de l'Assemblée (téléchargé par P1 dans data/raw/opendata/).
// Décompresse dans pipeline/pivots/.cache (ignoré par git) et produit des caches compacts.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

export const ROOT = join(import.meta.dir, "..", "..", "..");
export const RAW = join(ROOT, "data", "raw", "opendata");
export const CACHE = join(import.meta.dir, "..", ".cache");

export type VoteNom = "pour" | "contre" | "abstention" | "non_votant";
export type ScrutinC = {
  id: string;
  numero: number;
  date: string;
  titre: string;
  sort: string; // adopté | rejeté
  type: string; // SPO, SPS, MOC...
  decompte: { pour: number; contre: number; abstention: number };
  groupes: { id: string; position: string | null; votes: Record<string, VoteNom> }[];
};

function asArr<T>(x: T | T[] | null | undefined): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function unzip(zip: string, dest: string, pattern = "") {
  mkdirSync(dest, { recursive: true });
  execSync(`unzip -qo "${zip}" ${pattern} -d "${dest}"`, { stdio: "ignore", maxBuffer: 1 << 30 });
}

export function chargerScrutins(): ScrutinC[] {
  const out = join(CACHE, "scrutins.compact.json");
  if (existsSync(out)) return JSON.parse(readFileSync(out, "utf8"));
  const dir = join(CACHE, "scrutins", "json");
  if (!existsSync(dir)) unzip(join(RAW, "Scrutins.json.zip"), join(CACHE, "scrutins"));
  const res: ScrutinC[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const s = JSON.parse(readFileSync(join(dir, f), "utf8")).scrutin;
    const groupes = asArr(s.ventilationVotes?.organe?.groupes?.groupe).map((g: any) => {
      const votes: Record<string, VoteNom> = {};
      const dn = g.vote?.decompteNominatif ?? {};
      for (const [k, v] of [["pours", "pour"], ["contres", "contre"], ["abstentions", "abstention"], ["nonVotants", "non_votant"]] as const) {
        for (const vt of asArr(dn[k]?.votant)) if (vt?.acteurRef) votes[vt.acteurRef] = v;
      }
      return { id: g.organeRef, position: g.vote?.positionMajoritaire ?? null, votes };
    });
    const d = s.syntheseVote?.decompte ?? {};
    res.push({
      id: s.uid,
      numero: Number(s.numero),
      date: s.dateScrutin,
      titre: s.titre ?? s.objet?.libelle ?? "",
      sort: s.sort?.code ?? "",
      type: s.typeVote?.codeTypeVote ?? "",
      decompte: { pour: Number(d.pour ?? 0), contre: Number(d.contre ?? 0), abstention: Number(d.abstentions ?? 0) },
      groupes,
    });
  }
  res.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.numero - b.numero));
  writeFileSync(out, JSON.stringify(res));
  return res;
}

export type AmdtC = {
  id: string;
  numero: string;
  numeroLong: string;
  texte: string;
  auteur: string | null; // PA ou null (gouvernement, commission)
  typeAuteur: string;
  groupe: string | null;
  cosignataires: string[];
  article: string; // désignation courte
  dispositif: string;
  expose: string;
  dateDepot: string | null;
  dateSort: string | null;
  sort: string | null; // libellé brut
  etat: string | null;
  sousEtat: string | null;
  url: string;
};

const DOSSIERS_TEXTE: Record<string, string> = {}; // texte_id -> chemin dans le zip, découvert à la volée

function strip(html: string): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function chargerAmendements(texteId: string): AmdtC[] {
  const out = join(CACHE, `amdts.${texteId}.json`);
  if (existsSync(out)) return JSON.parse(readFileSync(out, "utf8"));
  const zip = join(RAW, "Amendements.json.zip");
  // Trouve le dossier du texte dans le zip.
  let sous = DOSSIERS_TEXTE[texteId];
  if (!sous) {
    const liste = execSync(`unzip -l "${zip}" | grep "/${texteId}/" | head -1`, { maxBuffer: 1 << 30 }).toString();
    const m = liste.match(/(json\/[^/]+\/[^/]+)\//);
    if (!m) return [];
    sous = m[1];
  }
  const dest = join(CACHE, "amdts");
  if (!existsSync(join(dest, sous))) unzip(zip, dest, `'${sous}/*'`);
  const res: AmdtC[] = [];
  for (const f of readdirSync(join(dest, sous))) {
    if (!f.endsWith(".json")) continue;
    const a = JSON.parse(readFileSync(join(dest, sous, f), "utf8")).amendement;
    const au = a.signataires?.auteur ?? {};
    const cos = asArr(a.signataires?.cosignataires?.acteurRef).filter((x: any) => typeof x === "string");
    const cv = a.cycleDeVie ?? {};
    res.push({
      id: a.uid,
      numero: a.identification?.numeroOrdreDepot ?? "",
      numeroLong: a.identification?.numeroLong ?? "",
      texte: a.texteLegislatifRef,
      auteur: typeof au.acteurRef === "string" ? au.acteurRef : null,
      typeAuteur: au.typeAuteur ?? "",
      groupe: typeof au.groupePolitiqueRef === "string" ? au.groupePolitiqueRef : null,
      cosignataires: cos,
      article: a.pointeurFragmentTexte?.division?.articleDesignationCourte ?? a.pointeurFragmentTexte?.division?.titre ?? "",
      dispositif: strip(a.corps?.contenuAuteur?.dispositif ?? ""),
      expose: strip(a.corps?.contenuAuteur?.exposeSommaire ?? ""),
      dateDepot: typeof cv.dateDepot === "string" ? cv.dateDepot : null,
      dateSort: typeof cv.dateSort === "string" ? cv.dateSort.slice(0, 10) : null,
      sort: typeof cv.sort === "string" ? cv.sort : null,
      etat: cv.etatDesTraitements?.etat?.libelle ?? null,
      sousEtat: cv.etatDesTraitements?.sousEtat?.libelle ?? null,
      url: `https://www.assemblee-nationale.fr/dyn/17/amendements/${a.uid}`,
    });
  }
  writeFileSync(out, JSON.stringify(res));
  return res;
}

export function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
