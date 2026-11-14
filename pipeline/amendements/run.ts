// Session A3 : amendements déposés ou cosignés par député sur le sujet de chaque dossier.
// Usage : bun run amendements [--root data] [--out <dossier>] [--deputes PA1,PA2] [--archive <zip>]
//   --root     racine lue (config.json, groupes-action.json ou pivots.json). Défaut : data ; si
//              data/config.json manque, contracts/fixtures/config.json avec un avertissement.
//   --out      racine écrite (défaut : la même que --root). Produit <out>/<dossier>/amendements/<PA>.json.
//   --deputes  liste explicite de députés (pour tester sans pivots).
//   --archive  chemin local de Amendements.json.zip (sinon $AN_AMENDEMENTS_ZIP, sinon téléchargement).
//   --source opendata  ignore data/raw de P1 et lit le cache open data ; --rebuild reconstruit le cache.
// Sources, par ordre de préférence : data/raw/<dossier>/amendements.json (P1, API Hémicycle),
// puis le cache pipeline/amendements/cache/<dossier>.json construit depuis l'open data de l'Assemblée.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { AmendementsSchema, ConfigSchema, dataPath, type AmendementDepute, type Amendements, type Config, type DossierConfig } from "../../contracts/index";
import { archiveLocale, lireBrut, lireTexteDepuisArchive, ARCHIVE_URL, type AmendementBrut } from "./lib/opendata";
import { estDuSujet, regexSujet, resumer, sortUnifie, travailleAvec } from "./lib/normaliser";

const REPO = join(import.meta.dir, "..", "..");
const CACHE = join(import.meta.dir, "cache");
const AN = "https://www.assemblee-nationale.fr";

function arg(nom: string): string | undefined {
  const i = process.argv.indexOf(`--${nom}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const root = arg("root") ?? "data";
const out = arg("out") ?? root;
const deputesForces = arg("deputes")?.split(",").map((s) => s.trim()).filter(Boolean);

function lireJson<T>(chemin: string): T {
  return JSON.parse(readFileSync(chemin, "utf8")) as T;
}

function maintenant(): string {
  // Horodatage ISO avec le décalage local (le schéma refuse le « Z » nu ? non, mais on garde l'heure de Paris lisible).
  const d = new Date();
  const tz = -d.getTimezoneOffset();
  const signe = tz >= 0 ? "+" : "-";
  const p = (n: number) => String(Math.abs(n)).padStart(2, "0");
  const local = new Date(d.getTime() + tz * 60_000).toISOString().slice(0, 19);
  return `${local}${signe}${p(Math.floor(Math.abs(tz) / 60))}:${p(Math.abs(tz) % 60)}`;
}

/** Liste des députés d'un dossier : groupes-action.json (définitif), sinon pivots.json, plus pivot_demo. */
function deputesDuDossier(dossier: DossierConfig): { ids: string[]; source: string } {
  if (deputesForces?.length) return { ids: deputesForces, source: "--deputes" };
  const ids = new Set<string>();
  const ga = join(REPO, root, dossier.id, "groupes-action.json");
  let source = "";
  if (existsSync(ga)) {
    const g = lireJson<{ actionnables?: { depute_id: string }[]; allies?: { depute_id: string }[]; perdus?: { depute_id: string }[] }>(ga);
    for (const l of [g.actionnables ?? [], g.allies ?? [], g.perdus ?? []]) for (const d of l) if (d.depute_id) ids.add(d.depute_id);
    source = "groupes-action.json";
  }
  const pv = join(REPO, dataPath(dossier.id, "pivots", undefined, root));
  if (existsSync(pv)) {
    for (const d of lireJson<{ deputes: { id: string }[] }>(pv).deputes) ids.add(d.id);
    source = source ? `${source} + pivots.json` : "pivots.json";
  }
  if (dossier.pivot_demo) ids.add(dossier.pivot_demo);
  return { ids: [...ids].sort(), source: source || "aucune liste (groupes-action.json et pivots.json absents)" };
}

/** Amendements bruts de P1 (API Hémicycle) ramenés au format AmendementBrut. Null si le fichier n'existe pas. */
function lireRawP1(dossier: DossierConfig): AmendementBrut[] | null {
  const chemin = join(REPO, "data", "raw", dossier.id, "amendements.json");
  if (!existsSync(chemin)) return null;
  const brut: any = lireJson(chemin);
  const liste: any[] = Array.isArray(brut) ? brut : Array.isArray(brut?.data) ? brut.data : Array.isArray(brut?.amendements) ? brut.amendements : [];
  const out: AmendementBrut[] = [];
  for (const a of liste) {
    // Deux formes possibles : objet open data (uid, signataires...) ou objet Hémicycle (numero, auteur, signataires, sort...).
    const od = lireBrut(a);
    if (od) {
      out.push(od);
      continue;
    }
    const id = String(a.id ?? a.uid ?? "");
    if (!id) continue;
    const sig: any[] = Array.isArray(a.signataires) ? a.signataires : [];
    const idDe = (x: any) => (typeof x === "string" ? x : x?.id ?? x?.acteur_id ?? x?.acteurRef ?? null);
    // Format P1 (14 novembre, 15 h 40) : `article` = "ARTICLE 22" | "Article 4" | "ETAT B",
    // `article_additionnel` booléen, `auteur` = PA (ou PA du rapporteur), `signataires` = liste de PA,
    // `etat` / `sous_etat` / `sort` = libellés open data, dates AAAA-MM-JJ.
    const label = a.article ? String(a.article) : "";
    const num = /art(?:icle|\.)\s*(\d+)/i.exec(label)?.[1] ?? null;
    const additionnel = a.article_additionnel === true;
    out.push({
      uid: id,
      texte_id: String(a.texte ?? a.texte_id ?? dossier.texte_id),
      numero: String(a.numero ?? id),
      examen_ref: String(a.examen ?? ""),
      organe_examen: /EXANR5L17(PO\d+)/.exec(String(a.examen ?? ""))?.[1] ?? "",
      auteur_id: idDe(a.auteur),
      auteur_type: String(a.type_auteur ?? a.auteur_type ?? "Député"),
      auteur_groupe_id: typeof a.groupe === "string" ? a.groupe : a.groupe?.id ?? null,
      cosignataires_ids: sig.map(idDe).filter((x: unknown): x is string => typeof x === "string"),
      suffixe: null,
      article: num,
      article_designation: num ? `${additionnel ? "APRÈS ART. " : "ART. "}${num}` : label || null,
      article_additionnel: additionnel,
      dispositif: String(a.dispositif ?? ""),
      expose: String(a.expose ?? ""),
      date_depot: a.date_depot ? String(a.date_depot).slice(0, 10) : null,
      date_sort: a.date_sort ? String(a.date_sort).slice(0, 10) : null,
      sort_brut: a.sort ?? null,
      etat: a.etat ?? a.sort_libelle ?? a.sort ?? null,
      sous_etat: a.sous_etat ?? null,
    });
  }
  return out;
}

type Cache = { meta: { source: string; texte_id: string; genere_le: string; total_texte: number; filtre: string }; amendements: (AmendementBrut & { sujet_par: "mots_cles" | "article" })[] };

/** Amendements du sujet depuis le cache open data, construit au besoin depuis l'archive. */
async function lireCacheOpendata(dossier: DossierConfig): Promise<Cache> {
  const chemin = join(CACHE, `${dossier.id}.json`);
  if (existsSync(chemin) && !process.argv.includes("--rebuild")) return lireJson<Cache>(chemin);
  const archive = await archiveLocale(arg("archive"));
  console.log(`[${dossier.id}] extraction de ${dossier.texte_id} depuis ${archive}`);
  const tous = await lireTexteDepuisArchive(archive, dossier.texte_id);
  const re = regexSujet(dossier.sujet.mots_cles);
  const article = dossier.mesure.article || null;
  const retenus = tous
    .filter((a) => a.etat !== "effacé")
    .map((a) => ({ a, s: estDuSujet(a, re, article) }))
    .filter((x) => x.s.oui)
    .map((x) => ({ ...x.a, sujet_par: x.s.par! }));
  const cache: Cache = {
    meta: {
      source: ARCHIVE_URL,
      texte_id: dossier.texte_id,
      genere_le: maintenant(),
      total_texte: tous.length,
      filtre: `mots-clés ${JSON.stringify(dossier.sujet.mots_cles)} (mots entiers, sans accents) dans le dispositif, ou un mot-clé composé dans l'exposé, ou un mot-clé simple au moins deux fois dans l'exposé, ou amendement sur l'article ${article ?? "(aucun)"}`,
    },
    amendements: retenus,
  };
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(chemin, JSON.stringify(cache, null, 1) + "\n");
  console.log(`[${dossier.id}] ${tous.length} amendements du texte, ${retenus.length} sur le sujet, cache ${chemin}`);
  return cache;
}

async function traiterDossier(dossier: DossierConfig, config: Config) {
  const ref = dossier.date_reference;
  let bruts: AmendementBrut[];
  let sources: { label: string; url: string }[];
  let origine: string;
  const p1 = arg("source") === "opendata" ? null : lireRawP1(dossier);
  if (p1 && p1.length > 0) {
    const re = regexSujet(dossier.sujet.mots_cles);
    const article = dossier.mesure.article || null;
    bruts = p1.filter((a) => estDuSujet(a, re, article).oui);
    // P1 a écrit ce fichier depuis l'open data (champ `source: "opendata"`) ou depuis l'API Hémicycle.
    const rawSource = String((lireJson<any>(join(REPO, "data", "raw", dossier.id, "amendements.json")) as any)?.source ?? "");
    const depuisOpendata = /opendata|open data/i.test(rawSource);
    origine = `data/raw/${dossier.id}/amendements.json (P1, ${depuisOpendata ? "open data Assemblée nationale" : "API Hémicycle"}), ${p1.length} amendements lus, ${bruts.length} sur le sujet`;
    sources = [
      depuisOpendata
        ? { label: "Open data Assemblée nationale, amendements (17e législature), via data/raw de P1", url: ARCHIVE_URL }
        : { label: "Hémicycle API amendements", url: "https://api.hemicycle.ai/v1/amendements" },
      { label: `Amendements au texte ${dossier.texte_id}`, url: `${AN}/dyn/17/amendements?texteLegislatifRef=${dossier.texte_id}` },
    ];
  } else {
    const cache = await lireCacheOpendata(dossier);
    bruts = cache.amendements;
    origine = `open data Assemblée nationale (cache pipeline/amendements/cache/${dossier.id}.json), ${cache.meta.total_texte} amendements du texte, ${bruts.length} sur le sujet`;
    sources = [
      { label: "Open data Assemblée nationale, amendements (17e législature)", url: ARCHIVE_URL },
      { label: `Amendements au texte ${dossier.texte_id}`, url: `${AN}/dyn/17/amendements?texteLegislatifRef=${dossier.texte_id}` },
    ];
  }
  // Rejeu : rien de déposé après la date de référence.
  const avantRef = ref ? bruts.filter((a) => !a.date_depot || a.date_depot <= ref) : bruts;
  const { ids, source: listeSource } = deputesDuDossier(dossier);
  console.log(`[${dossier.id}] ${origine} ; ${avantRef.length} retenus au ${ref ?? "jour"} ; ${ids.length} députés (${listeSource})`);

  const parDepute = new Map<string, AmendementDepute[]>();
  for (const id of ids) parDepute.set(id, []);
  let total = 0;
  let avecOrg = 0;
  let rejoues = 0;
  for (const a of avantRef.sort((x, y) => (x.date_depot ?? "").localeCompare(y.date_depot ?? "") || x.uid.localeCompare(y.uid))) {
    const concernes: [string, "auteur" | "cosignataire"][] = [];
    if (a.auteur_id && parDepute.has(a.auteur_id)) concernes.push([a.auteur_id, "auteur"]);
    for (const c of a.cosignataires_ids) if (parDepute.has(c) && c !== a.auteur_id) concernes.push([c, "cosignataire"]);
    if (concernes.length === 0) continue;
    const s = sortUnifie(a, ref);
    const orgs = travailleAvec(a.expose);
    const item: AmendementDepute & { numero: string; sort_libelle: string; date_depot: string | null; date_sort: string | null; article: string | null } = {
      id: a.uid,
      texte_id: a.texte_id || dossier.texte_id,
      role: "auteur",
      resume: resumer(a),
      sort: s.sort,
      travaille_avec: orgs,
      url: `${AN}/dyn/17/amendements/${a.uid}`,
      // Champs hors contrat, tolérés par le schéma (clés inconnues ignorées) : le libellé exact de
      // l'Assemblée, parce que l'enum ne distingue pas « non soutenu » d'« irrecevable ».
      numero: a.numero,
      sort_libelle: s.libelle,
      date_depot: a.date_depot,
      date_sort: ref && a.date_sort && a.date_sort >= ref ? null : a.date_sort,
      article: a.article_designation,
    };
    for (const [id, role] of concernes) {
      parDepute.get(id)!.push({ ...item, role });
      total += 1;
      if (orgs.length) avecOrg += 1;
      if (s.en_attente_par_rejeu) rejoues += 1;
    }
  }

  const limites = [
    `Source : ${origine}.`,
    `Sujet = mots-clés de config.json (${dossier.sujet.mots_cles.join(", ")}) dans le dispositif, ou un mot-clé composé dans l'exposé, ou un mot-clé simple au moins deux fois dans l'exposé, ou amendement sur l'article ${dossier.mesure.article}.`,
    "Rôle : auteur ou cosignataire nommé ; un député couvert par « et les membres du groupe » n'est pas compté.",
    "Sort unifié : « non soutenu » et « irrecevable » sont tous deux rendus par non_examine (enum), le libellé exact est dans sort_libelle.",
    ref ? `Rejeu au matin du ${ref} : amendements déposés après ce jour exclus, sort daté de ce jour ou après rendu en_attente (${rejoues} cas).` : "Pas de date de référence : sorts au jour de l'archive.",
    "« travaillé avec » : formules repérées dans l'exposé des motifs (travaillé avec, proposé par, en lien avec, issu des travaux de), nom pris tel quel, sans inférence.",
  ].join(" ");

  const dir = join(isAbsolute(out) ? out : join(REPO, out), dossier.id, "amendements");
  mkdirSync(dir, { recursive: true });
  for (const [id, amendements] of parDepute) {
    const fichier: Amendements = {
      meta: { generated_at: maintenant(), sources, limits: limites, producer: "pipeline/amendements", dossier_id: dossier.id },
      depute_id: id,
      amendements,
    };
    const res = AmendementsSchema.safeParse(fichier);
    if (!res.success) {
      console.error(`[${dossier.id}] ${id} invalide :`, res.error.issues.slice(0, 5));
      process.exitCode = 1;
      continue;
    }
    writeFileSync(join(dir, `${id}.json`), JSON.stringify(fichier, null, 2) + "\n");
  }
  const nonVides = [...parDepute.values()].filter((l) => l.length > 0).length;
  console.log(`[${dossier.id}] ${ids.length} fichiers écrits dans ${dir}, ${nonVides} non vides, ${total} amendements, ${avecOrg} avec « travaillé avec »`);
  return { dossier: dossier.id, deputes: ids.length, nonVides, total, avecOrg, rejoues, origine, listeSource };
}

async function main() {
  let cheminConfig = join(REPO, dataPath(null, "config", undefined, root));
  if (!existsSync(cheminConfig)) {
    const repli = join(REPO, "contracts", "fixtures", "config.json");
    console.warn(`${cheminConfig} absent : lecture de ${repli} (mêmes dossiers, mêmes mots-clés)`);
    cheminConfig = repli;
  }
  const config = ConfigSchema.parse(lireJson(cheminConfig));
  const seul = arg("dossier");
  const bilan = [];
  for (const dossier of config.dossiers) {
    if (seul && dossier.id !== seul) continue;
    bilan.push(await traiterDossier(dossier, config));
  }
  console.table(bilan.map((b) => ({ dossier: b.dossier, deputes: b.deputes, non_vides: b.nonVides, amendements: b.total, travaille_avec: b.avecOrg, rejoues: b.rejoues, liste: b.listeSource })));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
