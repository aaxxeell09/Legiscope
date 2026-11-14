// Bloc Action : décideurs et groupes recopiés de groupes-action.json (P3) avec
// `fiche` selon fiches/index.json, arguments recopiés de arguments.json (A2),
// contre-arguments rédigés (llm vérifié ou gabarit) pour chaque argument du camp
// opposé au client. « pour » et « contre » qualifient la mesure, pas l'objectif.

import { z } from "zod";
import { join } from "node:path";
import {
  ArgumentSchema, DecideurSchema, FondementSchema, MetaSchema, PreuveSchema, Proba, dataPath,
  type Action, type Argument, type ContreArgument, type FichesIndex, type Source,
} from "../../../contracts/index";
import type { Contexte } from "./contexte";
import { ecrireJson, fusionnerSources, lireJsonBrut, lireValide, maintenant, noter, posterieur } from "./io";
import { gabaritContreArgument, type ArgumentEntendu } from "./gabarits";
import { lirePrompt, rediger } from "./redaction";

const PROMPT_CONTRE = "pipeline/action/prompts/contre-argument.md";

// Lecture locale de l'intermédiaire de P3 (5.18) : les champs de DeputeAction sans `fiche`.
const DeputeIntermediaireSchema = z.object({
  depute_id: z.string().min(1),
  groupe_id: z.string().min(1),
  score: Proba,
  raison: z.string().min(1),
  fondement: z.array(FondementSchema),
  position_connue: z.boolean(),
  preuve: PreuveSchema,
});
const GroupesActionSchema = z.object({
  meta: MetaSchema,
  actionnables: z.array(DeputeIntermediaireSchema),
  allies: z.array(DeputeIntermediaireSchema),
  perdus: z.array(DeputeIntermediaireSchema),
  decideurs: z.array(DecideurSchema),
});
const ArgumentsSchema = z.object({
  meta: MetaSchema,
  pour: z.array(ArgumentSchema),
  contre: z.array(ArgumentSchema),
});
type GroupesAction = z.infer<typeof GroupesActionSchema>;
type Arguments = z.infer<typeof ArgumentsSchema>;

/** groupes-action.json, sinon (fixtures) les mêmes champs repris de l'action.json existant. */
export function lireGroupesAction(ctx: Contexte, limites: string[]): GroupesAction | null {
  const chemin = join(ctx.root, ctx.dossier.id, "groupes-action.json");
  const g = lireValide(chemin, GroupesActionSchema);
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
  const chemin = join(ctx.root, ctx.dossier.id, "arguments.json");
  const a = lireValide(chemin, ArgumentsSchema);
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
  return { argument: a.argument, citation: a.citation, date: a.date, lieu: a.lieu };
}

async function contreArgument(ctx: Contexte, cible: Argument, appuis: Argument[], chiffresDossier: string[], sourcesDossier: Source[], dejaUtilises: Set<string>): Promise<ContreArgument> {
  const entree = {
    argument: versEntendu(cible),
    appuis: appuis.map(versEntendu),
    mesure: ctx.dossier.mesure.label,
    client: ctx.dossier.client,
    position_cible: ctx.dossier.objectifs[0].position_cible,
    chiffres_du_dossier: chiffresDossier,
  };
  const gabarit = gabaritContreArgument(entree, dejaUtilises);
  const r = await rediger({ prompt: lirePrompt(PROMPT_CONTRE), champ: "texte", entree, gabarit, etiquette: `${ctx.dossier.id}/action contre-argument « ${cible.argument.slice(0, 40)} »` });
  const appui = appuis.length > 0 ? appuis : [];
  const sources = fusionnerSources([{ label: `Argument entendu le ${cible.date}`, url: cible.url }], appui.slice(0, 2).map((a) => ({ label: `Argument contraire entendu le ${a.date}`, url: a.url })), sourcesDossier.slice(0, 1));
  return {
    texte: r.texte,
    repond_a: cible.argument,
    chiffres_utilises: r.chiffres_utilises,
    mode: r.mode,
    verifie: r.verifie,
    preuve: {
      sources,
      raisonnement: r.mode === "llm"
        ? "Rédigé par le modèle à partir des arguments du camp du client déjà entendus et des chiffres du dossier, puis passé au vérificateur de chiffres."
        : "Gabarit : reprend un argument du camp du client déjà entendu dans les débats ; aucun chiffre ajouté hors des citations.",
      nature: "deduction",
    },
  };
}

export async function construireAction(ctx: Contexte, index: FichesIndex): Promise<Action> {
  const { dossier, root } = ctx;
  const ref = dossier.date_reference;
  const limites: string[] = ["« pour » et « contre » qualifient la mesure, pas l'objectif du client. Un député n'est classé que sur ses propres actes (groupes-action.json, P3)."];
  const ga = lireGroupesAction(ctx, limites);
  const ar = lireArguments(ctx, limites);
  const disponibles = new Set(index.disponibles);

  const avecFiche = (liste: GroupesAction["actionnables"]) => liste.map((d) => ({ ...d, fiche: disponibles.has(d.depute_id) }));
  const groupes = {
    actionnables: avecFiche(ga?.actionnables ?? []),
    allies: avecFiche(ga?.allies ?? []),
    perdus: avecFiche(ga?.perdus ?? []),
  };

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
  const dejaUtilises = new Set<string>();
  for (const a of adverses) contre_arguments.push(await contreArgument(ctx, a, appuis, chiffresDossier, sourcesDossier, dejaUtilises));
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
    groupes,
    arguments: argumentsFiltres,
    contre_arguments,
  };
  ecrireJson(dataPath(dossier.id, "action", undefined, root), action);
  noter(`${dossier.id}/action : ${action.decideurs.length} décideurs, ${groupes.actionnables.length}/${groupes.allies.length}/${groupes.perdus.length} actionnables/alliés/perdus, ${argumentsFiltres.pour.length} pour, ${argumentsFiltres.contre.length} contre, ${contre_arguments.length} contre-arguments (${enGabarit} gabarit)`);
  return action;
}
