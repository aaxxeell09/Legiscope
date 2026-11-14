// Règles déterministes : texte sans HTML, filtre « sujet », sort unifié, résumé en une ligne,
// mention « travaillé avec » extraite telle quelle de l'exposé des motifs. Aucun modèle de langage.

import * as cheerio from "cheerio";
import type { Sort } from "../../../contracts/index";
import type { AmendementBrut } from "./opendata";

/** HTML → texte brut, entités décodées, espaces normalisés. */
export function texteBrut(html: string): string {
  if (!html) return "";
  const t = cheerio.load(`<div>${html}</div>`)("div").text();
  return t.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

/** Minuscules sans accents, pour comparer des mots-clés. */
export function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Expression régulière des mots-clés du sujet (mots entiers, sans accents, pluriel toléré). Drapeau g : on compte les occurrences. */
export function regexSujet(motsCles: string[]): RegExp {
  const alts = motsCles.map((m) => echapper(sansAccents(m).trim()).replace(/\s+/g, "\\s+") + "s?");
  return new RegExp(`(^|[^a-z0-9])(${alts.join("|")})(?=$|[^a-z0-9])`, "gi");
}

/**
 * L'amendement porte-t-il sur le sujet ? Oui s'il vise l'article de la mesure, ou si un mot-clé
 * apparaît dans le dispositif, ou si un mot-clé de plusieurs mots apparaît dans l'exposé, ou si un
 * mot-clé d'un seul mot (« colis », « holding ») apparaît au moins deux fois dans l'exposé : une
 * mention isolée d'un mot courant (« relais colis », « colis postaux ») ne fait pas un amendement du sujet.
 */
export function estDuSujet(a: AmendementBrut, re: RegExp, article: string | null): { oui: boolean; par: "mots_cles" | "article" | null } {
  if (article && a.article === article && !a.article_additionnel) return { oui: true, par: "article" };
  const dispositif = sansAccents(texteBrut(a.dispositif));
  const expose = sansAccents(texteBrut(a.expose));
  re.lastIndex = 0;
  if (re.test(dispositif)) return { oui: true, par: "mots_cles" };
  const occurrences = [...expose.matchAll(re)].map((m) => m[2]);
  if (occurrences.some((m) => /\s/.test(m))) return { oui: true, par: "mots_cles" };
  if (occurrences.length >= 2) return { oui: true, par: "mots_cles" };
  return { oui: false, par: null };
}

/**
 * Sort unifié (enum de la section 5). Les libellés exacts de l'Assemblée sont gardés à part
 * (`sort_libelle`) parce que l'enum ne distingue pas « non soutenu » d'« irrecevable ».
 * Un sort daté après `dateReference` redevient `en_attente` (rejeu à une date).
 */
export function sortUnifie(a: AmendementBrut, dateReference: string | null): { sort: Sort; libelle: string; en_attente_par_rejeu: boolean } {
  const etat = a.etat ?? "";
  const sous = a.sous_etat ?? "";
  const brut = a.sort_brut ?? "";
  let sort: Sort;
  let libelle: string;
  if (brut === "Adopté") [sort, libelle] = ["adopte", "Adopté"];
  else if (brut === "Rejeté") [sort, libelle] = ["rejete", "Rejeté"];
  else if (brut === "Retiré" || etat === "Retiré") [sort, libelle] = ["retire", sous && etat === "Retiré" ? sous : "Retiré"];
  else if (brut === "Tombé") [sort, libelle] = ["tombe", "Tombé"];
  else if (brut === "Non soutenu") [sort, libelle] = ["non_examine", "Non soutenu"];
  else if (etat.startsWith("Irrecevable")) [sort, libelle] = ["non_examine", `${etat}${sous ? " (" + sous + ")" : ""}`];
  else if (etat === "En traitement" || etat === "A discuter" || etat === "Discuté") [sort, libelle] = ["en_attente", etat];
  else [sort, libelle] = ["en_attente", etat || brut || "inconnu"];
  // Rejeu : date_reference est lue comme le matin de ce jour (décision du 14 novembre, 14 h 57).
  // Un sort daté de ce jour-là ou après n'est pas encore connu : en_attente, sans révéler le sort réel.
  // Même règle (P0, 15 h 50) quand aucune date de sort n'est publiée mais que le dépôt date de ce jour-là ou après.
  const sortDuJourOuApres = a.date_sort ? a.date_sort >= dateReference! : !!(a.date_depot && a.date_depot >= dateReference!);
  if (dateReference && sortDuJourOuApres && sort !== "en_attente") {
    return { sort: "en_attente", libelle: `En attente au matin du ${dateReference}`, en_attente_par_rejeu: true };
  }
  return { sort, libelle, en_attente_par_rejeu: false };
}

function couper(s: string, max: number): string {
  if (s.length <= max) return s;
  const c = s.slice(0, max);
  const i = c.lastIndexOf(" ");
  return (i > max * 0.6 ? c.slice(0, i) : c).replace(/[\s,;:]+$/, "") + "…";
}

/** Résumé en une ligne, par règles : suppression reconnue, sinon les 160 premiers caractères du dispositif. */
export function resumer(a: AmendementBrut): string {
  const d = texteBrut(a.dispositif);
  const ou = a.article_designation
    ? a.article_additionnel
      ? a.article_designation.replace(/^APRÈS ART\.\s*/i, "Après l'article ").replace(/^AVANT ART\.\s*/i, "Avant l'article ")
      : a.article_designation.replace(/^ART\.\s*/i, "Article ")
    : null;
  if (/^supprimer cet article\.?$/i.test(d)) return ou ? `Supprime l'${ou.toLowerCase()}.` : "Supprime l'article.";
  // Amendements de crédits (état B) : le dispositif est un tableau sans texte ; on prend le début de l'exposé.
  const base = d || texteBrut(a.expose);
  if (!base) return ou ? `${ou} : dispositif non publié.` : "Dispositif non publié.";
  const corps = couper(base, 160);
  return ou ? `${ou} : ${corps}` : corps;
}

// « Travaillé avec » : formules repérées dans l'exposé des motifs, nom extrait tel quel.
const FORMULES = new RegExp(
  "(?:" +
    [
      "travaill[ée]e?s?\\s+(?:en\\s+(?:lien|collaboration|concertation|partenariat|[ée]troite\\s+collaboration)\\s+)?(?:conjointement\\s+)?avec",
      "[ée]labor[ée]e?s?\\s+(?:en\\s+(?:lien|collaboration|concertation|partenariat)\\s+)?avec",
      "r[ée]dig[ée]e?s?\\s+(?:en\\s+(?:lien|collaboration|concertation)\\s+)?avec",
      "propos[ée]e?s?\\s+par",
      "sugg[ée]r[ée]e?s?\\s+par",
      "en\\s+lien\\s+avec",
      "issus?\\s+des\\s+travaux\\s+(?:de\\s+la|de\\s+l['’]|du|des|de)",
    ].join("|") +
    ")\\s+(.{3,120})",
  "gi",
);

const ARTICLES = /^(?:le\s+concours\s+de\s+|l['’]appui\s+de\s+|le\s+soutien\s+de\s+|les\s+[ée]quipes\s+de\s+)?(?:le\s+|la\s+|les\s+|l['’]\s?|un\s+|une\s+|des\s+|du\s+|de\s+la\s+|de\s+l['’]\s?)?/i;
const NOMS_ORGANISATION =
  /^(association|f[ée]d[ée]ration|syndicat|collectif|r[ée]seau|union|conf[ée]d[ée]ration|conseil|chambre|ordre|fondation|institut|coordination|mouvement|soci[ée]t[ée]|groupement|comit[ée]|observatoire|cabinet|entreprise|plateforme|think\s+tank|ong|alliance|ligue|club|centre|agence|interprofession|coop[ée]rative|mutuelle|organisation|office|caisse|maison|fonds|cercle|forum|coll[èe]ge|acad[ée]mie|ligue|assembl[ée]e\s+des|association)\b/i;
const EXCLUS =
  /^(cet|ce|cette|ces|le\s+pr[ée]sent|la\s+pr[ée]sente|l['’]amendement|les\s+amendements|le\s+projet|la\s+proposition|le\s+texte|l['’]article|les\s+articles|le\s+gouvernement|gouvernement|le\s+rapporteur|la\s+rapporteure|les\s+rapporteurs|le\s+rapporteur\s+g[ée]n[ée]ral|la\s+commission|les\s+commissions|le\s+s[ée]nat|les\s+s[ée]nateurs|les\s+d[ée]put[ée]s|le\s+d[ée]put[ée]|la\s+d[ée]put[ée]e|le\s+groupe|les\s+groupes|nos|notre|leur|leurs|son|sa|ses|mon|ma|mes|l['’]auteur|les\s+auteurs|les\s+signataires|la\s+loi|le\s+d[ée]cret|l['’]ordonnance|la\s+directive|le\s+r[èe]glement|le\s+code|la\s+mission|une\s+mission|le\s+conseil\s+constitutionnel|la\s+cour|le\s+minist[èe]re|le\s+ministre|la\s+ministre|les\s+ministres|le\s+pr[ée]sident|la\s+pr[ée]sidente|le\s+premier\s+ministre|la\s+france|l['’][ée]tat|l['’]union\s+europ[ée]enne|la\s+commission\s+europ[ée]enne|les\s+collectivit[ée]s|les\s+communes|les\s+d[ée]partements|les\s+r[ée]gions|les\s+acteurs|les\s+professionnels|les\s+entreprises|les\s+organisations|les\s+repr[ée]sentants|les\s+partenaires|les\s+parties|les\s+associations|les\s+syndicats|les\s+f[ée]d[ée]rations|des\s+acteurs|des\s+professionnels|des\s+associations|des\s+organisations|des\s+repr[ée]sentants|des\s+[ée]lus|plusieurs|de\s+nombreux|de\s+nombreuses|l['’]ensemble|un\s+certain\s+nombre|le\s+secteur|la\s+fili[èe]re|les\s+fili[èe]res|la\s+profession|le\s+monde|l['’]objectif|la\s+mesure|les\s+mesures|le\s+dispositif|la\s+r[ée]forme|le\s+budget|la\s+taxe|l['’]imp[ôo]t|le\s+taux|le\s+montant|les\s+travaux|le\s+rapport|les\s+recommandations|les\s+conclusions|la\s+r[ée]daction|le\s+texte|l['’]exp[ée]rimentation|les\s+[ée]changes|nos\s+[ée]changes|l['’]article\s+40)\b/i;

/**
 * Organisations citées dans l'exposé des motifs après une formule « travaillé avec », « proposé par »,
 * « en lien avec », « issu des travaux de ». Le nom est pris tel quel jusqu'à la ponctuation ; les
 * sujets qui ne sont pas des organisations extérieures (gouvernement, rapporteur, commission, « cet
 * amendement »...) sont écartés. Rien trouvé = tableau vide. Aucune inférence.
 */
export function travailleAvec(exposeHtml: string): string[] {
  const t = texteBrut(exposeHtml);
  const out: string[] = [];
  for (const m of t.matchAll(FORMULES)) {
    let s = m[1];
    // Coupe à la ponctuation ou à une proposition subordonnée.
    s = s.split(/[.;:()«»"”“]|\s[–—-]\s|\s(?:qui|dont|afin|pour|dans|lors|vise|propose|permet|et\s+vise|et\s+propose|et\s+qui|fait\s+suite|a\s+pour|ainsi\s+que|et\s+les\s+membres|et\s+notamment|notamment)\s/i)[0];
    s = s.replace(/,.*$/, "").trim().replace(/[\s,;:]+$/, "");
    const sansArticle = s.replace(ARTICLES, "").trim();
    if (!sansArticle || sansArticle.length < 2 || sansArticle.length > 90) continue;
    if (EXCLUS.test(s) || EXCLUS.test(sansArticle)) continue;
    const premier = sansArticle[0];
    const majuscule = premier !== premier.toLowerCase();
    if (!majuscule && !NOMS_ORGANISATION.test(sansArticle)) continue;
    if (!out.includes(s)) out.push(s);
  }
  return out;
}
