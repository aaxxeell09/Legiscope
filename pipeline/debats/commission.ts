// Comptes rendus de la commission des finances : pas d'export en masse. Chaque réunion a une page
// publique /dyn/17/comptes-rendus/cion_fin/l17cion_fin<ss><nnn>_compte-rendu dont le contenu est servi
// par /dyn/docs/CRCANR5L17S<annee>PO59048N<nnn>.raw (HTML). On énumère les numéros d'une session,
// on met en cache sur disque, on garde les paragraphes sur le sujet, orateur lu dans le gras.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import type { DossierConfig } from "../../contracts";
import { RAW } from "./contexte";
import { anneePLF, contientMotCle, regexMotsCles, sansAccents } from "./texte";
import type { Intervention, SourceLue } from "./types";

const PO_FINANCES = "PO59048";
const CACHE = join(RAW, "commission");

const MOIS: Record<string, string> = {
  janvier: "01", fevrier: "02", mars: "03", avril: "04", mai: "05", juin: "06",
  juillet: "07", aout: "08", septembre: "09", octobre: "10", novembre: "11", decembre: "12",
};

export function uidCommission(annee: number, n: number): string {
  return `CRCANR5L17S${annee}${PO_FINANCES}N${String(n).padStart(3, "0")}`;
}
export function urlRawCommission(annee: number, n: number): string {
  return `https://www.assemblee-nationale.fr/dyn/docs/${uidCommission(annee, n)}.raw`;
}
export function urlPageCommission(annee: number, n: number): string {
  const ss = `${String(annee - 1).slice(2)}${String(annee).slice(2)}`;
  return `https://www.assemblee-nationale.fr/dyn/17/comptes-rendus/cion_fin/l17cion_fin${ss}${String(n).padStart(3, "0")}_compte-rendu`;
}

/** Télécharge (ou relit le cache) le HTML brut d'une réunion ; null si la page n'existe pas (404). */
async function chargerRaw(annee: number, n: number): Promise<string | null> {
  mkdirSync(CACHE, { recursive: true });
  const f = join(CACHE, `${uidCommission(annee, n)}.raw`);
  const f404 = f + ".404";
  if (existsSync(f)) return readFileSync(f, "utf8");
  if (existsSync(f404)) return null;
  const r = await fetch(urlRawCommission(annee, n));
  if (r.status === 404) {
    writeFileSync(f404, "");
    return null;
  }
  if (!r.ok) throw new Error(`${urlRawCommission(annee, n)} : HTTP ${r.status}`);
  const html = await r.text();
  // La page d'erreur du site est servie en 200 avec un gabarit sans contenu de réunion.
  if (!html.includes("assnatSection") && !/Compte rendu n°/i.test(html)) {
    writeFileSync(f404, "");
    return null;
  }
  writeFileSync(f, html);
  return html;
}

/** Date de la réunion depuis l'en-tête « Mardi<br>14 octobre 2025 » ; null si introuvable. */
function dateReunion($: cheerio.CheerioAPI, html: string): string | null {
  const brut = $(".assnatCRDATE").first().text() || "";
  const candidats = [brut, $("body").text().slice(0, 6000)];
  for (const c of candidats) {
    const t = sansAccents(c).replace(/\s+/g, " ");
    const m = t.match(/(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})(?:er)?\s+([a-z]+)\s+(20\d\d)/);
    if (m && MOIS[m[2]]) return `${m[3]}-${MOIS[m[2]]}-${m[1].padStart(2, "0")}`;
  }
  void html;
  return null;
}

export type Orateur = { nom: string; qualite: string; sigle: string | null; president: boolean };

/** « M. Philippe Juvin, rapporteur général. » / « Mme Mathilde Feld (LFI-NFP). » / « M. le président Éric Coquerel. » */
export function lireOrateur(gras: string): Orateur | null {
  let t = gras.replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
  const m = t.match(/^(M\.|Mme|M)\s+(.*)$/);
  if (!m) return null;
  t = m[2].trim();
  let president = false;
  let qualite = "";
  const p = t.match(/^(le président|la présidente)\s+(.*)$/i);
  if (p) {
    president = true;
    qualite = "président de la commission";
    t = p[2].trim();
  }
  let sigle: string | null = null;
  const s = t.match(/^(.*?)\s*\(([A-Za-zÀ-ÿ-]+)\)\s*(.*)$/);
  if (s) {
    sigle = s[2].toUpperCase();
    t = (s[1] + (s[3] ? " " + s[3] : "")).trim();
  }
  const q = t.match(/^([^,]+),\s*(.+)$/);
  if (q) {
    t = q[1].trim();
    qualite = qualite ? `${qualite}, ${q[2].trim()}` : q[2].trim();
  }
  if (!t) return null;
  return { nom: t, qualite, sigle, president };
}

export type ResultatCommission = { interventions: Intervention[]; lues: SourceLue[]; scannees: number };

/**
 * Lit les réunions de la commission des finances de la session du projet de loi de finances du dossier.
 * Garde les comptes rendus qui citent ce PLF, puis les paragraphes avec un mot-clé ou situés sous
 * l'intitulé « Article <n> » / « Après l'article <n> » de la mesure.
 */
export async function lireCommission(dossier: DossierConfig, log: (s: string) => void): Promise<ResultatCommission> {
  const re = regexMotsCles(dossier.sujet.mots_cles);
  const annee = anneePLF(dossier.label) ?? anneePLF(dossier.mesure.label);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const limite = dossier.date_reference ?? aujourdHui;
  // Session ordinaire AAAA-1/AAAA = code SAAAA. Sans année de PLF : la session de la date limite.
  const session = annee ?? Number(limite.slice(0, 4)) + (Number(limite.slice(5, 7)) >= 10 ? 1 : 0);
  const marquePLF = annee ? `loi de finances pour ${annee}` : null;
  const article = dossier.mesure.article.trim();
  const interventions: Intervention[] = [];
  const lues: SourceLue[] = [];
  let scannees = 0;
  let absents = 0;
  let tropTard = 0;

  for (let n = 1; n <= 400; n++) {
    const html = await chargerRaw(session, n);
    if (html === null) {
      absents += 1;
      if (absents >= 3) break;
      continue;
    }
    absents = 0;
    // Les <br> de l'en-tête (« Mardi<br>14 octobre 2025 ») deviennent des espaces avant la lecture du texte.
    const $ = cheerio.load(html.replace(/<br\s*\/?>/gi, " "));
    const date = dateReunion($, html);
    if (!date) {
      log(`commission ${uidCommission(session, n)} : date introuvable, ignorée`);
      continue;
    }
    if (date > limite) {
      tropTard += 1;
      if (tropTard >= 8) break;
      continue;
    }
    tropTard = 0;
    const plat = sansAccents($("body").text());
    if (marquePLF && !plat.includes(marquePLF)) continue;
    scannees += 1;
    if (!re.test(plat)) continue;

    const url = urlPageCommission(session, n);
    const label = `Commission des finances, réunion n° ${n} du ${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
    let retenus = 0;
    let orateur: Orateur | null = null;
    let articleCourant = "";
    let contexte = "";
    let ordre = 0;

    $("p").each((_, el) => {
      ordre += 1;
      const $p = $(el);
      const texteComplet = $p.text().replace(/ /g, " ").replace(/\s+/g, " ").trim();
      if (!texteComplet) return;
      const classe = $p.attr("class") ?? "";
      // Intitulés de section (« Article 22 », « Après l'article 22 », « Avant l'article 3 »).
      const titre = sansAccents(texteComplet).match(/^(?:article|apres l'article|avant l'article|article additionnel apres l'article)\s+(\d+[a-z]*)\b/);
      if (titre && texteComplet.length < 200 && (classe.includes("Titre") || /^[A-ZÀ-ÿ]/.test(texteComplet))) {
        articleCourant = titre[1];
        contexte = texteComplet;
        if (!classe.includes("Titre")) {
          // Un paragraphe qui commence par « Article 22 » mais continue avec du texte n'est pas un titre.
          if (texteComplet.length > 60) articleCourant = articleCourant;
        }
        if (texteComplet.length < 80) return;
      }
      // Intitulé d'amendement (« Amendement I-CF1234 de M. X », « Amendements identiques ... ») : contexte des avis qui suivent.
      if (texteComplet.length < 300 && /^Amendements?\s/i.test(texteComplet) && !$p.find("span[style*='font-weight:bold']").length) {
        contexte = texteComplet;
        return;
      }
      if (classe.includes("assnat") && !classe.includes("Normal")) return; // en-têtes, sommaire, présence
      const gras = $p.find("b, strong, span[style*='font-weight:bold']").first();
      let texte = texteComplet;
      if (gras.length) {
        const g = gras.text().replace(/\s+/g, " ").trim();
        const lu = lireOrateur(g);
        if (lu && texteComplet.startsWith(g)) {
          orateur = lu;
          texte = texteComplet.slice(g.length).trim();
        }
      }
      if (!orateur || orateur.president) return;
      if (texte.length < 40) return;
      const motCle = contientMotCle(texte, re);
      const dansArticle = article !== "" && articleCourant === article;
      if (!motCle && !dansArticle) return;
      retenus += 1;
      interventions.push({
        id: `${uidCommission(session, n)}#${ordre}`,
        dossier_id: dossier.id,
        date,
        lieu: "commission",
        url,
        source_label: label,
        orateur_nom: orateur.nom,
        orateur_qualite: orateur.qualite,
        acteur_id: null,
        groupe_sigle: orateur.sigle,
        texte,
        contexte,
        mot_cle: motCle,
      });
    });
    if (retenus > 0) {
      lues.push({ lieu: "commission", uid: uidCommission(session, n), date, url, label, retenus });
      log(`commission n° ${n} ${date} : ${retenus} paragraphes`);
    }
  }
  return { interventions, lues, scannees };
}
