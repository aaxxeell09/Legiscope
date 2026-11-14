// Comptes rendus de séance publique : archive syseron.xml.zip (open data AN), un fichier XML par séance.
// Téléchargement si absent, décompression, lecture fichier par fichier (jamais tout en mémoire),
// filtrage par mots-clés du sujet et par l'article de la mesure, attribution par `id_acteur`.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DossierConfig } from "../../contracts";
import { RAW } from "./contexte";
import { anneePLF, contientMotCle, regexMotsCles, sansAccents } from "./texte";
import type { Intervention, SourceLue } from "./types";

export const URL_SYSERON = "https://data.assemblee-nationale.fr/static/openData/repository/17/vp/syceronbrut/syseron.xml.zip";
const ZIP = join(RAW, "syseron.xml.zip");
const DOSSIER_XML = join(RAW, "syseron", "xml", "compteRendu");
const CACHE_URLS = join(RAW, "urls-seance.json");
const CACHE_ORATEURS = join(RAW, "orateurs-seance.json");

export async function preparerSyseron(log: (s: string) => void): Promise<void> {
  mkdirSync(RAW, { recursive: true });
  // Les XML déjà décompressés suffisent : on ne retélécharge l'archive que si le dossier manque ou est vide.
  if (existsSync(DOSSIER_XML) && readdirSync(DOSSIER_XML).some((f) => f.endsWith(".xml"))) return;
  if (!existsSync(ZIP)) {
    log(`téléchargement de ${URL_SYSERON} (62 Mo)`);
    const r = await fetch(URL_SYSERON);
    if (!r.ok) throw new Error(`syseron.xml.zip : HTTP ${r.status}`);
    writeFileSync(ZIP, new Uint8Array(await r.arrayBuffer()));
  }
  log("décompression de syseron.xml.zip");
  const p = Bun.spawnSync(["unzip", "-o", "-q", ZIP, "-d", join(RAW, "syseron")]);
  if (p.exitCode !== 0) throw new Error(`unzip : ${p.stderr.toString()}`);
}

export function fichiersSeance(): string[] {
  return readdirSync(DOSSIER_XML)
    .filter((f) => f.endsWith(".xml"))
    .sort()
    .map((f) => join(DOSSIER_XML, f));
}

function decoderEntites(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

/** Texte d'un paragraphe : didascalies en italique entre parenthèses retirées, balises retirées. */
export function nettoyerTexte(inner: string): string {
  let t = inner;
  t = t.replace(/<italique>\s*\((?:(?!<\/italique>).)*?\)\s*<\/italique>/gs, " ");
  t = t.replace(/<italique>\s*[–-]\s*(?:(?!<\/italique>).)*?\)\s*<\/italique>/gs, " ");
  t = t.replace(/<br\s*\/?>/g, " ");
  t = t.replace(/<[^>]+>/g, "");
  t = decoderEntites(t);
  // On garde la typographie du compte rendu (espace avant « : » ou « ? ») ; seules les virgules et points
  // orphelins laissés par une didascalie retirée sont recollés.
  return t.replace(/\s+/g, " ").replace(/\s+([,.])/g, "$1").trim();
}

type Meta = { uid: string; date: string; numSeanceJour: string; dateSeanceJour: string; session: string };

function metadonnees(xml: string): Meta | null {
  const g = (tag: string) => xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() ?? "";
  const uid = g("uid");
  const ds = g("dateSeance");
  if (!uid || ds.length < 8) return null;
  return {
    uid,
    date: `${ds.slice(0, 4)}-${ds.slice(4, 6)}-${ds.slice(6, 8)}`,
    numSeanceJour: g("numSeanceJour"),
    dateSeanceJour: g("dateSeanceJour"),
    session: g("session"),
  };
}

const ORDINAUX: Record<string, string> = { "1": "Première", "2": "Deuxième", "3": "Troisième", "4": "Quatrième", Unique: "Séance unique" };

function labelSeance(m: Meta): string {
  const ord = ORDINAUX[m.numSeanceJour] ?? m.numSeanceJour;
  return ord === "Séance unique" ? `Séance unique du ${m.dateSeanceJour}` : `${ord} séance du ${m.dateSeanceJour}`;
}

function attr(tag: string, nom: string): string {
  return tag.match(new RegExp(`\\s${nom}="([^"]*)"`))?.[1] ?? "";
}

let cacheUrls: Record<string, string> | null = null;
/** Page publique d'une séance : l'URL par uid redirige vers l'adresse lisible ; on garde celle-ci. */
export async function urlSeance(uid: string): Promise<string> {
  if (!cacheUrls) cacheUrls = existsSync(CACHE_URLS) ? JSON.parse(readFileSync(CACHE_URLS, "utf8")) : {};
  if (cacheUrls![uid]) return cacheUrls![uid];
  const brute = `https://www.assemblee-nationale.fr/dyn/17/comptes-rendus/seance/${uid}`;
  let finale = brute;
  try {
    const r = await fetch(brute, { redirect: "manual" });
    const loc = r.headers.get("location");
    if (loc && /^https?:\/\//.test(loc)) finale = loc;
    else if (loc) finale = new URL(loc, brute).toString();
  } catch {
    /* on garde l'URL brute, qui fonctionne aussi */
  }
  cacheUrls![uid] = finale;
  writeFileSync(CACHE_URLS, JSON.stringify(cacheUrls, null, 2));
  return finale;
}

/** Carte nom d'orateur normalisé → PA, construite sur toutes les séances (cache sur disque). */
export function orateursSeance(normaliser: (s: string) => string): Map<string, string> {
  if (existsSync(CACHE_ORATEURS)) {
    const j = JSON.parse(readFileSync(CACHE_ORATEURS, "utf8")) as Record<string, string>;
    return new Map(Object.entries(j));
  }
  const carte = new Map<string, string>();
  const re = /<paragraphe [^>]*id_acteur="(PA\d+)"[^>]*>\s*<orateurs>\s*<orateur>\s*<nom>([^<]*)<\/nom>\s*<id>\d*<\/id>\s*<qualite\s*\/?>?/g;
  for (const f of fichiersSeance()) {
    const xml = readFileSync(f, "utf8");
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      const nom = decoderEntites(m[2]).replace(/^(M\.|Mme|M)\s+/, "").trim();
      if (!nom || /^(le président|la présidente)/i.test(nom)) continue;
      const cle = normaliser(nom);
      if (!carte.has(cle)) carte.set(cle, m[1]);
    }
  }
  writeFileSync(CACHE_ORATEURS, JSON.stringify(Object.fromEntries(carte), null, 2));
  return carte;
}

export type ResultatSeance = { interventions: Intervention[]; lues: SourceLue[]; scannees: number };

/**
 * Parcourt les séances, garde celles du bon projet de loi de finances (année du libellé du dossier)
 * contenant un mot-clé, puis les paragraphes qui contiennent un mot-clé ou qui sont dans le point
 * de l'ordre du jour de l'article de la mesure.
 */
export async function lireSeances(dossier: DossierConfig, log: (s: string) => void): Promise<ResultatSeance> {
  const re = regexMotsCles(dossier.sujet.mots_cles);
  const annee = anneePLF(dossier.label) ?? anneePLF(dossier.mesure.label);
  const marquePLF = annee ? `loi de finances pour ${annee}` : null;
  const article = dossier.mesure.article.trim();
  const interventions: Intervention[] = [];
  const lues: SourceLue[] = [];
  let scannees = 0;

  for (const f of fichiersSeance()) {
    const xml = readFileSync(f, "utf8");
    const meta = metadonnees(xml);
    if (!meta) continue;
    if (dossier.date_reference && meta.date > dossier.date_reference) continue;
    const plat = sansAccents(xml);
    if (marquePLF && !plat.includes(marquePLF)) continue;
    scannees += 1;
    if (!re.test(plat)) continue;

    const url = await urlSeance(meta.uid);
    const label = labelSeance(meta);
    let retenus = 0;

    // Pile des points de l'ordre du jour (nivpoint, art, intitulé) pour savoir si l'on est dans l'article de la mesure.
    const pile: { art: string; titre: string; typeDebat: string }[] = [];
    const tokens = /<point\b[^>]*>(?:\s*<orateurs\/>\s*<texte>(.*?)<\/texte>)?|<\/point>|<paragraphe\b[^>]*>.*?<\/paragraphe>/gs;
    let m: RegExpExecArray | null;
    const corps = xml.slice(xml.indexOf("<contenu>") >= 0 ? xml.indexOf("<contenu>") : 0);
    while ((m = tokens.exec(corps)) !== null) {
      const tok = m[0];
      if (tok.startsWith("<point")) {
        const tag = tok.match(/<point\b[^>]*>/)![0];
        const adt = attr(tag, "adt").trim();
        const titre = nettoyerTexte(m[1] ?? "") || (adt ? `Amendement n° ${adt}` : "");
        pile.push({ art: attr(tag, "art").trim(), titre, typeDebat: "" });
        continue;
      }
      if (tok === "</point>") {
        pile.pop();
        continue;
      }
      const tag = tok.match(/<paragraphe\b[^>]*>/)![0];
      const code = attr(tag, "code_grammaire");
      if (!/^(PAROLE_GENERIQUE|INTERRUPTION)/.test(code)) continue;
      if (attr(tag, "roledebat") === "president") continue;
      const typeDebat = attr(tag, "type_debat");
      const nom = decoderEntites(tok.match(/<nom>([^<]*)<\/nom>/)?.[1] ?? "").trim();
      if (!nom || /^(M\. le président|Mme la présidente)/.test(nom)) continue;
      const qualite = decoderEntites(tok.match(/<qualite>([^<]*)<\/qualite>/)?.[1] ?? "").trim();
      const texte = nettoyerTexte(tok.match(/<texte\b[^>]*>(.*?)<\/texte>/s)?.[1] ?? "");
      if (texte.length < 40) continue;

      const motCle = contientMotCle(texte, re);
      const dansArticle =
        article !== "" &&
        (typeDebat === "PLF" || !marquePLF) &&
        pile.some((p) => p.art === article || contientMotCle(p.titre, re));
      if (!motCle && !dansArticle) continue;
      if (!motCle && code.startsWith("INTERRUPTION")) continue;

      retenus += 1;
      interventions.push({
        id: `${meta.uid}#${attr(tag, "id_syceron") || attr(tag, "ordre_absolu_seance")}`,
        dossier_id: dossier.id,
        date: meta.date,
        lieu: "seance",
        url,
        source_label: label,
        orateur_nom: nom,
        orateur_qualite: qualite,
        acteur_id: attr(tag, "id_acteur") || null,
        groupe_sigle: null,
        texte,
        contexte: pile.map((p) => p.titre).filter(Boolean).slice(-2).join(", "),
        mot_cle: motCle,
      });
    }
    if (retenus > 0) {
      lues.push({ lieu: "seance", uid: meta.uid, date: meta.date, url, label, retenus });
      log(`séance ${meta.uid} ${meta.date} : ${retenus} paragraphes`);
    }
  }
  return { interventions, lues, scannees };
}
