// Bloc 5, compte rendu (PLAN.md 5.12 et 5.21) : data/<dossier>/note.json.
// Entrées : verdict.json, suite.json, action.json, texte.json (jamais un vote brut), groupes.json, deputes.json.
// Usage : bun run note [--source data|contracts/fixtures] [--out data] [--dossier <id>]
// Prompt : pipeline/note/prompts/note.md (X3) s'il existe ; gabarit : prompts/gabarit-note.md ou gabarit intégré.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ZodTypeAny } from "zod";
import {
  ConfigSchema, NoteSchema, SCHEMAS, dataPath,
  type Action, type Config, type Deputes, type Groupes, type Kind, type Note, type Source, type Suite, type Texte, type Verdict,
} from "../../contracts/index";
import { coutCumule, redigerVerifie } from "../lib/llm";
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
    if (vp.score !== null) ph += `, chances estimées par l'outil ${pct(vp.score)}`;
    ph += `, tendance ${TENDANCE[vp.tendance]}.`;
    ajouter(1, ph, vp.score !== null ? [String(vp.score)] : []);
    if (vp.lecture.verifie) ajouter(2, vp.lecture.texte, vp.lecture.chiffres_utilises);
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
          `Amendement n° ${x.numero}${g ? ` (${g})` : ""}, ${x.resume.replace(/\.$/, "")} : Orcet prédit en moyenne ${pct(x.prediction!.proba_pour)} de votes pour.`,
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
    if (occ?.date) ajouter(3, `Dernière occasion d'agir : ${dateFr(occ.date)}, ${min1(occ.titre.replace(/\.$/, ""))}.`, [occ.date], { label: occ.titre, url: occ.url });
    const proch = s.echeances.find((e) => e.date && (!ref || e.date >= ref) && e.date !== occ?.date);
    if (proch?.date) ajouter(7, `Ensuite : ${dateFr(proch.date)}, ${min1(proch.titre.replace(/\.$/, ""))}.`, [proch.date], { label: proch.titre, url: proch.url });
    const prob = s.probables.find((p) => p.proba !== null);
    if (prob) ajouter(8, `Issue la plus probable selon l'outil : ${prob.titre.replace(/\.$/, "")} (${pct(prob.proba!)}).`, [String(prob.proba)]);
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
      "Français, phrases courtes, ton factuel, pas de jargon, pas de titre, pas de liste. Environ 150 mots. " +
      "Tu n'utilises que les faits fournis, tu n'inventes rien. Tu n'écris aucun nombre absent de la liste autorisée. " +
      "Une prédiction Orcet est une moyenne des probabilités individuelles de voter pour, jamais une probabilité d'adoption. " +
      "Un vote en commission n'est pas une adoption ; l'Assemblée n'est pas l'issue finale. Ne mélange jamais rejeté, retiré, tombé et non examiné.",
    user:
      `Client : ${vars.client}. Mesure suivie : ${vars.mesure}. Objectif principal : ${vars.objectif}. Replis : ${vars.replis || "aucun"}. ` +
      `Situation au ${vars.date_reference}.\n\nFaits :\n${vars.faits}\n\n` +
      "Rédige le compte rendu dans cet ordre : verdict et pourquoi, ce qui a bougé, prochaines dates, sur qui agir. Termine par une phrase de limites si elles existent : " +
      (vars.limites || "aucune") + ".",
  };
}

function gabarit(d: Dossier, f: Faits): string {
  const fichier = join(ICI, "prompts", "gabarit-note.md");
  if (existsSync(fichier)) {
    const vars: Record<string, string> = { client: d.client, mesure: d.mesure.label, objectif: d.objectifs[0].texte, faits: f.phrases.join(" ") };
    const t = remplir(readFileSync(fichier, "utf8"), vars).trim();
    if (t && verifierChiffres(t, f.chiffres).ok && !/\{\{/.test(t)) return t;
  }
  return gabaritIntegre(d, f);
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
  const f = construireFaits(d, v, s, a, t, groupes, deputes, limites);
  if (d.date_reference) f.limites.unshift(`Rejoué à la date de référence du ${dateFr(d.date_reference)}`);
  const autorises = [...new Set([...f.chiffres, ...(d.date_reference ? [d.date_reference] : [])])];

  const r = await redigerVerifie(promptNote(d, f), autorises, () => gabarit(d, f));
  const metaSources = dedoublonnerSources([...(v?.meta.sources ?? []), ...(t?.meta.sources ?? [])]);
  const sources = dedoublonnerSources(f.sources).slice(0, 8);
  const limitesTexte = f.limites.length ? f.limites.join(" ; ") + "." : "Aucune limite signalée par les fichiers sources.";
  const note: Note = {
    meta: {
      generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      sources: metaSources.length ? metaSources : sources,
      limits: limitesTexte,
      producer: "pipeline/note",
      dossier_id: d.id,
    },
    client: d.client,
    objectifs: d.objectifs,
    texte: r.texte,
    chiffres_utilises: r.chiffres_utilises,
    sources,
    limites: limitesTexte,
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
