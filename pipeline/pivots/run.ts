// bun run pivots : régénère pivots.json (et à terme etat, texte, groupes-action, verdict) pour chaque dossier.
// Usage : bun pipeline/pivots/run.ts [--provisoire]
import { join } from "node:path";
import { chargerScrutins } from "./lib/opendata";
import { DATA, ecrireJson, lireJson } from "./lib/commun";
import { type Dossier, amendementsDuSujet, coupure, positionsDepuisAmendements, positionsDepuisScrutins, scrutinsLies } from "./lib/sujet";
import { type CtxDossier, construirePivots } from "./pivots";

const provisoire = process.argv.includes("--provisoire");
const config = lireJson(join(DATA, "config.json")) ?? lireJson(join(DATA, "..", "contracts", "fixtures", "config.json"));
const groupesJ = lireJson(join(DATA, "groupes.json")) ?? lireJson(join(DATA, "..", "contracts", "fixtures", "groupes.json"));
const deputesJ = lireJson(join(DATA, "deputes.json")) ?? lireJson(join(DATA, "..", "contracts", "fixtures", "deputes.json"));
const groupes = new Map<string, { sigle: string; effectif: number }>(groupesJ.groupes.map((g: any) => [g.id, { sigle: g.sigle, effectif: g.effectif }]));
const deputes = new Map<string, any>(deputesJ.deputes.map((d: any) => [d.id, d]));

const scrutins = chargerScrutins();
const resume: string[] = [];

export function contexte(d: Dossier): CtxDossier {
  const { avant } = coupure(d);
  const amdts = amendementsDuSujet(d);
  const lies = scrutinsLies(d, scrutins, amdts, avant);
  const posS = positionsDepuisScrutins(lies);
  const posA = positionsDepuisAmendements(amdts, avant);
  const sourcePositions = posS.size >= 3 ? "scrutins" : posA.size > 0 ? "amendements" : "aucune";
  const positions = sourcePositions === "scrutins" ? posS : posA;
  return { d, scrutins, lies, positions, sourcePositions, groupes, deputes };
}

for (const d of config.dossiers as Dossier[]) {
  const ctx = contexte(d);
  const pivots = construirePivots(ctx, provisoire ? "general" : "auto");
  ecrireJson(join(DATA, d.id, "pivots.json"), pivots);
  const parSens = { pour: 0, contre: 0, inconnu: 0 };
  for (const s of ctx.lies) parSens[s.sens > 0 ? "pour" : s.sens < 0 ? "contre" : "inconnu"]++;
  resume.push(
    `${d.id} : ${ctx.lies.length} scrutins nominatifs liés au sujet (votes sur un amendement du sujet, ${parSens.pour} qui portent la mesure, ${parSens.contre} qui la combattent, ${parSens.inconnu} de sens non lu), ` +
      `positions des groupes depuis ${ctx.sourcePositions}, ${pivots.deputes.length} pivots (${pivots.deputes[0]?.base ?? "-"}).`,
  );
}
console.log(resume.join("\n"));
