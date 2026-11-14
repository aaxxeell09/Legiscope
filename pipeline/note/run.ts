// Bloc 5, compte rendu (PLAN.md 5.12 et 5.21) : data/<dossier>/note.json.
// Entrées : verdict.json, suite.json, action.json, texte.json (jamais un vote brut), groupes.json, deputes.json.
// Usage : bun run note [--source data|contracts/fixtures] [--out data] [--dossier <id>]
// Prompt : pipeline/note/prompts/note.md (X3) s'il existe ; gabarit : prompts/gabarit-note.md ou gabarit intégré.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ZodTypeAny } from "zod";
import {
  ConfigSchema, NoteSchema, SCHEMAS, dataPath,
  type Action, type Config, type Deputes, type Etat, type Nouveautes, type Groupes, type Kind, type Note, type Source, type Suite, type Texte, type Verdict,
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

function lire<T>(fichier: string, kind: Kind, limites: string[]): T | null {
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

const resumeCourt = (r: string) => {
  const m = r.replace(/^(cet amendement|l.amendement) (vise à|propose de|a pour objet de)\s*/i, "").replace(/\.$/, "").split(/\s+/);
  return min1(m.slice(0, 12).join(" ") + (m.length > 12 ? "…" : ""));
};
/**
 * Décision de 14 h 57 : date_reference = matin de ce jour. Un dépôt, une publication ou une annonce du jour est connu ;
 * un sort, un scrutin, une séance ou une décision du jour ne l'est pas.
 */
const TYPES_DECISION = new Set(["amendement_sort", "scrutin", "seance", "commission"]);
function connuA(ev: { date: string; type: string }, ref: string | null): boolean {
  if (!ref) return true;
  return TYPES_DECISION.has(ev.type) ? ev.date < ref : ev.date <= ref;
}
const pct = (p: number) => `${Math.round(p * 100)} %`;
const dateFr = (iso: string) => {
  const [a, m, j] = iso.split("-").map(Number);
  const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][m - 1];
  return `${j === 1 ? "1er" : j} ${mois} ${a}`;
};
const SITUATION: Record<string, string> = {
  favorable: "en bonne voie", incertaine: "incertain", defavorable: "mal engagé", insuffisant: "impossible à évaluer faute d'information suffisante",
};
const TENDANCE: Record<string, string> = { amelioration: "en amélioration", stable: "stable", degradation: "en dégradation" };
const ROLE: Record<string, string> = {
  rapporteur: "le rapporteur", rapporteur_general: "le rapporteur général", rapporteur_avis: "le rapporteur pour avis",
  gouvernement: "le gouvernement", chef_de_file: "le chef de file", president_commission: "le président de commission",
};
const SORT: Record<string, string> = { adopte: "adopté", rejete: "rejeté", retire: "retiré", tombe: "tombé", non_examine: "non examiné" };

type Faits = { phrases: string[]; prios: number[]; chiffres: string[]; sources: Source[]; limites: string[] };
const min1 = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Construit les faits du compte rendu, par ordre de priorité, avec leurs chiffres et leurs sources. */
function construireFaits(d: Dossier, v: Verdict | null, s: Suite | null, a: Action | null, t: Texte | null, groupes: Groupes | null, deputes: Deputes | null, limites: string[]): Faits {
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
  const sigle = (id: string | null) => (id && groupes?.groupes.find((g) => g.id === id)?.sigle) || null;
  const nom = (pa: string) => {
    const x = deputes?.deputes.find((p) => p.id === pa);
    return x ? `${x.prenom} ${x.nom}` : null;
  };
  const ref = d.date_reference;

  // 1. Verdict de l'objectif principal et pourquoi.
  const vp = v?.verdicts.find((x) => x.objectif_rang === 1);
  if (vp) {
    let ph = `Objectif principal, « ${d.objectifs[0].texte} » : ${SITUATION[vp.situation]}`;
    // Complément 4 : le score est un rapport de forces, jamais un pourcentage seul.
    if (vp.score !== null) ph += `, ${pct(vp.score)} des sièges favorables à l'objectif`;
    ph += `, tendance ${TENDANCE[vp.tendance]}.`;
    ajouter(1, ph, vp.score !== null ? [String(vp.score)] : []);
    if (vp.lecture.verifie && !interditsAbsolus(vp.lecture.texte).length) ajouter(2, vp.lecture.texte, vp.lecture.chiffres_utilises);
    const fav = vp.favorable[0];
    const blq = vp.bloquant[0];
    if (fav) ajouter(6, `Ce qui joue pour le client : ${min1(fav.titre).replace(/\.$/, "")}.`, [], fav.preuve.sources[0]);
    if (blq) ajouter(5, `Ce qui coince : ${min1(blq.titre).replace(/\.$/, "")}.`, [], blq.preuve.sources[0]);
    if (vp.cause_du_changement) ajouter(3, `Ce qui a fait bouger le verdict : ${min1(vp.cause_du_changement.titre).replace(/\.$/, "")}.`, [], vp.cause_du_changement.preuve.sources[0]);
  } else limites.push("verdict pas encore disponible");

  // 2. Amendements avec prédiction (ceux sans prédiction sont exclus des comptes).
  if (t) {
    const avecPred = t.amendements.filter((x) => x.prediction && (!ref || x.prediction.date <= ref));
    const exclus = t.amendements.length - avecPred.length;
    if (avecPred.length) {
      const parSort: Record<string, number> = {};
      for (const x of avecPred) {
        // Rien de postérieur à la date de référence : le sort est lu tel que P3 l'a filtré.
        parSort[x.sort] = (parSort[x.sort] ?? 0) + 1;
      }
      const attente = parSort.en_attente ?? 0;
      const tranches = Object.entries(parSort).filter(([k]) => k !== "en_attente").map(([k, n]) => `${n} ${SORT[k]}${n > 1 ? "s" : ""}`);
      ajouter(
        5,
        `Sur ${avecPred.length} amendements du sujet dotés d'une prédiction, ${attente === 0 ? "aucun n'est" : `${attente} ${attente > 1 ? "sont" : "est"}`} en attente${tranches.length ? ` ; ${tranches.join(", ")}` : ""}.`,
        [String(avecPred.length), ...(attente ? [String(attente)] : []), ...Object.values(parSort).filter((n) => n !== 0).map(String)],
      );
      const enAttente = avecPred.filter((x) => x.sort === "en_attente").sort((x, y) => y.prediction!.confiance - x.prediction!.confiance).slice(0, 2);
      for (const x of enAttente) {
        const g = sigle(x.groupe_id);
        ajouter(
          7,
          `Amendement n° ${x.numero}${g ? ` (${g})` : ""}, ${resumeCourt(x.resume)} : Orcet prédit en moyenne ${pct(x.prediction!.proba_pour)} de votes pour.`,
          [x.numero, String(x.prediction!.proba_pour)],
          { label: `Amendement n° ${x.numero}`, url: x.url },
        );
      }
    }
    if (exclus > 0) limites.push(`amendements sans prédiction Orcet exclus des comptes`);
  } else limites.push("amendements pas encore disponibles");

  // 3. Prochaines dates.
  if (s) {
    const occ = s.derniere_occasion;
    const proch = s.echeances.find((e) => e.date && (!ref || e.date >= ref) && e.date !== occ?.date);
    if (proch?.date) ajouter(occ?.date && proch.date < occ.date ? 3 : 7, `${occ?.date && proch.date < occ.date ? "Prochaine date" : "Ensuite"} : ${dateFr(proch.date)}, ${min1(proch.titre.replace(/\.$/, ""))}.`, [proch.date], { label: proch.titre, url: proch.url });
    if (occ?.date) ajouter(3, `Dernière occasion d'agir : ${dateFr(occ.date)}, ${min1(occ.titre.replace(/\.$/, ""))}.`, [occ.date], { label: occ.titre, url: occ.url });
    // Échéances sans date (nouvelle lecture, CMP) : dites telles quelles, pour que le modèle n'invente pas l'étape suivante.
    if (occ && !occ.date) ajouter(3, `Dernière occasion d'agir (date non fixée) : ${min1(occ.titre.replace(/\.$/, ""))}.`, [], { label: occ.titre, url: occ.url });
    const sansDate = s.echeances.filter((e) => !e.date && e.titre !== occ?.titre).slice(0, 2);
    if (!proch?.date && sansDate.length) ajouter(4, `Étapes suivantes, dates non fixées : ${sansDate.map((e) => min1(e.titre.replace(/\.$/, ""))).join(" ; ")}.`, [], { label: sansDate[0].titre, url: sansDate[0].url });
    // Une prédiction Orcet sur un amendement n'est jamais une issue : ces probables sont écartés (garde-fou).
    const prob = s.probables.find((p) => p.proba !== null && !/amendement|n° \d/i.test(p.titre));
    if (prob) ajouter(8, `Issue la plus probable selon l'outil : ${min1(prob.titre.replace(/\.$/, ""))}.`);
  } else limites.push("prochaines dates pas encore disponibles");

  // 4. Sur qui agir.
  if (a) {
    const dec = a.decideurs.filter((x) => x.position !== "inconnue").slice(0, 2)
      .map((x) => `${x.depute_id ? x.nom : ROLE[x.role]} (${x.position === "pour" ? "pour" : "contre"} la mesure)`);
    if (dec.length) ajouter(6, `Ceux qui décident : ${dec.join(", ")}.`);
    const act = a.groupes.actionnables.slice(0, 3).map((x) => {
      const n = nom(x.depute_id);
      const g = sigle(x.groupe_id);
      return n ? `${n}${g ? ` (${g})` : ""}` : null;
    }).filter(Boolean);
    if (act.length) ajouter(4, `Députés sur qui agir en priorité : ${act.join(", ")}.`);
    const camp = d.objectifs[0].position_cible === "contre" ? a.arguments.contre : a.arguments.pour;
    if (camp[0]) ajouter(9, `Argument déjà entendu en faveur du client : ${camp[0].argument.replace(/\.$/, "")}.`, [], { label: `Intervention du ${camp[0].date}`, url: camp[0].url });
  } else limites.push("députés à approcher pas encore disponibles");

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
  return [entete, ...f.phrases.filter((_, i) => garde.has(i))].join(" ");
}

function remplir(modele: string, vars: Record<string, string>): string {
  return modele.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

function promptNote(d: Dossier, f: Faits): { system: string; user: string } {
  const vars = {
    client: d.client,
    objectif: d.objectifs[0].texte,
    replis: d.objectifs.slice(1).map((o) => o.texte).join(" ; "),
    mesure: d.mesure.label,
    date_reference: d.date_reference ? dateFr(d.date_reference) : "aujourd'hui",
    faits: f.phrases.map((p) => `- ${p}`).join("\n"),
    chiffres: f.chiffres.join(", "),
    limites: f.limites.join(" ; "),
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
      "Écris les probabilités en pourcentage (0.24 s'écrit 24 %). Une prédiction Orcet est une moyenne des probabilités individuelles de voter pour, jamais une probabilité d'adoption. " +
      "N'en déduis jamais qu'un amendement ou la mesure sera adopté ou rejeté, Tu n'écris jamais « probabilité » ni « chances ». Le score du verdict s'écrit toujours « X % des sièges favorables à l'objectif », jamais un pourcentage seul à côté de favorable ou défavorable. " +
      "Tu ne donnes aucun conseil ni aucune cible qui ne figure pas mot pour mot dans les faits ; si aucun député n'est cité, tu n'en désignes pas. " +
      "Pas d'heure, seulement des dates. Un vote en commission n'est pas une adoption ; l'Assemblée n'est pas l'issue finale. Ne mélange jamais rejeté, retiré, tombé et non examiné.",
    user:
      `Client : ${vars.client}. Mesure suivie : ${vars.mesure}. Objectif principal : ${vars.objectif}. Replis : ${vars.replis || "aucun"}. ` +
      `Situation au ${vars.date_reference}.\n\nFaits :\n${vars.faits}\n\n` +
      `Rédige le compte rendu dans cet ordre : verdict et pourquoi, ce qui a bougé, prochaines dates${f.phrases.some((p) => p.startsWith("Députés sur qui agir")) ? ", sur qui agir (uniquement les députés cités)" : ". Ne dis pas sur qui agir : la liste n'est pas encore prête"}. Termine par une phrase de limites si elles existent : ` +
      (vars.limites || "aucune") + ".",
  };
}

type Entrees = { v: Verdict | null; s: Suite | null; a: Action | null; n: Nouveautes | null; e: Etat | null };

/**
 * Gabarit de X3 (prompts/gabarit-note.md) : blocs ```gabarit id=...```, variables {{x}}, ordre et conditions
 * de la section « Blocs ». Renvoie null si le fichier manque, si un bloc manque ou si une variable reste vide.
 */
function gabaritX3(d: Dossier, x: Entrees, limites: string): string | null {
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
  const ref = d.date_reference;
  const evs = (x.n?.evenements ?? []).filter((ev) => connuA(ev, ref));
  const vars: Record<string, string> = {
    client: d.client,
    mesure_label: sansPoint(d.mesure.label),
    etape: x.e ? sansPoint(x.e.etape) : "",
    objectif_1: sansPoint(d.objectifs[0].texte),
    situation_mot: SIT[v1.situation],
    tendance_mot: TENDANCE[v1.tendance],
    niveau_mot: NIV[v1.confiance.niveau],
    lecture_1: avecPoint(v1.lecture.texte),
    limites: avecPoint(limites),
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
  if (x.a) {
    vars.n_actionnables = String(x.a.groupes.actionnables.length);
    vars.n_allies = String(x.a.groupes.allies.length);
    vars.n_perdus = String(x.a.groupes.perdus.length);
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
    bloc("note.verdict");
    for (const vr of [...x.v.verdicts].filter((y) => y.objectif_rang > 1).sort((a, b) => a.objectif_rang - b.objectif_rang)) {
      const o = d.objectifs.find((y) => y.rang === vr.objectif_rang);
      if (o) bloc("note.repli", { objectif_n: sansPoint(o.texte), situation_mot: SIT[vr.situation] });
    }
    bloc(evs.length >= 2 ? "note.bouge.deux" : evs.length === 1 ? "note.bouge.un" : "note.bouge.rien");
    const e0 = x.s?.echeances[0];
    const occ = x.s?.derniere_occasion;
    if (e0 && !(occ && occ.date && occ.date === e0.date)) bloc("note.dates.echeance");
    if (occ) bloc("note.dates.derniere");
    bloc("note.action");
    bloc(limites ? "note.limites" : "note.limites.defaut");
  } catch (err) {
    console.warn(`${d.id} : gabarit de X3 inutilisable (${String(err)}), gabarit intégré`);
    return null;
  }
  return morceaux.join(" ");
}

async function traiter(d: Dossier, cfg: Config): Promise<{ id: string; mode: string; fautifs: string[]; verifie: boolean; mots: number }> {
  const limites: string[] = [];
  const p = (k: Kind) => dataPath(d.id, k, undefined, SOURCE);
  const v = lire<Verdict>(p("verdict"), "verdict", limites);
  const s = lire<Suite>(p("suite"), "suite", limites);
  const a = lire<Action>(p("action"), "action", limites);
  const t = lire<Texte>(p("texte"), "texte", limites);
  const groupes = lire<Groupes>(dataPath(null, "groupes", undefined, SOURCE), "groupes", []);
  const deputes = lire<Deputes>(dataPath(null, "deputes", undefined, SOURCE), "deputes", []);
  const n = lire<Nouveautes>(p("nouveautes"), "nouveautes", limites);
  const e = lire<Etat>(p("etat"), "etat", limites);
  const f = construireFaits(d, v, s, a, t, groupes, deputes, limites);
  // Ce qui a bougé (nouveautes.json, déjà trié par importance) : les deux premiers événements datés au plus tard à la référence.
  const EFFET: Record<string, string> = { renforce: "favorable au client", affaiblit: "défavorable au client", neutre: "sans effet sur le verdict" };
  for (const ev of (n?.evenements ?? []).filter((x) => connuA(x, d.date_reference)).slice(0, 2)) {
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
  const gx3 = gabaritX3(d, { v, s, a, n, e }, limitesTexte);
  const texteGabarit = gx3 ?? gabaritIntegre(d, f);
  if (gx3) autorises.push(...nombresDe(gx3).filter((c) => !autorises.includes(c)), ...[s?.derniere_occasion?.date, s?.echeances[0]?.date, ...(n?.evenements ?? []).slice(0, 2).map((ev) => ev.date)].filter((c): c is string => !!c));
  // Garde-fous du rendu final, contrôlés après le vérificateur de chiffres : 2 relances au plus, sinon gabarit.
  const prompt = promptNote(d, f);
  let r = await redigerVerifie(prompt, autorises, texteGabarit);
  for (let relance = 0; r.mode === "llm" && relance < 2; relance++) {
    const fautes = interdits(r.texte, f);
    if (!fautes.length) break;
    console.warn(`${d.id} : garde-fou (${fautes.join(" | ")}), relance`);
    r = await redigerVerifie({ system: prompt.system, user: prompt.user + `\n\nN'écris surtout pas : ${fautes.map((x) => `« ${x} »`).join(", ")}.` }, autorises, texteGabarit);
    if (relance === 1 && r.mode === "llm" && interdits(r.texte, f).length) {
      r = { texte: texteGabarit, mode: "gabarit", chiffres_utilises: chiffresUtilises(texteGabarit, autorises), fautifs: [], modele: null, verifie: verifierChiffres(texteGabarit, autorises).ok, tentatives: r.tentatives };
    }
  }
  const metaSources = dedoublonnerSources([...(v?.meta.sources ?? []), ...(t?.meta.sources ?? [])]);
  const sources = dedoublonnerSources(f.sources).slice(0, 8);
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
