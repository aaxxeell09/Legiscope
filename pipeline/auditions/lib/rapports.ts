// Pages HTML des rapports : téléchargement avec cache, isolement de l'annexe
// « personnes entendues » et découpage en lignes (organisation ou personne).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { RAW_DIR } from "./opendata";

const CACHE_DIR = join(RAW_DIR, "rapports");
const UA = "Mozilla/5.0 (LegiSpot, hackathon Hémicycle)";

/** Contenu brut d'une feuille de rapport (même HTML que la page publique, sans l'habillage du site). */
export async function lireHtml(uid: string): Promise<string | null> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const f = join(CACHE_DIR, `${uid}.html`);
  const absent = join(CACHE_DIR, `${uid}.404`);
  if (existsSync(f)) return readFileSync(f, "utf8");
  if (existsSync(absent)) return null;
  const url = `https://www.assemblee-nationale.fr/dyn/docs/${uid}.raw`;
  for (let essai = 0; essai < 3; essai++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 404) {
      writeFileSync(absent, "");
      return null;
    }
    if (res.ok) {
      const html = await res.text();
      writeFileSync(f, html);
      return html;
    }
    await Bun.sleep(1000 * (essai + 1));
  }
  console.warn(`  ${uid} : page injoignable`);
  return null;
}

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const nettoyer = (s: string) => s.replace(/[   ]/g, " ").replace(/[-]/g, " ").replace(/\s+/g, " ").trim();

// Titres d'annexe qui annoncent une liste de personnes ou d'organismes entendus.
const TITRE_OUI =
  /(PERSONNES?\s+(AUDITIONN|ENTENDU|RENCONTR|CONSULT)|LISTE\s+DES\s+(AUDITIONS|PERSONNES|ORGANISMES|CONTRIBUTIONS|PERSONNALITES)|ORGANISMES?\s+(AUDITIONN|ENTENDU|CONSULT)|CONTRIBUTIONS?\s+ECRITES?|AUDITIONS?\s+(ET\s+DEPLACEMENTS?|DU\s+RAPPORTEUR|DE\s+LA\s+RAPPORTEURE|DES\s+RAPPORTEURS|MENEES|REALISEES|ORGANISEES|CONDUITES)|^(ANNEXE\s*[\w ]*\s*:?\s*)?(AUDITIONS|DEPLACEMENTS?\s+ET\s+AUDITIONS)\b)/i;
// Titres des comptes rendus (« Audition de M. X devant la commission ») : ce ne sont pas des listes.
const TITRE_NON = /(DEVANT\s+LA\s+COMMISSION|^(\d+\.\s*)?AUDITIONS?\s+(DE|DU|D')\s+(M\.|MME|MMES|MM\.|LA\s+MINISTRE|DU\s+MINISTRE|MINISTRE)|COMPTE\s+RENDU)/i;

export function titreAuditions(texte: string): boolean {
  const t = sansAccents(texte).toUpperCase();
  return TITRE_OUI.test(t) && !TITRE_NON.test(t);
}

function estTitre($p: cheerio.Cheerio<any>, texte: string): boolean {
  if ($p.find('a[id^="_Toc"]').length > 0 && texte.length < 250) return true;
  const cls = String($p.attr("class") ?? "");
  if (/PARTIE|TITRE|Titre|CHAPITRE|Chapitre|AN1|AN2|Annexe/.test(cls) && texte.length < 200) return true;
  if (/text-transform:\s*uppercase/.test(String($p.attr("style") ?? "") + $p.find("span").attr("style")) && texte.length < 200) return true;
  const lettres = texte.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (lettres.length >= 12 && lettres.length < 160 && lettres === lettres.toUpperCase()) return true;
  return false;
}

export interface Ligne {
  texte: string; // texte complet nettoyé
  gras: string; // texte des passages en gras (vide si aucun)
  italique: boolean; // paragraphe entièrement en italique
}

export interface SectionAuditions {
  titre: string;
  lignes: Ligne[];
}

/**
 * Isole les sections « personnes entendues » d'une page : chaque section va d'un titre
 * qui en parle jusqu'au titre suivant, aux notes de bas de page ou à la fin.
 */
export function sectionsAuditions(html: string): SectionAuditions[] {
  // On ne charge dans cheerio que la fin du document, à partir du premier titre réel
  // (les entrées de la table des matières renvoient vers « #_Toc », le titre porte l'ancre).
  const idx = premierTitreReel(html);
  if (idx < 0) return [];
  const fin = (() => {
    const m = html.slice(idx).search(/<div id="_ftn1"|<hr style="width:33%/);
    return m < 0 ? html.length : idx + m;
  })();
  const $ = cheerio.load(html.slice(idx, fin));
  const sections: SectionAuditions[] = [];
  let courante: SectionAuditions | null = null;
  $("p, h1, h2, h3, h4, li").each((_, el) => {
    const $p = $(el);
    const texte = nettoyer($p.text());
    if (!texte) return;
    if (estTitre($p, texte)) {
      if (titreAuditions(texte)) {
        courante = { titre: texte, lignes: [] };
        sections.push(courante);
      } else if (courante) {
        courante = null;
      }
      return;
    }
    if (!courante) return;
    const gras = nettoyer(
      $p
        .find("[style*='font-weight:bold'], [style*='font-weight: bold'], b, strong")
        .map((_, b) => $(b).text())
        .get()
        .join(" "),
    );
    const italiqueTexte = nettoyer($p.find("[style*='font-style:italic'], i, em").map((_, b) => $(b).text()).get().join(" "));
    courante.lignes.push({ texte, gras, italique: italiqueTexte.length > 0 && italiqueTexte.length >= texte.length - 2 });
  });
  return sections.filter((s) => s.lignes.length > 0);
}

/** Position du premier paragraphe-titre (ancre `_Toc`) dont le texte annonce une liste d'auditions. */
function premierTitreReel(html: string): number {
  const re = /<p\b[^>]*>([\s\S]{0,3000}?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!/<a id="_Toc/.test(m[1]) && !/text-transform:\s*uppercase/.test(m[1])) continue;
    const texte = nettoyer(m[1].replace(/<[^>]+>/g, " ").replace(/&#xa0;|&nbsp;/g, " "));
    if (texte.length < 250 && titreAuditions(texte)) return m.index;
  }
  return -1;
}

/** Vrai si la page contient une liste de personnes entendues exploitable. */
export function aUneListe(html: string): boolean {
  return sectionsAuditions(html).some((s) => s.lignes.length > 0);
}
