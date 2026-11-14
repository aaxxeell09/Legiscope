// bun run pivots : régénère pivots.json, etat.json, texte.json, groupes-action.json (et verdict.json) pour chaque dossier.
// Usage : bun pipeline/pivots/run.ts [--provisoire] [--dossier <id>]
//   --provisoire : pivots seuls, base générale
//   --dossier     : limite la régénération à un dossier
import { join } from "node:path";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { CACHE, RAW, chargerScrutins } from "./lib/opendata";
import { DATA, ecrireJson, lireJson } from "./lib/commun";
import { type CtxDossierPlus, type Dossier, amendementsDuSujet, coupure, positionsDepuisAmendements, positionsDepuisScrutins, scrutinsLies } from "./lib/sujet";
import { construirePivots } from "./pivots";
import { construireDecideurs, construireEtat, construireGroupesAction, construireTexte, etapeEtActes } from "./definitif";
import { execSync } from "node:child_process";
import { construireVerdict } from "./verdict";

const provisoire = process.argv.includes("--provisoire");
const dossierArg = process.argv.indexOf("--dossier");
const dossierId = dossierArg >= 0 ? process.argv[dossierArg + 1] : undefined;
if (dossierArg >= 0 && !dossierId) throw new Error("--dossier attend un identifiant");
const FIX = join(DATA, "..", "contracts", "fixtures");
const config = lireJson(join(DATA, "config.json")) ?? lireJson(join(FIX, "config.json"));
const groupesJ = lireJson(join(DATA, "groupes.json")) ?? lireJson(join(FIX, "groupes.json"));
const deputesJ = lireJson(join(DATA, "deputes.json")) ?? lireJson(join(FIX, "deputes.json"));
const groupes = new Map<string, { sigle: string; effectif: number }>(groupesJ.groupes.map((g: any) => [g.id, { sigle: g.sigle, effectif: g.effectif }]));
const deputes = new Map<string, any>(deputesJ.deputes.map((d: any) => [d.id, d]));
const scrutins = chargerScrutins();

/** Président de la commission des finances (organe PO59048) dans le répertoire des mandats. */
function presidentCF(): string | null {
  const dir = join(CACHE, "amo", "json", "acteur");
  if (!existsSync(dir)) {
    try { execSync(`unzip -qo "${join(RAW, "AMO10_deputes_actifs_mandats_actifs_organes.json.zip")}" -d "${join(CACHE, "amo")}"`); } catch { return null; }
  }
  if (!existsSync(dir)) return null;
  for (const f of readdirSync(dir)) {
    const a = JSON.parse(readFileSync(join(dir, f), "utf8")).acteur;
    const ms = a.mandats?.mandat;
    for (const m of Array.isArray(ms) ? ms : [ms]) {
      const q = m?.infosQualite?.codeQualite ?? "";
      if (m?.organes?.organeRef === "PO59048" && q === "Président") return a.uid?.["#text"] ?? null;
    }
  }
  return null;
}
const PRES_CF = presidentCF();

function rapporteurs(dossier: any): { pa: string; type: string }[] {
  const res: { pa: string; type: string }[] = [];
  const walk = (x: any) => {
    if (!x) return;
    for (const a of Array.isArray(x) ? x : [x]) {
      if (a.acteLegislatif) { walk(a.acteLegislatif); continue; }
      if (String(a.codeActe ?? "").startsWith("AN1") && a.rapporteurs) {
        const r = a.rapporteurs.rapporteur;
        for (const y of Array.isArray(r) ? r : [r]) if (y?.acteurRef) res.push({ pa: y.acteurRef, type: y.typeRapporteur });
      }
      if (a.actesLegislatifs) walk(a.actesLegislatifs);
    }
  };
  walk(dossier?.actesLegislatifs);
  return res;
}

export function contexte(d: Dossier): CtxDossierPlus {
  const { avant, depot } = coupure(d);
  const amdts = amendementsDuSujet(d);
  const lies = scrutinsLies(d, scrutins, amdts, avant);
  // Seuls les groupes de groupes.json comptent (un ancien groupe dissous n'a plus de sièges).
  const garder = (m: Map<string, any>) => new Map([...m].filter(([g]) => groupes.has(g)));
  const posS = garder(positionsDepuisScrutins(lies));
  const posA = garder(positionsDepuisAmendements(amdts, depot));
  const sourcePositions = posS.size >= 3 ? "scrutins" : posA.size > 0 ? "amendements" : "aucune";
  const positions = sourcePositions === "scrutins" ? posS : posA;
  const texteRaw = lireJson(join(DATA, "raw", d.id, "texte.json"));
  const titre = texteRaw?.dossier?.titreDossier?.titre ?? texteRaw?.document?.titres?.titrePrincipal ?? d.label;
  const ctx: CtxDossierPlus = {
    d, scrutins, lies, amdts, positions, sourcePositions, groupes, deputes, texteRaw,
    titreTexte: titre.replace(/^./, (c: string) => c.toUpperCase()),
    etape: "",
    rapporteurs: rapporteurs(texteRaw?.dossier),
    presidentCF: PRES_CF,
    natures: new Map(),
  };
  ctx.etape = etapeEtActes(ctx).etape;
  return ctx;
}

const resume: string[] = [];
const dossiers = (config.dossiers as Dossier[]).filter((d) => !dossierId || d.id === dossierId);
if (dossierId && dossiers.length === 0) throw new Error(`Dossier inconnu : ${dossierId}`);
for (const d of dossiers) {
  const ctx = contexte(d);
  const pivots = construirePivots(ctx, provisoire ? "general" : "auto");
  ecrireJson(join(DATA, d.id, "pivots.json"), pivots);
  if (!provisoire) {
    const texte = await construireTexte(ctx);
    const etat = construireEtat(ctx);
    const ga = construireGroupesAction(ctx, construireDecideurs(ctx));
    ecrireJson(join(DATA, d.id, "texte.json"), texte);
    ecrireJson(join(DATA, d.id, "etat.json"), etat);
    ecrireJson(join(DATA, d.id, "groupes-action.json"), ga);
    ecrireJson(join(DATA, d.id, "verdict.json"), await construireVerdict(ctx, etat, texte, ga));
  }
  const parSens = { pour: 0, contre: 0, inconnu: 0 };
  for (const s of ctx.lies) parSens[s.sens > 0 ? "pour" : s.sens < 0 ? "contre" : "inconnu"]++;
  const pos = [...groupes.keys()].map((g) => `${groupes.get(g)!.sigle} ${ctx.positions.get(g)?.position ?? "?"}`).join(", ");
  resume.push(
    `${d.id} : ${ctx.lies.length} scrutins nominatifs liés (${parSens.pour} portent la mesure, ${parSens.contre} la combattent, ${parSens.inconnu} sens non lu) ; ` +
      `positions depuis ${ctx.sourcePositions} : ${pos} ; ${pivots.deputes.length} pivots (${pivots.deputes[0]?.base ?? "-"}).`,
  );
}
console.log(resume.join("\n"));
