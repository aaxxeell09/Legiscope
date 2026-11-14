// Ce qui relie un dossier à ses votes : amendements du sujet, sens de chaque amendement
// vis-à-vis de la mesure, scrutins liés, positions des groupes et des députés.
import { type AmdtC, type ScrutinC, chargerAmendements, sansAccents } from "./opendata";

export type Dossier = {
  id: string;
  label: string;
  texte_id: string;
  client: string;
  mesure: { label: string; article: string | null; texte_id: string };
  objectifs: { rang: number; texte: string; position_cible: "pour" | "contre" }[];
  date_reference: string | null;
  sujet: { label: string; mots_cles: string[] };
};

export const AUJOURDHUI = new Date().toISOString().slice(0, 10);

/** Date de coupure : on ne retient que ce qui est daté au plus tard date_reference. */
export function coupure(d: Dossier): { ref: string; avant: (date: string | null | undefined) => boolean } {
  if (d.date_reference) {
    const ref = d.date_reference;
    return { ref, avant: (x) => !!x && x.slice(0, 10) <= ref };
  }
  return { ref: AUJOURDHUI, avant: (x) => !!x && x.slice(0, 10) <= AUJOURDHUI };
}

export function moinsJours(date: string, n: number): string {
  const t = new Date(date + "T12:00:00Z").getTime() - n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

function regexMots(mots: string[]): (t: string) => boolean {
  // Sigles (ISF, IFF) : sensibles à la casse ; le reste sans accents ni casse.
  const sigles = mots.filter((m) => m.length <= 4 && m === m.toUpperCase());
  const autres = mots.filter((m) => !sigles.includes(m)).map((m) => sansAccents(m).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const rs = sigles.length ? new RegExp("\\b(" + sigles.join("|") + ")\\b") : null;
  const ra = autres.length ? new RegExp("\\b(" + autres.join("|") + ")\\b") : null;
  return (t: string) => (rs ? rs.test(t) : false) || (ra ? ra.test(sansAccents(t)) : false);
}

/** Textes à parcourir : celui de la mesure, plus le PLF de l'année précédente pour un PLF (la mesure se suit d'un texte à l'autre). */
export function textesDuDossier(d: Dossier): string[] {
  const t = [d.mesure.texte_id];
  if (d.texte_id !== d.mesure.texte_id) t.push(d.texte_id);
  // PLF 2027 (B3210) : le débat sur la même taxe a eu lieu dans le PLF 2026 (B1906).
  if (d.mesure.texte_id === "PRJLANR5L17B3210") t.push("PRJLANR5L17B1906");
  return [...new Set(t)];
}

export const PLF_TITRE: Record<string, string> = {
  PRJLANR5L17B1906: "projet de loi de finances pour 2026",
  PRJLANR5L17B3210: "projet de loi de finances pour 2027",
};

// pertinent = porte sur l'article de la mesure, ou cite le sujet dans son dispositif (pas seulement dans l'exposé).
export type AmdtSujet = AmdtC & { sens: -1 | 0 | 1; sens_raison: string; sur_mesure: boolean; pertinent: boolean };

const RE_SUPPR = /^supprimer cet article/;
const RE_REDUIT = /\b(exclu|exclure|exoner|exempt|limiter|limite|reduire|reduit|abaisser|abaisse|reporter|report|differer|supprim|plafonn|attenu|allege|alleger|neutralis)/;
const RE_RENFORCE = /\b(elargir|elargi|renforcer|renforce|augmenter|augmente|relever|releve|etendre|etendu|inclure|alourdi|durcir)/;
const RE_CREE = /\b(il est (institue|cree|instaure)|est institue|est instauree?|est creee?|instituer|instaurer|creer une (taxe|contribution|imposition)|impot plancher|taxe zucman)/;

/** Sens d'un amendement vis-à-vis de la mesure : +1 la crée ou la renforce, -1 la supprime, la réduit ou la reporte, 0 inconnu. */
function sensAmendement(a: AmdtC, surMesure: boolean): { sens: -1 | 0 | 1; raison: string } {
  const disp = sansAccents(a.dispositif);
  const exp = sansAccents(a.expose);
  if (RE_SUPPR.test(disp)) {
    return surMesure ? { sens: -1, raison: "supprime l'article de la mesure" } : { sens: -1, raison: "supprime un article du sujet" };
  }
  // Montant remplacé : « 2 euros » par « 5 euros » = renforce, l'inverse = réduit.
  const mt = disp.match(/substituer (?:au|le) (?:montant|taux)[^«]*«\s*([\d,]+)\s*(?:euros?|%)?\s*»[^«]*«\s*([\d,]+)/);
  if (mt) {
    const x = Number(mt[1].replace(",", ".")), y = Number(mt[2].replace(",", "."));
    if (y > x) return { sens: 1, raison: `relève le montant (${mt[1]} à ${mt[2]})` };
    if (y < x) return { sens: -1, raison: `abaisse le montant (${mt[1]} à ${mt[2]})` };
  }
  const additionnel = /^(apres|avant|apr\.)/i.test(sansAccents(a.article));
  if (additionnel && RE_CREE.test(disp + " " + exp)) return { sens: 1, raison: "crée une imposition du sujet (article additionnel)" };
  const r = (exp.match(new RegExp(RE_REDUIT.source, "g")) ?? []).length;
  const p = (exp.match(new RegExp(RE_RENFORCE.source, "g")) ?? []).length;
  if (RE_CREE.test(disp + " " + exp) && p >= r) return { sens: 1, raison: "crée ou renforce l'imposition (exposé)" };
  if (r > p) return { sens: -1, raison: "réduit, exonère ou reporte (exposé)" };
  if (p > r) return { sens: 1, raison: "élargit ou renforce (exposé)" };
  return { sens: 0, raison: "sens non déterminé" };
}

/** Part des amendements de l'article déclaré qui citent le sujet ; sous 15 %, l'article ne porte pas la mesure. */
export const COHERENCE_ARTICLE: Record<string, { ratio: number; n: number; coherent: boolean }> = {};

export function amendementsDuSujet(d: Dossier): AmdtSujet[] {
  const test = regexMots(d.sujet.mots_cles);
  let art = d.mesure.article;
  if (art) {
    const surArt = chargerAmendements(d.mesure.texte_id).filter((a) => new RegExp(`^ART\\. ${art}$`).test(a.article));
    const n = surArt.length;
    const ratio = n ? surArt.filter((a) => test(a.dispositif + " " + a.expose)).length / n : 0;
    COHERENCE_ARTICLE[d.id] = { ratio, n, coherent: ratio >= 0.15 };
    if (ratio < 0.15) art = null;
  }
  const res: AmdtSujet[] = [];
  for (const tx of textesDuDossier(d)) {
    for (const a of chargerAmendements(tx)) {
      const surMesure = !!art && tx === d.mesure.texte_id && new RegExp(`^ART\\. ${art}$`).test(a.article);
      if (!surMesure && !test(a.dispositif + " " + a.expose)) continue;
      const pertinent = surMesure || test(a.dispositif);
      const s = pertinent ? sensAmendement(a, surMesure) : { sens: 0 as const, raison: "cite le sujet dans l'exposé seulement" };
      res.push({ ...a, sens: s.sens, sens_raison: s.raison, sur_mesure: surMesure, pertinent });
    }
  }
  return res;
}

function cleArticleTitre(titre: string): string {
  const m = sansAccents(titre).match(/\b(a|apres|avant|de) l'article (liminaire|\d+\s?(?:bis|ter|quater|[a-z])?)\b/);
  if (!m) return "?";
  return `${m[1] === "de" ? "a" : m[1]}:${m[2].replace(/\s/g, "")}`;
}
function cleArticleAmdt(article: string): string {
  const s = sansAccents(article).replace(/\s+/g, " ");
  const m = s.match(/^(apres |avant )?art\. ?(liminaire|\d+\s?(?:bis|ter|quater|[a-z])?)\b/);
  if (!m) return "!";
  return `${m[1] ? m[1].trim() : "a"}:${m[2].replace(/\s/g, "")}`;
}

export type ScrutinLie =ScrutinC & { amendement: AmdtSujet | null; sens: -1 | 0 | 1 };

/** Scrutins liés : vote sur un amendement du sujet (numéro cité dans le titre, même texte). */
export function scrutinsLies(d: Dossier, scrutins: ScrutinC[], amdts: AmdtSujet[], avant: (x: string) => boolean): ScrutinLie[] {
  const parTexte = new Map<string, Map<string, AmdtSujet>>();
  // Mesure rattachée à un article : seuls les amendements sur cet article comptent pour les votes
  // (un mot-clé cité dans un autre article ne dit rien de la position sur la mesure).
  for (const a of amdts) {
    if (!a.pertinent) continue;
    if (!parTexte.has(a.texte)) parTexte.set(a.texte, new Map());
    parTexte.get(a.texte)!.set(a.numero, a);
  }
  const res: ScrutinLie[] = [];
  for (const s of scrutins) {
    if (!avant(s.date)) continue;
    for (const [tx, nums] of parTexte) {
      const t = PLF_TITRE[tx];
      if (!t || !s.titre.includes(t)) continue;
      // Le premier numéro cité est l'objet du vote (un sous-amendement cite aussi l'amendement parent).
      const m = s.titre.match(/(sous-amendement|amendement) n° ?(\d+)/);
      if (!m) continue;
      const sousAmdt = m[1] === "sous-amendement";
      const a = nums.get(m[2]);
      if (!a || sousAmdt) continue;
      // Les numéros se répètent entre première et seconde partie : l'article cité doit concorder.
      if (cleArticleTitre(s.titre) !== cleArticleAmdt(a.article)) continue;
      res.push({ ...s, amendement: a, sens: a.sens });
    }
  }
  return res;
}

export const POSITIONS_VOTE = new Set(["pour", "contre", "abstention"]);

/** Position d'un vote (pour / contre / abstention sur le scrutin) traduite en position sur la mesure. */
export function surMesure(vote: string, sens: number): "pour" | "contre" | "abstention" | null {
  if (!sens) return null;
  if (vote === "abstention") return "abstention";
  if (vote === "pour") return sens > 0 ? "pour" : "contre";
  if (vote === "contre") return sens > 0 ? "contre" : "pour";
  return null;
}

export type PosGroupe = { groupe_id: string; pour: number; contre: number; abstention: number; n: number; position: "pour" | "contre" | "abstention" | "divise" | null; confiance: number };

export function agreger(c: { pour: number; contre: number; abstention: number }): { position: PosGroupe["position"]; confiance: number; n: number } {
  const n = c.pour + c.contre + c.abstention;
  if (n === 0) return { position: null, confiance: 0, n };
  const max = Math.max(c.pour, c.contre, c.abstention);
  const conf = max / n;
  let position: PosGroupe["position"] = "divise";
  if (conf >= 0.6) position = c.pour === max ? "pour" : c.contre === max ? "contre" : "abstention";
  return { position, confiance: Math.round(conf * 100) / 100, n };
}

/** Positions des groupes sur la mesure depuis les scrutins liés (position majoritaire du groupe à chaque scrutin). */
export function positionsDepuisScrutins(lies: ScrutinLie[]): Map<string, PosGroupe> {
  const acc = new Map<string, { pour: number; contre: number; abstention: number; scr: number }>();
  for (const s of lies) {
    if (!s.sens) continue;
    for (const g of s.groupes) {
      const p = g.position ? surMesure(g.position, s.sens) : null;
      if (!p) continue;
      const a = acc.get(g.id) ?? { pour: 0, contre: 0, abstention: 0, scr: 0 };
      a[p]++;
      a.scr++;
      acc.set(g.id, a);
    }
  }
  const res = new Map<string, PosGroupe>();
  for (const [id, a] of acc) {
    const r = agreger(a);
    res.set(id, { groupe_id: id, pour: a.pour, contre: a.contre, abstention: a.abstention, n: a.scr, position: r.position, confiance: r.confiance });
  }
  return res;
}

/** Positions des groupes depuis les amendements déposés (auteur), quand il n'y a pas de scrutin lié. */
export function positionsDepuisAmendements(amdts: AmdtSujet[], avant: (x: string) => boolean): Map<string, PosGroupe> {
  const acc = new Map<string, { pour: number; contre: number; abstention: number }>();
  for (const a of amdts) {
    if (!a.sens || !a.groupe || !avant(a.dateDepot)) continue;
    const c = acc.get(a.groupe) ?? { pour: 0, contre: 0, abstention: 0 };
    if (a.sens > 0) c.pour++;
    else c.contre++;
    acc.set(a.groupe, c);
  }
  const res = new Map<string, PosGroupe>();
  for (const [id, c] of acc) {
    const r = agreger(c);
    res.set(id, { groupe_id: id, ...c, n: r.n, position: r.position, confiance: r.confiance });
  }
  return res;
}

export type CtxDossierPlus = {
  d: Dossier;
  scrutins: ScrutinC[];
  lies: ScrutinLie[];
  amdts: AmdtSujet[];
  positions: Map<string, PosGroupe>;
  sourcePositions: "scrutins" | "amendements" | "aucune";
  groupes: Map<string, { sigle: string; effectif: number }>;
  deputes: Map<string, { nom: string; prenom: string; groupe_id: string | null }>;
  texteRaw: any;
  titreTexte: string;
  etape: string;
  rapporteurs: { pa: string; type: string }[];
  presidentCF: string | null;
  /** Nature de chaque amendement de texte.json (remplie par construireTexte). */
  natures: Map<string, "supprime" | "reduit" | "reporte" | "aggrave" | "autre">;
};
