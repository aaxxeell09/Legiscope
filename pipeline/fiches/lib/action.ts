// Bloc Action : décideurs et groupes recopiés de groupes-action.json (P3) avec
// `fiche` selon fiches/index.json, arguments recopiés de arguments.json (A2),
// contre-arguments rédigés (llm vérifié ou gabarit) pour chaque argument du camp
// opposé au client. « pour » et « contre » qualifient la mesure, pas l'objectif.

import {
  ArgumentsSchema, GroupesActionSchema, dataPath,
  type Action, type Argument, type Arguments, type ContreArgument, type FichesIndex, type GroupesAction, type Source,
} from "../../../contracts/index";
import type { Contexte } from "./contexte";
import { ecrireJson, fusionnerSources, lireJsonBrut, lireKind, maintenant, noter, posterieur } from "./io";
import { LIEU_LIBELLE, gabaritContreArgument, type ArgumentEntendu } from "./gabarits";
import { dateFr } from "./io";
import { lirePrompt, rediger } from "./redaction";

const PROMPT_CONTRE = "pipeline/action/prompts/contre-argument.md";

/** groupes-action.json (P3, contrat 5.18), sinon les mêmes champs repris de l'action.json existant. */
export function lireGroupesAction(ctx: Contexte, limites: string[]): GroupesAction | null {
  const g = lireKind(ctx.root, ctx.dossier.id, "groupes-action");
  if (g) return g;
  const ancien = lireJsonBrut(dataPath(ctx.dossier.id, "action", undefined, ctx.root)) as any;
  if (ancien?.groupes && ancien?.decideurs) {
    const r = GroupesActionSchema.safeParse({ meta: ancien.meta, ...ancien.groupes, decideurs: ancien.decideurs });
    if (r.success) {
      limites.push("groupes-action.json absent : décideurs et groupes repris de l'action.json précédent.");
      noter(`${ctx.dossier.id}/action : groupes-action.json absent, repli sur l'action.json existant`);
      return r.data;
    }
  }
  limites.push("groupes-action.json absent et aucun action.json antérieur : décideurs et groupes vides.");
  return null;
}

export function lireArguments(ctx: Contexte, limites: string[]): Arguments | null {
  const a = lireKind(ctx.root, ctx.dossier.id, "arguments");
  if (a) return a;
  const ancien = lireJsonBrut(dataPath(ctx.dossier.id, "action", undefined, ctx.root)) as any;
  if (ancien?.arguments) {
    const r = ArgumentsSchema.safeParse({ meta: ancien.meta, ...ancien.arguments });
    if (r.success) {
      limites.push("arguments.json absent : arguments repris de l'action.json précédent.");
      noter(`${ctx.dossier.id}/action : arguments.json absent, repli sur l'action.json existant`);
      return r.data;
    }
  }
  limites.push("arguments.json absent et aucun action.json antérieur : arguments vides.");
  return null;
}

function versEntendu(a: Argument): ArgumentEntendu {
  return { argument: a.argument, citation: a.citation, date: a.date, lieu: a.lieu, url: a.url };
}

async function contreArgument(ctx: Contexte, cible: Argument, index: number, appuis: Argument[], chiffresDossier: string[], sourcesDossier: Source[]): Promise<ContreArgument> {
  // Entrée du modèle : sans orateur ni groupe (pas d'attaque personnelle possible), sans prédiction Orcet.
  const entree = {
    argument: { argument: cible.argument, citation: cible.citation, date: cible.date, lieu: cible.lieu },
    appuis: appuis.map((a) => ({ argument: a.argument, citation: a.citation, date: a.date, lieu: a.lieu })),
    mesure: ctx.dossier.mesure.label,
    client: ctx.dossier.client,
    position_cible: ctx.dossier.objectifs[0].position_cible,
    chiffres_du_dossier: chiffresDossier,
  };
  const g = gabaritContreArgument({ ...entree, argument: versEntendu(cible), appuis: appuis.map(versEntendu) }, index);
  const r = await rediger({ prompt: lirePrompt(PROMPT_CONTRE), champ: "texte", entree, gabarit: g.texte, chiffresGabarit: g.chiffres, etiquette: `${ctx.dossier.id}/action contre-argument « ${cible.argument.slice(0, 40)} »` });
  let preuve: ContreArgument["preuve"];
  if (r.mode === "llm") {
    preuve = {
      sources: fusionnerSources([{ label: `${LIEU_LIBELLE[cible.lieu]} du ${dateFr(cible.date)} (argument adverse)`, url: cible.url }], appuis.slice(0, 2).map((a) => ({ label: `${LIEU_LIBELLE[a.lieu]} du ${dateFr(a.date)} (argument du camp du client)`, url: a.url })), sourcesDossier.slice(0, 1)),
      raisonnement: "Rédigé par le modèle à partir des arguments du camp du client déjà entendus et des chiffres du dossier, puis passé au vérificateur de chiffres.",
      nature: "deduction",
    };
  } else if (g.appui) {
    preuve = {
      sources: [{ label: `${g.appui.lieu === "seance" ? "Séance" : "Commission"} du ${dateFr(g.appui.date)}`, url: g.appui.url ?? cible.url }],
      raisonnement: "Gabarit de secours : reprend un argument du camp du client déjà entendu dans les débats, sans rédaction par le modèle.",
      nature: "deduction",
    };
  } else {
    preuve = {
      sources: [{ label: `${LIEU_LIBELLE[cible.lieu]} du ${dateFr(cible.date)}`, url: cible.url }],
      raisonnement: "Gabarit de secours : aucun argument du camp du client relevé dans les débats.",
      nature: "inconnue",
    };
  }
  return { texte: r.texte, repond_a: cible.argument, chiffres_utilises: r.chiffres_utilises, mode: r.mode, verifie: r.verifie, preuve };
}

export async function construireAction(ctx: Contexte, index: FichesIndex): Promise<Action> {
  const { dossier, root } = ctx;
  const ref = dossier.date_reference;
  const limites: string[] = ["« pour » et « contre » qualifient la mesure, pas l'objectif du client. Un député n'est classé que sur ses propres actes (groupes-action.json, P3)."];
  const ga = lireGroupesAction(ctx, limites);
  const ar = lireArguments(ctx, limites);
  const disponibles = new Set(index.disponibles);

  // Complément 5 : un député n'entre dans alliés, actionnables ou perdus que sur un acte personnel (fondement non vide) ;
  // les autres rejoignent `position_inconnue` (recopiée de groupes-action.json quand P3 la fournit).
  const sansFondement: any[] = [];
  const avecFiche = (liste: GroupesAction["actionnables"]) => liste
    .filter((d) => {
      if (d.fondement.length > 0 && d.position_connue) return true;
      sansFondement.push(d);
      return false;
    })
    .map((d) => ({ ...d, fiche: disponibles.has(d.depute_id) }));
  const groupes = {
    actionnables: avecFiche(ga?.actionnables ?? []),
    allies: avecFiche(ga?.allies ?? []),
    perdus: avecFiche(ga?.perdus ?? []),
  };
  const positionGroupeDe = (groupeId: string) => ctx.texte?.positions.find((p) => p.groupe_id === groupeId)?.position ?? null;
  const dejaInconnus = new Set<string>();
  const position_inconnue: any[] = [];
  for (const d of [...(((ga as any)?.position_inconnue ?? []) as any[]), ...sansFondement.map((d) => ({ depute_id: d.depute_id, groupe_id: d.groupe_id, position_groupe: positionGroupeDe(d.groupe_id), preuve: d.preuve }))]) {
    if (!d?.depute_id || dejaInconnus.has(d.depute_id)) continue;
    dejaInconnus.add(d.depute_id);
    position_inconnue.push({ depute_id: d.depute_id, groupe_id: d.groupe_id, position_groupe: d.position_groupe ?? null, fiche: disponibles.has(d.depute_id), preuve: d.preuve });
  }
  if (sansFondement.length > 0) limites.push(`${sansFondement.length} député(s) sans acte personnel retiré(s) des trois listes et placé(s) en position_inconnue.`);

  const filtre = (liste: Argument[]) => liste.filter((a) => !posterieur(a.date, ref));
  const argumentsFiltres = { pour: filtre(ar?.pour ?? []), contre: filtre(ar?.contre ?? []) };
  const retires = (ar?.pour.length ?? 0) + (ar?.contre.length ?? 0) - argumentsFiltres.pour.length - argumentsFiltres.contre.length;
  if (retires > 0) limites.push(`${retires} argument(s) postérieur(s) à la date de référence écarté(s).`);

  // Camp adverse = opposé à position_cible ; appuis = arguments du camp du client.
  const cible = dossier.objectifs[0].position_cible;
  const adverses = cible === "contre" ? argumentsFiltres.pour : argumentsFiltres.contre;
  const appuis = cible === "contre" ? argumentsFiltres.contre : argumentsFiltres.pour;
  const chiffresDossier = [dossier.mesure.label, ...(ctx.texte?.amendements ?? []).map((a) => `n° ${a.numero} : ${a.resume}`)];
  const sourcesDossier: Source[] = ctx.texte ? [{ label: `Texte ${ctx.texte.texte.id}`, url: ctx.texte.texte.url }] : [];
  const contre_arguments: ContreArgument[] = [];
  for (let i = 0; i < adverses.length; i++) contre_arguments.push(await contreArgument(ctx, adverses[i], i, appuis, chiffresDossier, sourcesDossier));
  if (adverses.length === 0) limites.push("Aucun argument du camp adverse entendu : pas de contre-argument.");
  const enGabarit = contre_arguments.filter((c) => c.mode === "gabarit").length;
  if (enGabarit > 0) limites.push(`${enGabarit} contre-argument(s) en gabarit.`);

  const action: Action = {
    meta: {
      generated_at: maintenant(),
      sources: fusionnerSources(ga?.meta.sources, ar?.meta.sources, ctx.texte?.meta.sources),
      limits: limites.join(" "),
      producer: "pipeline/fiches",
      dossier_id: dossier.id,
    },
    decideurs: ga?.decideurs ?? [],
    groupes: { ...groupes, ...(position_inconnue.length > 0 ? { position_inconnue } : {}) } as Action["groupes"],
    arguments: argumentsFiltres,
    contre_arguments,
  };
  ecrireJson(dataPath(dossier.id, "action", undefined, root), action);
  noter(`${dossier.id}/action : ${action.decideurs.length} décideurs, ${groupes.actionnables.length}/${groupes.allies.length}/${groupes.perdus.length} actionnables/alliés/perdus, ${argumentsFiltres.pour.length} pour, ${argumentsFiltres.contre.length} contre, ${contre_arguments.length} contre-arguments (${enGabarit} gabarit)`);
  return action;
}
