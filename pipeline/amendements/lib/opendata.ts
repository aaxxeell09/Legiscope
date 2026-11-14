// Lecture de l'open data Amendements de l'Assemblée nationale (17e législature).
// L'archive complète fait ~363 Mo ; on n'en extrait que les fichiers du texte demandé
// (chemin json/<dossier>/<texte_id>/<uid>.json) et on garde, par dossier Bascule, un
// cache réduit aux amendements du sujet (pipeline/amendements/cache/<dossier>.json).

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const ARCHIVE_URL =
  "https://data.assemblee-nationale.fr/static/openData/repository/17/loi/amendements_div_legis/Amendements.json.zip";

/** Un amendement brut de l'open data, réduit aux champs utiles (le même format que le cache). */
export type AmendementBrut = {
  uid: string;
  texte_id: string;
  numero: string;
  examen_ref: string;
  organe_examen: string;
  auteur_id: string | null;
  auteur_type: string;
  auteur_groupe_id: string | null;
  cosignataires_ids: string[];
  suffixe: string | null;
  article: string | null; // "22", "3", "49" ; null hors article
  article_designation: string | null; // "ART. 22", "APRÈS ART. 3"
  article_additionnel: boolean;
  dispositif: string; // HTML brut
  expose: string; // HTML brut
  date_depot: string | null; // AAAA-MM-JJ
  date_sort: string | null; // AAAA-MM-JJ
  sort_brut: string | null; // cycleDeVie.sort ("Adopté", "Rejeté", ...)
  etat: string | null; // etatDesTraitements.etat.libelle
  sous_etat: string | null; // etatDesTraitements.sousEtat.libelle
};

const nil = (v: unknown): v is null | undefined =>
  v === null || v === undefined || (typeof v === "object" && v !== null && "@xsi:nil" in (v as object));

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

const jour = (v: unknown): string | null => {
  const s = str(v);
  return s ? s.slice(0, 10) : null;
};

/** Convertit un fichier JSON de l'open data en AmendementBrut. Renvoie null si le fichier n'est pas un amendement. */
export function lireBrut(json: unknown): AmendementBrut | null {
  const d: any = (json as any)?.amendement ?? json;
  if (!d || typeof d.uid !== "string") return null;
  const sig = d.signataires ?? {};
  const auteur = sig.auteur ?? {};
  let cos: string[] = [];
  const cref = sig.cosignataires?.acteurRef;
  if (typeof cref === "string") cos = [cref];
  else if (Array.isArray(cref)) cos = cref.filter((x: unknown) => typeof x === "string");
  const div = d.pointeurFragmentTexte?.division ?? {};
  const designation = str(div.articleDesignationCourte);
  const m = designation ? /ART\.\s*(\d+)/.exec(designation) : null;
  const cv = d.cycleDeVie ?? {};
  const et = cv.etatDesTraitements ?? {};
  return {
    uid: d.uid,
    texte_id: String(d.texteLegislatifRef ?? ""),
    numero: String(d.identification?.numeroLong ?? d.identification?.numeroOrdreDepot ?? d.uid),
    examen_ref: String(d.examenRef ?? ""),
    organe_examen: /EXANR5L17(PO\d+)/.exec(String(d.examenRef ?? ""))?.[1] ?? "",
    auteur_id: str(auteur.acteurRef),
    auteur_type: String(auteur.typeAuteur ?? ""),
    auteur_groupe_id: str(auteur.groupePolitiqueRef),
    cosignataires_ids: cos,
    suffixe: nil(sig.suffixe) ? null : str(sig.suffixe),
    article: m ? m[1] : null,
    article_designation: designation,
    // « Après l'article 3 » : articleAdditionnel vaut parfois false, avant_A_Apres dit « Après ».
    article_additionnel:
      div.articleAdditionnel === true || div.articleAdditionnel === "true" || /^(avant|apr)/i.test(String(div.avant_A_Apres ?? "")),
    dispositif: str(d.corps?.contenuAuteur?.dispositif) ?? "",
    expose: str(d.corps?.contenuAuteur?.exposeSommaire) ?? "",
    date_depot: jour(cv.dateDepot),
    date_sort: jour(cv.dateSort),
    sort_brut: nil(cv.sort) ? null : str(cv.sort),
    etat: str(et.etat?.libelle),
    sous_etat: str(et.sousEtat?.libelle),
  };
}

/** Télécharge l'archive si elle n'est pas déjà là. Renvoie son chemin. */
export async function archiveLocale(cheminDemande?: string): Promise<string> {
  const candidats = [cheminDemande, process.env.AN_AMENDEMENTS_ZIP, join(tmpdir(), "bascule-opendata", "Amendements.json.zip")].filter(
    (c): c is string => !!c,
  );
  for (const c of candidats) if (existsSync(c) && statSync(c).size > 1_000_000) return c;
  const cible = candidats[candidats.length - 1];
  mkdirSync(join(cible, ".."), { recursive: true });
  console.log(`téléchargement de ${ARCHIVE_URL} (environ 363 Mo) vers ${cible}`);
  const res = await fetch(ARCHIVE_URL);
  if (!res.ok) throw new Error(`téléchargement impossible : HTTP ${res.status}`);
  await Bun.write(cible, res);
  return cible;
}

/** Extrait de l'archive les fichiers d'un texte (par son identifiant PRJLANR5L17B3210) et les renvoie en AmendementBrut. */
export async function lireTexteDepuisArchive(archive: string, texteId: string): Promise<AmendementBrut[]> {
  const dest = join(tmpdir(), "bascule-opendata", "extrait", texteId);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  // `unzip` est présent sur macOS et Linux ; le motif ne garde que le sous-dossier du texte.
  const proc = Bun.spawn(["unzip", "-q", "-o", archive, `json/*/${texteId}/*`, "-d", dest], { stdout: "ignore", stderr: "pipe" });
  const code = await proc.exited;
  if (code !== 0 && code !== 11) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`unzip a échoué (code ${code}) : ${err.slice(0, 300)}`);
  }
  const out: AmendementBrut[] = [];
  const marche = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) marche(p);
      else if (n.endsWith(".json")) {
        const b = lireBrut(JSON.parse(readFileSync(p, "utf8")));
        if (b && b.texte_id === texteId) out.push(b);
      }
    }
  };
  marche(dest);
  out.sort((a, b) => a.uid.localeCompare(b.uid));
  return out;
}
