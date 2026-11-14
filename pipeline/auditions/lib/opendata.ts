// Open data Assemblée nationale : archive des dossiers législatifs (métadonnées des
// rapports : rapporteurs, commission, dates ; pas le texte, qui se lit en HTML).
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const ARCHIVE_URL =
  "https://data.assemblee-nationale.fr/static/openData/repository/17/loi/dossiers_legislatifs/Dossiers_Legislatifs.json.zip";
export const RAW_DIR = "data/raw/opendata";
const ARCHIVE_PATH = join(RAW_DIR, "Dossiers_Legislatifs.json.zip");
const EXTRACT_DIR = join(RAW_DIR, "dossiers");

export type Qualite = "rapporteur général" | "rapporteur spécial" | "rapporteur pour avis" | "rapporteur" | string;

/** Une feuille de rapport : un tome, un volume ou une annexe, avec sa propre page HTML. */
export interface RapportFeuille {
  uid: string; // RAPPANR5L17B1996-tIII-a26
  racine: string; // RAPPANR5L17B1996
  type: "RAPP" | "AVIS";
  titre: string; // « Annexe 26 : Gestion du patrimoine immobilier de l'État »
  date_depot: string | null; // AAAA-MM-JJ
  date_publication_web: string | null; // AAAA-MM-JJ, null = pas en ligne
  rapporteurs: { acteurRef: string; qualite: Qualite }[];
  organe: string | null; // commission qui a produit la feuille (PO59048 = finances)
  url: string; // page publique
}

export async function telechargerArchive(): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });
  if (!existsSync(ARCHIVE_PATH)) {
    console.log(`téléchargement ${ARCHIVE_URL}`);
    const res = await fetch(ARCHIVE_URL);
    if (!res.ok) throw new Error(`téléchargement impossible : ${res.status}`);
    await Bun.write(ARCHIVE_PATH, await res.arrayBuffer());
  }
  if (!existsSync(join(EXTRACT_DIR, "json", "document"))) {
    mkdirSync(EXTRACT_DIR, { recursive: true });
    const p = Bun.spawn(["unzip", "-q", "-o", ARCHIVE_PATH, "-d", EXTRACT_DIR]);
    if ((await p.exited) !== 0) throw new Error("unzip a échoué");
  }
}

function lireDocument(uid: string): any | null {
  const f = join(EXTRACT_DIR, "json", "document", `${uid}.json`);
  if (!existsSync(f)) return null;
  return JSON.parse(readFileSync(f, "utf8")).document;
}

const jour = (s: string | null | undefined) => (s ? s.slice(0, 10) : null);
const liste = <T>(x: T | T[] | null | undefined): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);

function auteurs(doc: any): { rapporteurs: RapportFeuille["rapporteurs"]; organe: string | null } {
  const rapporteurs: RapportFeuille["rapporteurs"] = [];
  let organe: string | null = null;
  for (const a of liste<any>(doc?.auteurs?.auteur)) {
    if (a?.acteur?.acteurRef) rapporteurs.push({ acteurRef: a.acteur.acteurRef, qualite: (a.acteur.qualite ?? "rapporteur").toLowerCase() });
    if (a?.organe?.organeRef) organe = a.organe.organeRef;
  }
  return { rapporteurs, organe };
}

export function urlRapport(uid: string): string {
  return `https://www.assemblee-nationale.fr/dyn/opendata/${uid}.html`;
}

/** Aplatit un document (rapport ou avis) en feuilles ; une feuille hérite des auteurs de son parent si elle n'en a pas. */
function aplatir(doc: any, racine: string, type: "RAPP" | "AVIS", herite: ReturnType<typeof auteurs>, chemin: string[], out: RapportFeuille[]): void {
  const propres = auteurs(doc);
  const a = propres.rapporteurs.length ? propres : { rapporteurs: herite.rapporteurs, organe: propres.organe ?? herite.organe };
  const divisions = liste<any>(doc?.divisions?.division);
  const denom = doc?.denominationStructurelle ? String(doc.denominationStructurelle) : "";
  const titrePrincipal = doc?.titres?.titrePrincipal ? String(doc.titres.titrePrincipal) : "";
  const label = [denom, titrePrincipal].filter(Boolean).join(" : ");
  const cheminIci = chemin.length === 0 ? [titrePrincipal] : [...chemin, label];
  if (divisions.length === 0) {
    out.push({
      uid: doc.uid,
      racine,
      type,
      titre: cheminIci.length > 1 ? cheminIci.slice(1).join(", ") : titrePrincipal,
      date_depot: jour(doc?.cycleDeVie?.chrono?.dateDepot),
      date_publication_web: jour(doc?.cycleDeVie?.chrono?.datePublicationWeb),
      rapporteurs: a.rapporteurs,
      organe: a.organe,
      url: urlRapport(doc.uid),
    });
    return;
  }
  for (const d of divisions) aplatir(d, racine, type, a, cheminIci, out);
}

/** Toutes les feuilles de rapports et d'avis de l'Assemblée rattachées au dossier législatif d'un texte. */
export function rapportsDuTexte(texteId: string): { dossierRef: string; titre: string; feuilles: RapportFeuille[] } {
  const texte = lireDocument(texteId);
  if (!texte) throw new Error(`texte ${texteId} absent de l'archive open data`);
  const dossierRef: string = texte.dossierRef;
  const dir = join(EXTRACT_DIR, "json", "document");
  const feuilles: RapportFeuille[] = [];
  for (const f of readdirSync(dir)) {
    // Rapports et avis déposés à l'Assemblée (les rapports du Sénat ont des rapporteurs sénateurs).
    if (!/^(RAPP|AVIS)ANR5L17B\d+\.json$/.test(f)) continue;
    const doc = JSON.parse(readFileSync(join(dir, f), "utf8")).document;
    if (doc?.dossierRef !== dossierRef) continue;
    const type = f.startsWith("RAPP") ? "RAPP" : "AVIS";
    aplatir(doc, doc.uid, type, { rapporteurs: [], organe: null }, [], feuilles);
  }
  feuilles.sort((x, y) => x.uid.localeCompare(y.uid, "fr", { numeric: true }));
  return { dossierRef, titre: texte?.titres?.titrePrincipal ?? texteId, feuilles };
}
