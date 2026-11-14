// Session A2 : débats par député et arguments entendus pour et contre la mesure.
// Usage : bun run debats [--dossier <id>] [--root data|contracts/fixtures] [--sans-commission]
// Tout est régénéré depuis zéro à chaque exécution ; les téléchargements sont mis en cache dans data/raw/opendata/.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ArgumentSchema, DebatsSchema, type Argument, type Debats, type DossierConfig } from "../../contracts";
import { chargerContexte, deputesDuDossier, horodatage, normaliserNom, RACINE, type Contexte } from "./contexte";
import { classerTout, cleDisponible, regrouper, verifierCamp, type ClassementVerifie } from "./classer";
import { lireCommission } from "./commission";
import { lireSeances, orateursSeance, preparerSyseron, URL_SYSERON } from "./seance";
import { extrait, regexMotsCles, sansAccents } from "./texte";
import type { Intervention, SourceLue } from "./types";

const args = process.argv.slice(2);
const opt = (nom: string) => {
  const i = args.indexOf(nom);
  return i >= 0 ? args[i + 1] : undefined;
};
const seulDossier = opt("--dossier");
const rootForce = opt("--root");
const sansCommission = args.includes("--sans-commission");
const sansClassement = args.includes("--sans-classement");
const log = (s: string) => console.log(`[debats] ${s}`);

function attribuer(ctx: Contexte, carteSeance: Map<string, string>, it: Intervention): void {
  if (it.acteur_id) return;
  const cle = normaliserNom(it.orateur_nom);
  it.acteur_id = ctx.parNom.get(cle) ?? carteSeance.get(cle) ?? null;
}

function groupeDe(ctx: Contexte, it: Intervention): string | null {
  if (it.acteur_id && ctx.deputes.has(it.acteur_id)) return ctx.deputes.get(it.acteur_id)!.groupe_id;
  if (it.groupe_sigle) return ctx.parSigle.get(it.groupe_sigle) ?? null;
  return null;
}

function jaccard(a: string, b: string): number {
  const mots = (s: string) => new Set(sansAccents(s).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((m) => m.length > 3));
  const A = mots(a);
  const B = mots(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const m of A) if (B.has(m)) inter += 1;
  return inter / (A.size + B.size - inter);
}

type Candidat = { it: Intervention; c: ClassementVerifie };

/** Dédoublonne les arguments proches (même camp) : garde le plus sûr, puis l'orateur identifié, puis la citation la plus courte. */
function dedoublonner(cands: Candidat[]): Candidat[] {
  const tri = [...cands].sort((x, y) => {
    if (y.c.confiance !== x.c.confiance) return y.c.confiance - x.c.confiance;
    const ox = x.it.acteur_id ? 0 : 1;
    const oy = y.it.acteur_id ? 0 : 1;
    if (ox !== oy) return ox - oy;
    return x.c.citation.length - y.c.citation.length;
  });
  const gardes: Candidat[] = [];
  for (const c of tri) {
    const doublon = gardes.some((g) => g.c.citation === c.c.citation || jaccard(g.c.argument, c.c.argument) >= 0.5);
    if (!doublon) gardes.push(c);
  }
  return gardes.sort((a, b) => (a.it.date < b.it.date ? 1 : a.it.date > b.it.date ? -1 : 0));
}

/** Regroupe par le modèle les arguments d'un camp (repli : dédoublonnage lexical) ; garde la citation la plus claire de chaque groupe. */
async function regrouperCamp(dossier: DossierConfig, camp: "pour" | "contre", cands: Candidat[], log: (s: string) => void): Promise<{ cand: Candidat; libelle: string; aussi: Candidat[] }[]> {
  const groupes = await regrouper(dossier, camp, cands.map((x) => ({ argument: x.c.argument, citation: x.c.citation })), log);
  if (!groupes) return dedoublonner(cands).map((cand) => ({ cand, libelle: cand.c.argument, aussi: [] }));
  const out = groupes.map((g) => ({ cand: cands[g.meilleure], libelle: g.argument, aussi: g.membres.filter((i) => i !== g.meilleure).map((i) => cands[i]) }));
  return out.sort((a, b) => b.aussi.length - a.aussi.length || (a.cand.it.date < b.cand.it.date ? 1 : a.cand.it.date > b.cand.it.date ? -1 : 0));
}

function versArgument(ctx: Contexte, cand: Candidat, libelle?: string, aussi: Candidat[] = []): Argument {
  const { it, c } = cand;
  const orateurConnu = it.acteur_id !== null && ctx.deputes.has(it.acteur_id);
  const qui = `${it.orateur_nom}${it.orateur_qualite ? `, ${it.orateur_qualite}` : ""}`;
  const comment = c.origine === "manuel" ? "classement relu à la main par la session A2" : `classement par le modèle ${c.modele}, confiance ${c.confiance.toFixed(2)}`;
  const egalement = aussi.length
    ? ` Même argument entendu aussi chez ${aussi.map((a) => `${a.it.orateur_nom} (${a.it.lieu === "seance" ? "séance" : "commission"} du ${a.it.date})`).join(", ")}.`
    : "";
  return ArgumentSchema.parse({
    argument: (libelle ?? c.argument).trim(),
    citation: c.citation.trim(),
    orateur_id: orateurConnu ? it.acteur_id : null,
    groupe_id: groupeDe(ctx, it),
    date: it.date,
    lieu: it.lieu,
    url: it.url,
    preuve: {
      sources: [{ label: it.source_label, url: it.url }],
      raisonnement: `Classé ${c.camp} la mesure parce que l'orateur (${qui}${orateurConnu ? "" : ", sans identifiant de député dans deputes.json"}) ${c.camp === "pour" ? "la défend" : "s'y oppose ou veut la réduire"} : « ${c.argument.trim()} ». Citation recopiée mot pour mot du compte rendu ; ${comment}.${egalement}`,
      nature: "deduction",
    },
  });
}

async function traiterDossier(ctx: Contexte, dossier: DossierConfig): Promise<void> {
  log(`dossier ${dossier.id} (${dossier.label}), date de référence ${dossier.date_reference ?? "aucune"}`);
  const seance = await lireSeances(dossier, log);
  const commission = sansCommission ? { interventions: [], lues: [], scannees: 0 } : await lireCommission(dossier, log);
  const carteSeance = orateursSeance(normaliserNom);
  const interventions = [...seance.interventions, ...commission.interventions];
  for (const it of interventions) attribuer(ctx, carteSeance, it);
  const lues: SourceLue[] = [...seance.lues, ...commission.lues];
  const re = regexMotsCles(dossier.sujet.mots_cles);
  log(`${interventions.length} paragraphes sur le sujet (${seance.interventions.length} séance, ${commission.interventions.length} commission) dans ${lues.length} comptes rendus ; ${seance.scannees + commission.scannees} comptes rendus lus`);

  const dirDossier = join(RACINE, "data", dossier.id);
  const dirDebats = join(dirDossier, "debats");
  mkdirSync(dirDebats, { recursive: true });
  const sourcesCommunes = [
    { label: "Comptes rendus de séance (open data AN, syseron.xml.zip)", url: URL_SYSERON },
    { label: "Comptes rendus de la commission des finances", url: "https://www.assemblee-nationale.fr/dyn/17/organes/commissions-permanentes/finances" },
  ];
  const comptesRendusLus = seance.scannees + commission.scannees;

  // 1. Un fichier par député.
  const { ids, source } = deputesDuDossier(ctx, dossier);
  if (ids.length === 0) log(`aucune liste de députés (${source}) : pas de fichier debats/<PA>.json pour l'instant`);
  let avecDebats = 0;
  for (const pa of ids) {
    const siens = interventions.filter((it) => it.acteur_id === pa).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    if (siens.length > 0) avecDebats += 1;
    const sourcesPropres = [...new Map(siens.map((it) => [it.url, { label: it.source_label, url: it.url }])).values()];
    const fichier: Debats = DebatsSchema.parse({
      meta: {
        generated_at: horodatage(),
        sources: [...sourcesCommunes, ...sourcesPropres],
        limits: `Interventions sur le sujet (mots-clés ${dossier.sujet.mots_cles.join(", ")} ou article ${dossier.mesure.article} du texte) ; ${comptesRendusLus} comptes rendus lus (séance et commission des finances), rien après ${dossier.date_reference ?? "ce jour"}. Séance attribuée par l'identifiant d'acteur du compte rendu ; commission attribuée par le nom. Liste des députés : ${source}.`,
        producer: "pipeline/debats",
        dossier_id: dossier.id,
      },
      depute_id: pa,
      debats: siens.map((it) => ({
        date: it.date,
        lieu: it.lieu,
        texte_id: dossier.texte_id,
        citation: extrait(it.texte, it.mot_cle ? re : null),
        url: it.url,
      })),
      couverture: { comptes_rendus_lus: comptesRendusLus },
    });
    writeFileSync(join(dirDebats, `${pa}.json`), JSON.stringify(fichier, null, 2) + "\n");
  }
  log(`${ids.length} fichiers debats/<PA>.json écrits, ${avecDebats} avec au moins une intervention`);

  // 2. Arguments entendus, pour et contre la mesure.
  const { resultats, modeleUtilise, rejets, appels } = sansClassement
    ? { resultats: new Map(), modeleUtilise: false, rejets: 0, appels: 0 }
    : await classerTout(dossier, interventions, log);
  const candidatsBruts: Candidat[] = [];
  for (const it of interventions) {
    const c = resultats.get(it.id);
    if (!c || !c.sur_le_sujet || c.camp === "neutre" || c.confiance < 0.7) continue;
    candidatsBruts.push({ it, c });
  }
  // Second avis indépendant sur le camp : un désaccord écarte l'argument (classement manuel exempté).
  const cands: Candidat[] = [];
  let desaccords = 0;
  for (const cand of candidatsBruts) {
    if (cand.c.origine === "manuel") { cands.push(cand); continue; }
    const v = await verifierCamp(dossier, cand.it, cand.c, log);
    if (v && v.camp !== cand.c.camp) { desaccords += 1; log(`camp contesté ${cand.it.id} : ${cand.c.camp} puis ${v.camp}, écarté`); continue; }
    cands.push(cand);
  }
  const pour = (await regrouperCamp(dossier, "pour", cands.filter((x) => x.c.camp === "pour"), log)).map((g) => versArgument(ctx, g.cand, g.libelle, g.aussi));
  const contre = (await regrouperCamp(dossier, "contre", cands.filter((x) => x.c.camp === "contre"), log)).map((g) => versArgument(ctx, g.cand, g.libelle, g.aussi));
  const limites = [
    `${interventions.length} prises de parole sur le sujet lues dans ${lues.length} comptes rendus (${comptesRendusLus} comptes rendus parcourus) ; ${resultats.size} classées, ${cands.length} retenues (confiance ≥ 0,7, citation retrouvée mot pour mot), ${rejets} rejetées pour citation inexacte, ${desaccords} écartées car le second avis du modèle contredit le camp ; ${pour.length} pour et ${contre.length} contre après dédoublonnage.`,
    cleDisponible() ? `Classement par le modèle Featherless (${appels} appels à cette exécution, cache sur disque).` : "FEATHERLESS_API_KEY absente : seuls les classements relus à la main (pipeline/debats/classement-manuel) sont utilisés.",
    `Orateur sans identifiant (ministre, rapporteur, député absent de deputes.json) : orateur_id null, nom dans preuve.raisonnement. Rien après ${dossier.date_reference ?? "ce jour"}.`,
  ].join(" ");
  const argumentsJson = {
    meta: {
      generated_at: horodatage(),
      sources: [...sourcesCommunes, ...lues.map((l) => ({ label: l.label, url: l.url }))],
      limits: limites,
      producer: "pipeline/debats",
      dossier_id: dossier.id,
    },
    pour,
    contre,
  };
  writeFileSync(join(dirDossier, "arguments.json"), JSON.stringify(argumentsJson, null, 2) + "\n");
  log(`arguments.json : ${pour.length} pour, ${contre.length} contre (modèle ${modeleUtilise ? "appelé" : "non appelé"})`);

  // 3. Trace de travail (non commitée) : toutes les interventions extraites, pour relecture.
  mkdirSync(join(RACINE, "data", "raw", "debats"), { recursive: true });
  writeFileSync(join(RACINE, "data", "raw", "debats", `interventions-${dossier.id}.json`), JSON.stringify({ lues, interventions }, null, 2));
}

async function main() {
  const ctx = chargerContexte(rootForce);
  log(`référentiels lus dans ${ctx.root} (${ctx.deputes.size} députés, ${ctx.groupes.size} groupes)`);
  await preparerSyseron(log);
  const dossiers = ctx.config.dossiers.filter((d) => !seulDossier || d.id === seulDossier);
  if (dossiers.length === 0) throw new Error(`dossier inconnu : ${seulDossier}`);
  // Le dossier rejoué (date de référence posée) d'abord : c'est la priorité de la démo.
  dossiers.sort((a, b) => (a.date_reference ? 0 : 1) - (b.date_reference ? 0 : 1));
  for (const d of dossiers) await traiterDossier(ctx, d);
}

main().catch((e) => {
  console.error(`[debats] échec : ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
  process.exit(1);
});
