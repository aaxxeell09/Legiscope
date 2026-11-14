// Bloc 5, compte rendu (PLAN.md 5.12 et 5.21) : data/<dossier>/note.json.
// Entrées : verdict.json, suite.json, action.json, texte.json (jamais un vote brut), groupes.json, deputes.json.
// Usage : bun run note [--source data|contracts/fixtures] [--out data] [--dossier <id>]
// Prompt : pipeline/note/prompts/note.md (X3) s'il existe ; gabarit : prompts/gabarit-note.md ou gabarit intégré.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ZodTypeAny } from "zod";
import {
  ConfigSchema, NoteSchema, SCHEMAS, dataPath,
  type Config, type Etat, type Nouveautes, type Kind, type Note, type Source, type Suite, type Texte, type Verdict,
} from "../../contracts/index";
import { chiffresUtilises, coutCumule, redigerVerifie } from "../lib/llm";
import { verifierChiffres } from "../lib/verif";

type Dossier = Config["dossiers"][number];

const args = process.argv.slice(2);
const opt = (nom: string, defaut: string | null) => {
  const i = args.indexOf(`--${nom}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const SOURCE = opt("source", "data")!;
const OUT = opt("out", "data")!;
const SEUL = opt("dossier", null);
const ICI = dirname(new URL(import.meta.url).pathname);

function lire<T>(fichier: string, kind: Kind, _limites: string[]): T | null {
  if (!existsSync(fichier)) {
    return null; // l'absence est dite en clair par construireFaits
  }
  const res = (SCHEMAS[kind] as ZodTypeAny).safeParse(JSON.parse(readFileSync(fichier, "utf8")));
  if (!res.success) {
    console.warn(`${fichier} invalide, ignoré`);
    return null;
  }
  return res.data as T;
}

/** Nombres présents dans une chaîne reprise d'un fichier source (titre, numéro) : autorisés tels quels. */
function nombresDe(s: string): string[] {
  return [...s.replace(/(\d)[   ](?=\d{3}(?!\d))/g, "$1").matchAll(/(?<![\p{L}\d])\d+(?:[.,]\d+)?(?![\p{L}\d])/gu)].map((m) => m[0].replace(",", "."));
}

/**
 * Décision de 14 h 57 : date_reference = matin de ce jour. Un dépôt, une publication ou une annonce du jour est connu ;
 * un sort, un scrutin, une séance ou une décision du jour ne l'est pas.
 */
const TYPES_DECISION = new Set(["amendement_sort", "scrutin", "seance", "commission"]);
function connuA(ev: { date: string; type: string }, ref: string | null): boolean {
  if (!ref) return true;
  return TYPES_DECISION.has(ev.type) ? ev.date < ref : ev.date <= ref;
}
/** Un événement dont la preuve dit que la date n'est pas publiée (date de repli) n'est jamais cité avec une date. */
function datePasPubliee(ev: { preuve: { raisonnement: string } }): boolean {
  return /date[^.;]{0,30}non publiée|date de repli|daté par repli/i.test(ev.preuve.raisonnement);
}
const dateFr = (iso: string) => {
  const [a, m, j] = iso.split("-").map(Number);
  const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][m - 1];
  return `${j === 1 ? "1er" : j} ${mois} ${a}`;
};
const SITUATION: Record<string, string> = {
  favorable: "en bonne voie", incertaine: "incertain", defavorable: "mal engagé", insuffisant: "impossible à évaluer faute d'information suffisante",
};
const TENDANCE: Record<string, string> = { amelioration: "en amélioration", stable: "stable", degradation: "en dégradation" };
type Faits = { phrases: string[]; prios: number[]; chiffres: string[]; sources: Source[]; limites: string[] };
const min1 = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Les groupes et sièges fournis au pipeline sont ceux de l'Assemblée, jamais une base de positions sénatoriales. */
function lectureCoherente(texte: string): boolean {
  const senatParGroupes = /au Sénat[^.]{0,220}\b(groupes?|sièges?|députés?|Assemblée nationale)\b|\b(groupes?|sièges?|députés?)\b[^.]{0,160}au Sénat/i;
  const texteConfonduAvecMesure = /\b(mesure|taxe|dispositif)\b[^.]{0,80}\b(a été|est|se trouve)?\s*(rejeté|adopté)e?\b/i;
  return !senatParGroupes.test(texte) && !texteConfonduAvecMesure.test(texte);
}

/** Construit les faits du compte rendu, par ordre de priorité, avec leurs chiffres et leurs sources. */
function construireFaits(d: Dossier, v: Verdict | null, s: Suite | null, limites: string[]): Faits {
  const phrases: string[] = [];
  const prios: number[] = [];
  const chiffres: string[] = [];
  const sources: Source[] = [];
  // prio : 1 = indispensable ; le gabarit garde les plus prioritaires sous 150 mots.
  const ajouter = (prio: number, phrase: string, nombres: string[] = [], src?: Source | null) => {
    phrases.push(phrase);
    prios.push(prio);
    chiffres.push(...nombres, ...nombresDe(phrase));
    if (src) sources.push(src);
  };
  const ref = d.date_reference;

  // 1. Verdict de l'objectif principal et pourquoi.
  const vp = v?.verdicts.find((x) => x.objectif_rang === 1);
  if (vp) {
    let ph = `Objectif principal, « ${d.objectifs[0].texte} » : ${SITUATION[vp.situation]}`;
    ph += `, tendance ${TENDANCE[vp.tendance]}.`;
    ajouter(1, ph);
    if (vp.lecture.verifie && lectureCoherente(vp.lecture.texte) && !interditsAbsolus(vp.lecture.texte).length) ajouter(2, vp.lecture.texte, vp.lecture.chiffres_utilises);
    const fav = vp.favorable[0];
    const blq = vp.bloquant[0];
    if (fav) ajouter(6, `Ce qui joue pour le client : ${min1(fav.titre).replace(/\.$/, "")}.`, [], fav.preuve.sources[0]);
    // Un amendement qui coince (ex. compromis du gouvernement) est toujours cité en plus du premier point.
    const blqAmdt = vp.bloquant.find((b, i) => i > 0 && /n° \d/.test(b.titre));
    if (blqAmdt) ajouter(2, `Ce qui coince aussi : ${min1(blqAmdt.titre.replace(/\.$/, ""))}.`, [], blqAmdt.preuve.sources[0]);
    if (blq) ajouter(5, `Ce qui coince : ${min1(blq.titre).replace(/\.$/, "")}.`, [], blq.preuve.sources[0]);
    if (vp.cause_du_changement) {
      const lien = vp.cause_du_changement.preuve.nature === "fait" ? "Évolution documentée" : "Élément associé à l'évolution";
      ajouter(3, `${lien} : ${min1(vp.cause_du_changement.titre).replace(/\.$/, "")}.`, [], vp.cause_du_changement.preuve.sources[0]);
    }
  } else limites.push("verdict pas encore disponible");

  // 2. Prochaines dates.
  if (s) {
    const occ = s.derniere_occasion;
    const proch = s.echeances.find((e) => e.date && (!ref || e.date >= ref) && e.date !== occ?.date);
    if (proch?.date) ajouter(occ?.date && proch.date < occ.date ? 3 : 7, `${occ?.date && proch.date < occ.date ? "Prochaine date" : "Ensuite"} : ${dateFr(proch.date)}, ${min1(proch.titre.replace(/\.$/, ""))}.`, [proch.date], { label: proch.titre, url: proch.url });
    if (occ?.date) ajouter(3, `Dernière occasion d'agir : ${dateFr(occ.date)}, ${min1(occ.titre.replace(/\.$/, ""))}.`, [occ.date], { label: occ.titre, url: occ.url });
    // Échéances sans date (nouvelle lecture, CMP) : dites telles quelles, pour que le modèle n'invente pas l'étape suivante.
    if (occ && !occ.date) ajouter(3, `Dernière occasion d'agir (date non fixée) : ${min1(occ.titre.replace(/\.$/, ""))}.`, [], { label: occ.titre, url: occ.url });
    const sansDate = s.echeances.filter((e) => !e.date && e.titre !== occ?.titre).slice(0, 2);
    if (!proch?.date && sansDate.length) ajouter(4, `Étapes suivantes, dates non fixées : ${sansDate.map((e) => min1(e.titre.replace(/\.$/, ""))).join(" ; ")}.`, [], { label: sansDate[0].titre, url: sansDate[0].url });
  } else limites.push("prochaines dates pas encore disponibles");

  // Ne garde que les chiffres réellement utiles et sans doublon.
  return { phrases, prios, chiffres: [...new Set(chiffres)], sources, limites };
}

/** Formulations interdites (rendu final) ou non fondées sur les faits fournis. Renvoie les extraits fautifs. */
/**
 * Complément 4 (14 h 05) : interdits même s'ils figurent dans un fichier source.
 * « probabilité », « chances », et un pourcentage qui n'est ni « des sièges favorables à l'objectif »
 * ni une moyenne Orcet « de votes pour » (donc jamais un pourcentage seul à côté de favorable ou défavorable).
 */
function interditsAbsolus(texte: string): string[] {
  const fautes: string[] = [];
  for (const re of [/probabilit\S*/i, /\bchances?\b/i]) {
    const m = texte.match(re);
    if (m) fautes.push(m[0]);
  }
  for (const m of texte.matchAll(/\d+(?:[.,]\d+)?\s?%(?!\s(des sièges (sont )?favorables|de votes pour))[^.;]{0,40}/g)) fautes.push(m[0].trim());
  return fautes;
}

function consigneRelance(fautes: string[]): string {
  const manque = fautes.filter((x) => x.startsWith("(manque : ")).map((x) => x.slice(10, -1));
  const interdit = fautes.filter((x) => !x.startsWith("(manque : "));
  return (interdit.length ? `\n\nN'écris surtout pas : ${interdit.map((x) => `« ${x} »`).join(", ")}.` : "") +
    (manque.length ? `\n\nÉcris obligatoirement : ${manque.join(" ; ")}.` : "");
}

function interdits(texte: string, f: Faits): string[] {
  const absolus: RegExp[] = [/influençable/i, /(décision|issue) (finale|définitive)(?! n)/i, /(?<!n'est pas )l'issue finale/i,
    /\b\d{1,2} ?h ?\d{2}\b/, /(rejet|adoption) (probable|improbable|quasi certain)/i, /perspectives? d'adoption/i,
    /rend\S* (leur|son|sa|un|une) (rejet|adoption)/i, /(sera|seront|devrait être) (adopté|rejeté)e?s?/i, /le plus probable à être/i, /dans les faits|faits fournis|faits vérifiés/i,
  ];
  // Conseils : permis seulement s'ils nomment des personnes de la liste fournie (décideurs, députés sur qui agir).
  const conseils: RegExp[] = [
    /(il faut|il convient d['e]|nous recommandons?|il est recommandé) [^.]*/i, /ciblant [^.]*/i,
    /sur qui agir ?:[^.]*/i, /en priorité ceux [^.]*/i, /(cibler|consolider) [^.]*/i,
  ];
  const noms = f.phrases
    .filter((p) => p.startsWith("Députés sur qui agir") || p.startsWith("Ceux qui décident"))
    .flatMap((p) => p.slice(p.indexOf(":") + 1).replace(/\.$/, "").split(","))
    .map((n) => n.replace(/\(.*?\)/g, "").trim())
    .filter((n) => n.length > 3);
  const faits = f.phrases.join(" ").toLowerCase();
  const fautes: string[] = [...interditsAbsolus(texte)];
  if (!lectureCoherente(texte)) fautes.push("confusion entre chambre, texte et mesure");
  for (const re of [/\bOrcet\b/i, /\d+(?:[.,]\d+)?\s?%\s+des sièges/i, /^Limites\s*:/im, /Députés? sur qui agir/i]) {
    const m = texte.match(re);
    if (m) fautes.push(m[0]);
  }
  for (const re of absolus) {
    const m = texte.match(re);
    if (m && !faits.includes(m[0].toLowerCase())) fautes.push(m[0]);
  }
  // Position des décideurs recopiée sans inversion (« X (contre la mesure) » ne devient jamais « X soutient la mesure »).
  const dec = f.phrases.find((p) => p.startsWith("Ceux qui décident"));
  const paires = dec ? [...dec.matchAll(/([^:,]+?) \((pour|contre) la mesure\)/g)].map((m) => ({ nom: m[1].trim(), pos: m[2] })) : [];
  for (const { nom, pos } of paires) {
    for (const phrase of texte.split(/(?<=\.)\s/)) {
      const i = phrase.indexOf(nom);
      if (i < 0) continue;
      let suite = phrase.slice(i + nom.length);
      for (const autre of paires) if (autre.nom !== nom && suite.includes(autre.nom)) suite = suite.slice(0, suite.indexOf(autre.nom));
      const inverse = pos === "contre" ? /soutien\S*|pour la mesure|favorables? à la mesure/i : /contre la mesure|oppos\S*/i;
      const m = suite.match(inverse);
      if (m) fautes.push(`${nom} ${m[0]}`);
    }
  }
  // Mesure et texte sont deux états distincts (complément 6) : « la mesure a été rejetée/adoptée » doit venir d'un fait.
  {
    const m = texte.match(/la mesure a été (rejetée|adoptée)/i);
    if (m && !f.phrases.some((p) => /mesure/i.test(p) && p.toLowerCase().includes(m[1].toLowerCase()))) fautes.push(m[0]);
  }
  for (const re of conseils) {
    const m = texte.match(re);
    if (m && !faits.includes(m[0].toLowerCase()) && !noms.some((n) => m[0].includes(n))) fautes.push(m[0]);
  }
  return fautes;
}

function dedoublonnerSources(src: Source[]): Source[] {
  const vus = new Set<string>();
  return src.filter((x) => (vus.has(x.url + x.label) ? false : (vus.add(x.url + x.label), true)));
}

function sourceClient(source: Source): boolean {
  return !/orcet|prédictions?|hemicycle\.ai\/v1\/orcet/i.test(`${source.label} ${source.url}`);
}

function mots(t: string) {
  return t.split(/\s+/).filter(Boolean).length;
}

/** Gabarit intégré : les faits les plus prioritaires sous 150 mots, rendus dans l'ordre des sections. */
function gabaritIntegre(d: Dossier, f: Faits): string {
  const entete = `Pour ${d.client}.`;
  const ordre = f.phrases.map((_, i) => i).sort((a, b) => f.prios[a] - f.prios[b] || a - b);
  const garde = new Set<number>();
  let n = mots(entete);
  for (const i of ordre) {
    const m = mots(f.phrases[i]);
    if (n + m > 155) continue;
    garde.add(i);
    n += m;
  }
  const retenues = f.phrases.filter((_, i) => garde.has(i));
  const estEtape = (phrase: string) => /^(Prochaine date|Ensuite|Dernière occasion|Étapes suivantes)/.test(phrase);
  const estEvolution = (phrase: string) => /^(Nouveau le|Évolution documentée|Élément associé)/.test(phrase);
  const situation = retenues.filter((p) => !estEvolution(p) && !estEtape(p));
  const evolution = retenues.filter(estEvolution);
  const etapes = retenues.filter(estEtape);
  return [[entete, ...situation].join(" "), evolution.join(" "), etapes.join(" ")].filter(Boolean).join("\n\n");
}

function remplir(modele: string, vars: Record<string, string>): string {
  return modele.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

function promptNote(d: Dossier, f: Faits): { system: string; user: string } {
  const p = promptNoteBrut(d, f);
  p.system +=
    " Le livrable est un brief exécutif en trois paragraphes courts séparés par une ligne vide : situation, faits déterminants, prochaines étapes. " +
    "N'inclus ni score, ni valeur ou mention Orcet, ni liste de députés, ni paragraphe de limites techniques. " +
    "Les positions de groupes de l'Assemblée nationale ne décrivent jamais le Sénat. Le rejet du texte n'est jamais le rejet de la mesure.";
  p.user += "\n\nRends uniquement les trois paragraphes du brief. N'ajoute ni score, ni cible individuelle, ni limites techniques.";
  if (d.date_reference) p.user += `\n\nLa date de situation est le matin du ${dateFr(d.date_reference)} : ce qui est prévu ce jour-là est à venir, écris-le au présent ou au futur, jamais au passé.`;
  return p;
}

function promptNoteBrut(d: Dossier, f: Faits): { system: string; user: string } {
  const vars = {
    client: d.client,
    objectif: d.objectifs[0].texte,
    replis: d.objectifs.slice(1).map((o) => o.texte).join(" ; "),
    mesure: d.mesure.label,
    date_reference: d.date_reference ? dateFr(d.date_reference) : "aujourd'hui",
    faits: f.phrases.map((p) => `- ${p}`).join("\n"),
    chiffres: f.chiffres.join(", "),
    // Les limites restent dans note.limites/meta.limits, jamais dans le brief client.
    limites: "",
  };
  const fichier = join(ICI, "prompts", "note.md");
  if (existsSync(fichier)) {
    const brut = readFileSync(fichier, "utf8");
    const [sys, usr] = brut.split(/^---\s*user\s*---\s*$/m);
    if (usr) return { system: remplir(sys, vars), user: remplir(usr, vars) };
    return { system: remplir(brut, vars), user: `Faits :\n${vars.faits}` };
  }
  return {
    system:
      "Tu rédiges le compte rendu qu'un cabinet d'affaires publiques adapte puis envoie à son client. " +
      "Français, phrases courtes, ton factuel, pas de jargon, pas de titre, pas de liste. 150 mots au plus, jamais davantage. " +
      "Tu décris, tu ne conseilles pas : aucune phrase ne dit au cabinet quoi faire, qui cibler ou sur qui agir, sauf la liste de députés fournie. " +
      "Tu n'utilises que les faits fournis, tu n'inventes rien. Tu n'écris aucun nombre absent de la liste autorisée. " +
      "N'en déduis jamais qu'un amendement ou la mesure sera adopté ou rejeté. Tu n'écris jamais « probabilité » ni « chances ». " +
      "Tu ne donnes aucun conseil et tu ne désignes aucune cible individuelle. " +
      "Pas d'heure, seulement des dates. Un vote en commission n'est pas une adoption ; l'Assemblée n'est pas l'issue finale. Ne mélange jamais rejeté, retiré, tombé et non examiné.",
    user:
      `Client : ${vars.client}. Mesure suivie : ${vars.mesure}. Objectif principal : ${vars.objectif}. Replis : ${vars.replis || "aucun"}. ` +
      `Situation au ${vars.date_reference}.\n\nFaits :\n${vars.faits}\n\n` +
      "Rédige le compte rendu dans cet ordre : situation et pourquoi, faits déterminants, prochaines étapes. Sépare ces trois parties par une ligne vide.",
  };
}

type Entrees = { v: Verdict | null; s: Suite | null; n: Nouveautes | null; e: Etat | null };

/**
 * Gabarit de X3 (prompts/gabarit-note.md) : blocs ```gabarit id=...```, variables {{x}}, ordre et conditions
 * de la section « Blocs ». Renvoie null si le fichier manque, si un bloc manque ou si une variable reste vide.
 */
function gabaritX3(d: Dossier, x: Entrees, _limites: string): string | null {
  const fichier = join(ICI, "prompts", "gabarit-note.md");
  if (!existsSync(fichier) || !x.v) return null;
  const blocs: Record<string, string> = {};
  for (const m of readFileSync(fichier, "utf8").matchAll(/```gabarit id=([\w.]+)\n([\s\S]*?)```/g)) blocs[m[1]] = m[2].trim();
  const sansPoint = (t: string) => t.trim().replace(/\.$/, "");
  const avecPoint = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : t.trim() + ".");
  const df = (iso: string | null | undefined) => (iso ? dateFr(iso) : "date non fixée");
  const SIT: Record<string, string> = { favorable: "favorable", incertaine: "incertaine", defavorable: "défavorable", insuffisant: "indécidable (pas assez d'information)" };
  const NIV: Record<string, string> = { elevee: "élevée", moyenne: "moyenne", faible: "faible" };
  const EFF: Record<string, string> = { renforce: "favorable au client", affaiblit: "défavorable au client", neutre: "sans effet sur le verdict" };
  const v1 = x.v.verdicts.find((y) => y.objectif_rang === 1)!;
  if (!lectureCoherente(v1.lecture.texte)) return null;
  const ref = d.date_reference;
  const evs = (x.n?.evenements ?? []).filter((ev) => connuA(ev, ref) && !datePasPubliee(ev));
  const vars: Record<string, string> = {
    client: d.client,
    mesure_label: sansPoint(d.mesure.label),
    etape: x.e ? sansPoint(x.e.etape) : "",
    objectif_1: sansPoint(d.objectifs[0].texte),
    situation_mot: SIT[v1.situation],
    tendance_mot: TENDANCE[v1.tendance],
    niveau_mot: NIV[v1.confiance.niveau],
    lecture_1: avecPoint(v1.lecture.texte),
  };
  evs.slice(0, 2).forEach((ev, i) => {
    vars[`ev_${i + 1}`] = sansPoint(ev.titre);
    vars[`ev_${i + 1}_date`] = df(ev.date);
    vars[`ev_${i + 1}_effet`] = EFF[ev.effet];
  });
  if (x.s?.echeances[0]) {
    vars.echeance_1 = sansPoint(x.s.echeances[0].titre);
    vars.echeance_1_date = df(x.s.echeances[0].date);
  }
  if (x.s?.derniere_occasion) {
    vars.derniere_occasion = sansPoint(x.s.derniere_occasion.titre);
    vars.derniere_occasion_date = df(x.s.derniere_occasion.date);
  }
  const morceaux: string[] = [];
  const bloc = (id: string, extra: Record<string, string> = {}) => {
    const b = blocs[id];
    if (!b) throw new Error(`bloc ${id} absent`);
    const t = b.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
      const val = extra[k] ?? vars[k];
      if (val === undefined || val === "") throw new Error(`variable ${k} vide`);
      return val;
    });
    morceaux.push(t);
  };
  try {
    bloc("note.entete");
    bloc("note.verdict.sans_score");
    for (const vr of [...x.v.verdicts].filter((y) => y.objectif_rang > 1).sort((a, b) => a.objectif_rang - b.objectif_rang)) {
      const o = d.objectifs.find((y) => y.rang === vr.objectif_rang);
      if (o) bloc("note.repli", { objectif_n: sansPoint(o.texte), situation_mot: SIT[vr.situation] });
    }
    bloc(evs.length >= 2 ? "note.bouge.deux" : evs.length === 1 ? "note.bouge.un" : "note.bouge.rien");
    const e0 = x.s?.echeances[0];
    const occ = x.s?.derniere_occasion;
    if (e0 && !(occ && occ.date && occ.date === e0.date)) bloc("note.dates.echeance");
    if (occ) bloc("note.dates.derniere");
  } catch (err) {
    console.warn(`${d.id} : gabarit de X3 inutilisable (${String(err)}), gabarit intégré`);
    return null;
  }
  return morceaux.join("\n\n");
}

async function traiter(d: Dossier, cfg: Config): Promise<{ id: string; mode: string; fautifs: string[]; verifie: boolean; mots: number }> {
  const limites: string[] = [];
  const p = (k: Kind) => dataPath(d.id, k, undefined, SOURCE);
  const v = lire<Verdict>(p("verdict"), "verdict", limites);
  const s = lire<Suite>(p("suite"), "suite", limites);
  const t = lire<Texte>(p("texte"), "texte", limites);
  const n = lire<Nouveautes>(p("nouveautes"), "nouveautes", limites);
  const e = lire<Etat>(p("etat"), "etat", limites);
  const f = construireFaits(d, v, s, limites);
  // Ce qui a bougé (nouveautes.json, déjà trié par importance) : les deux premiers événements datés au plus tard à la référence.
  const EFFET: Record<string, string> = { renforce: "favorable au client", affaiblit: "défavorable au client", neutre: "sans effet sur le verdict" };
  for (const ev of (n?.evenements ?? []).filter((x) => connuA(x, d.date_reference) && !datePasPubliee(x)).slice(0, 2)) {
    const ph = `Nouveau le ${dateFr(ev.date)} : ${min1(ev.titre.replace(/\.$/, ""))} (${EFFET[ev.effet]}).`;
    f.phrases.push(ph);
    f.prios.push(3);
    f.chiffres.push(ev.date, ...nombresDe(ph).filter((c) => !f.chiffres.includes(c)));
    f.sources.push({ label: ev.titre, url: ev.url });
  }
  if (d.date_reference) f.limites.unshift(`Rejoué à la date de référence du ${dateFr(d.date_reference)}`);
  const autorises: string[] = [...new Set([...f.chiffres, ...(d.date_reference ? [d.date_reference] : [])])];

  const limitesTexte = f.limites.length ? f.limites.join(" ; ") + "." : "";
  // Gabarit : celui de X3 s'il s'applique, sinon le gabarit intégré. Ses nombres viennent des fichiers sources.
  const gx3 = gabaritX3(d, { v, s, n, e }, limitesTexte);
  // Le brief reprend la situation du verdict, sans imposer son score ni ses détails de calcul.
  const v0 = v?.verdicts.find((y) => y.objectif_rang === 1) ?? null;
  const MOTS: Record<string, string[]> = { favorable: ["favorable", "bonne voie"], incertaine: ["incertain"], defavorable: ["défavorable", "mal engagé"], insuffisant: ["pas assez d'information", "insuffisant", "indécidable"] };
  const manquants = (texte: string): string[] => {
    const t = texte.toLowerCase();
    const out: string[] = [];
    if (v0 && !(MOTS[v0.situation] ?? []).some((m) => t.includes(m))) out.push(`situation (${MOTS[v0.situation]?.[0]})`);
    // La tendance écrite est celle de verdict.json (« s'est dégradée » interdit si la tendance est stable).
    if (v0 && v0.tendance !== "degradation" && /(s'est|se sont|a) (dégradée?s?|détérioré)|se dégrade|en dégradation/i.test(texte)) out.push(`tendance ${TENDANCE[v0.tendance]}, pas de dégradation`);
    if (v0 && v0.tendance !== "amelioration" && /(s'est|se sont|a) (améliorée?s?)|s'améliore|en amélioration/i.test(texte)) out.push(`tendance ${TENDANCE[v0.tendance]}, pas d'amélioration`);
    return out;
  };
  let texteGabarit = gx3 ?? gabaritIntegre(d, f);
  if (gx3) autorises.push(...nombresDe(gx3).filter((c) => !autorises.includes(c)), ...[s?.derniere_occasion?.date, s?.echeances[0]?.date, ...(n?.evenements ?? []).slice(0, 2).map((ev) => ev.date)].filter((c): c is string => !!c));
  // Garde-fous du rendu final, contrôlés après le vérificateur de chiffres : 2 relances au plus, sinon gabarit.
  const prompt = promptNote(d, f);
  let r = await redigerVerifie(prompt, autorises, texteGabarit);
  for (let relance = 0; r.mode === "llm" && relance < 2; relance++) {
    const fautes = [...interdits(r.texte, f), ...manquants(r.texte).map((m) => `(manque : ${m})`)];
    if (!fautes.length) break;
    console.warn(`${d.id} : garde-fou (${fautes.join(" | ")}), relance`);
    r = await redigerVerifie({ system: prompt.system, user: prompt.user + consigneRelance(fautes) }, autorises, texteGabarit);
    if (relance === 1 && r.mode === "llm" && (interdits(r.texte, f).length || manquants(r.texte).length)) {
      r = { texte: texteGabarit, mode: "gabarit", chiffres_utilises: chiffresUtilises(texteGabarit, autorises), fautifs: [], modele: null, verifie: verifierChiffres(texteGabarit, autorises).ok, tentatives: r.tentatives };
    }
  }
  const metaSources = dedoublonnerSources([...(v?.meta.sources ?? []), ...(t?.meta.sources ?? [])]).filter(sourceClient);
  const sources = dedoublonnerSources(f.sources).filter(sourceClient).slice(0, 8);
  const limitesNote = limitesTexte || "Aucune limite signalée par les fichiers sources.";
  const note: Note = {
    meta: {
      generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      sources: metaSources.length ? metaSources : sources,
      limits: limitesNote,
      producer: "pipeline/note",
      dossier_id: d.id,
    },
    client: d.client,
    objectifs: d.objectifs,
    texte: r.texte,
    chiffres_utilises: r.chiffres_utilises,
    sources,
    limites: limitesNote,
    mode: r.mode,
    modele: r.modele,
    verifie: r.verifie,
  };
  const res = NoteSchema.safeParse(note);
  if (!res.success) throw new Error(`${d.id} : note invalide ${JSON.stringify(res.error.issues)}`);
  const sortie = dataPath(d.id, "note", undefined, OUT);
  mkdirSync(dirname(sortie), { recursive: true });
  writeFileSync(sortie, JSON.stringify(res.data, null, 2) + "\n");
  void cfg;
  return { id: d.id, mode: r.mode, fautifs: r.fautifs, verifie: r.verifie, mots: mots(r.texte) };
}

const cfgFichier = existsSync(join(SOURCE, "config.json")) ? join(SOURCE, "config.json") : "data/config.json";
const cfg = ConfigSchema.parse(JSON.parse(readFileSync(cfgFichier, "utf8")));
const dossiers = cfg.dossiers.filter((d) => !SEUL || d.id === SEUL);
const bilans = await Promise.all(dossiers.map((d) => traiter(d, cfg)));
for (const b of bilans) {
  console.log(`${b.id} : mode ${b.mode}, vérifié ${b.verifie}, ${b.mots} mots${b.fautifs.length ? `, jetons fautifs ${b.fautifs.join(" ")}` : ""}`);
}
console.log("Coût Featherless :", JSON.stringify(coutCumule()));
