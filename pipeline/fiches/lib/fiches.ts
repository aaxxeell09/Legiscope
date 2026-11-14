// Fiches par député : fusion pure de auditions/<PA>, debats/<PA>, amendements/<PA>
// et hatvp.json, plus la synthèse (llm vérifié ou gabarit). Et fiches/index.json.

import { dataPath, type Fiche, type FichesIndex, type Synthese } from "../../../contracts/index";
import { amendementDuTexte, nomDepute, positionGroupe, sigleGroupe, type Contexte } from "./contexte";
import { aujourdhui, ecrireJson, fusionnerSources, lireKind, maintenant, noter, posterieur } from "./io";
import { gabaritSynthese, type EntreeSynthese } from "./gabarits";
import { lirePrompt, rediger } from "./redaction";

const PROMPT_SYNTHESE = "pipeline/fiches/prompts/synthese.md";

/** Les députés à traiter (P0, 14 h 15) : `pivot_demo` d'abord, puis les actionnables, les alliés et les perdus de groupes-action.json, puis les pivots restants. */
export function candidats(ctx: Contexte): string[] {
  const ordre: string[] = [];
  const ajouter = (id: string) => { if (!ordre.includes(id)) ordre.push(id); };
  const demo = ctx.dossier.pivot_demo;
  if (demo) ajouter(demo);
  const ga = ctx.groupesAction;
  for (const liste of [ga?.actionnables, ga?.allies, ga?.perdus]) for (const d of liste ?? []) ajouter(d.depute_id);
  for (const p of ctx.pivots?.deputes ?? []) ajouter(p.id);
  return ordre;
}

async function synthese(ctx: Contexte, fiche: Omit<Fiche, "synthese">): Promise<{ s: Synthese; origine: "x3" | "local" }> {
  const pa = fiche.depute_id;
  const depute = ctx.deputes.deputes.find((d) => d.id === pa);
  const groupeId = depute?.groupe_id ?? ctx.pivots?.deputes.find((p) => p.id === pa)?.groupe_id ?? null;
  const ref = ctx.dossier.date_reference;
  const entree: EntreeSynthese = {
    depute: { id: pa, nom: depute?.nom ?? pa, prenom: depute?.prenom ?? "", groupe_sigle: sigleGroupe(ctx, groupeId) },
    mesure: ctx.dossier.mesure.label,
    client: ctx.dossier.client,
    position_cible: ctx.dossier.objectifs[0].position_cible,
    position_groupe: positionGroupe(ctx, groupeId),
    amendements: fiche.amendements.map((a) => ({
      id: a.id,
      numero: amendementDuTexte(ctx, a.id)?.numero ?? null,
      role: a.role,
      resume: a.resume,
      sort: a.sort,
      travaille_avec: a.travaille_avec,
    })),
    debats: fiche.debats.filter((d) => !posterieur(d.date, ref)).map((d) => ({ date: d.date, lieu: d.lieu, citation: d.citation })),
    // Complément 1 : le rôle dit si le député a lui-même entendu (rapporteur) ou si les organisations ont été
    // entendues par les rapporteurs de sa commission (membre) ; le prompt de X3 lit `entendu_par`.
    auditions: fiche.auditions.filter((a) => !posterieur(a.date, ref)).map((a) => ({ date: a.date, role: a.role, entendu_par: a.role.startsWith("rapporteur") ? "le député lui-même, comme rapporteur" : "les rapporteurs de sa commission, pas le député lui-même", organisations: a.organisations.map((o) => o.nom) })),
  };
  const pivot = ctx.pivots?.deputes.find((p) => p.id === pa);
  const gabarit = gabaritSynthese(entree, pivot ? { n_ecarts: pivot.ecarts.length, loyaute_12m: pivot.loyaute_12m } : null);
  // L'entrée du modèle ne contient aucun vote brut (règle 5.13) ; identifiants techniques retirés.
  const entreeModele = { ...entree, amendements: entree.amendements.map(({ id: _id, ...reste }) => reste) };
  const prompt = lirePrompt(PROMPT_SYNTHESE);
  const sansCache = regenerer.has(pa);
  const position = await rediger({ prompt, champ: "position_probable", entree: entreeModele, gabarit: gabarit.position_probable, chiffresGabarit: gabarit.chiffres, etiquette: `${ctx.dossier.id}/fiches/${pa} position_probable`, sansCache });
  const argument = await rediger({ prompt, champ: "argument", entree: entreeModele, gabarit: gabarit.argument, chiffresGabarit: gabarit.chiffres, etiquette: `${ctx.dossier.id}/fiches/${pa} argument`, sansCache });
  const mode = position.mode === "llm" && argument.mode === "llm" ? "llm" : "gabarit";
  return { origine: gabarit.origine, s: {
    position_probable: position.texte,
    argument: argument.texte,
    chiffres_utilises: [...new Set([...position.chiffres_utilises, ...argument.chiffres_utilises])],
    mode,
    modele: mode === "llm" ? position.modele : null,
    verifie: position.verifie && argument.verifie,
    date: ref ?? aujourdhui(),
  } };
}

let regenerer = new Set<string>();
/** Députés dont la synthèse est rappelée au modèle hors cache (option --regenerer). */
export function regenererPour(ids: string[]) {
  regenerer = new Set(ids);
}

export async function construireFiches(ctx: Contexte): Promise<FichesIndex> {
  const { root, dossier } = ctx;
  const disponibles: string[] = [];
  const absents: string[] = [];
  const raisons: string[] = [];
  const modes: string[] = [];

  // Deux fiches à la fois (limite de concurrence du client P8) ; l'ordre des listes est conservé.
  const liste = candidats(ctx);
  const resultats = new Map<string, { ok: true; mode: string } | { ok: false; raison: string }>();
  const traiter = async (pa: string) => {
    const auditions = lireKind(root, dossier.id, "auditions", pa);
    const debats = lireKind(root, dossier.id, "debats", pa);
    const amendements = lireKind(root, dossier.id, "amendements", pa);
    const manquants = [["auditions", auditions], ["debats", debats], ["amendements", amendements]].filter(([, v]) => !v).map(([k]) => k as string);
    if (manquants.length > 0 || !ctx.hatvp) {
      resultats.set(pa, { ok: false, raison: `${pa} : ${[...manquants, ...(ctx.hatvp ? [] : ["hatvp.json"])].join(", ")} manquant ou invalide` });
      return;
    }
    const base: Omit<Fiche, "synthese"> = {
      meta: {
        generated_at: maintenant(),
        sources: fusionnerSources(auditions!.meta.sources, debats!.meta.sources, amendements!.meta.sources, ctx.hatvp.meta.sources),
        limits: "",
        producer: "pipeline/fiches",
        dossier_id: dossier.id,
      },
      depute_id: pa,
      auditions: auditions!.auditions,
      debats: debats!.debats,
      amendements: amendements!.amendements,
      hatvp: ctx.hatvp.organisations,
      couverture: { ...auditions!.couverture, ...debats!.couverture },
    };
    const { s, origine } = await synthese(ctx, base);
    const limites: string[] = ["Fusion pure de auditions, debats, amendements et hatvp.json ; synthèse vérifiée par le vérificateur de chiffres."];
    if (s.mode === "gabarit") limites.push(`Synthèse en gabarit${origine === "x3" ? " (gabarit de X3)" : " (gabarit local, fichier de X3 absent)"}, pas de rédaction par modèle.`);
    const ref = dossier.date_reference;
    const apres = [...base.auditions.map((a) => a.date), ...base.debats.map((d) => d.date)].filter((d) => posterieur(d, ref));
    if (apres.length > 0) limites.push(`${apres.length} élément(s) postérieur(s) à la date de référence recopié(s) tels quels (producteurs A1/A2) et ignorés par la synthèse.`);
    const fiche: Fiche = { ...base, meta: { ...base.meta, limits: limites.join(" ") }, synthese: s };
    ecrireJson(dataPath(dossier.id, "fiche", pa, root), fiche);
    resultats.set(pa, { ok: true, mode: s.mode });
  };
  let suivant = 0;
  const ouvrier = async () => { while (suivant < liste.length) await traiter(liste[suivant++]); };
  await Promise.all([ouvrier(), ouvrier()]);
  for (const pa of liste) {
    const r = resultats.get(pa);
    if (!r) continue;
    if (r.ok) { disponibles.push(pa); modes.push(`${pa}:${r.mode}`); }
    else { absents.push(pa); raisons.push(r.raison); }
  }

  const index: FichesIndex = {
    meta: {
      generated_at: maintenant(),
      sources: [],
      limits: `${disponibles.length} fiche(s) produite(s) sur ${disponibles.length + absents.length} député(s) de groupes-action.json et pivots.json.${raisons.length ? " Absents : " + raisons.join(" ; ") + "." : ""}`,
      producer: "pipeline/fiches",
      dossier_id: dossier.id,
    },
    disponibles,
    absents,
  };
  ecrireJson(dataPath(dossier.id, "fiches-index", undefined, root), index);
  noter(`${dossier.id}/fiches : ${disponibles.length} disponibles (${modes.join(", ") || "aucune"}), ${absents.length} absents`);
  return index;
}
