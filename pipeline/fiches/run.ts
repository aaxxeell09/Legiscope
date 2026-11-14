// Session A4 : fiches par député, fiches/index.json, nouveautes.json, action.json.
// Usage : bun run fiches [--root data] [--dossier <id>] [--gabarit]
// Rejouable : tout est régénéré depuis les fichiers des autres producteurs.

import { SCHEMAS, dataPath } from "../../contracts/index";
import { construireAction, lireArguments } from "./lib/action";
import { chargerContexte } from "./lib/contexte";
import { construireFiches } from "./lib/fiches";
import { lireJsonBrut, lireKind, noter, rapport } from "./lib/io";
import { construireNouveautes } from "./lib/nouveautes";
import { forcerGabarit, raisonDuGabarit } from "./lib/redaction";

function args() {
  const a = process.argv.slice(2);
  let root = "data";
  let dossier: string | null = null;
  let gabarit = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--root") root = a[++i] ?? root;
    else if (a[i].startsWith("--root=")) root = a[i].slice(7);
    else if (a[i] === "--dossier") dossier = a[++i] ?? null;
    else if (a[i].startsWith("--dossier=")) dossier = a[i].slice(10);
    else if (a[i] === "--gabarit") gabarit = true;
    else {
      console.error(`argument inconnu : ${a[i]}\nusage : bun run fiches [--root data] [--dossier <id>] [--gabarit]`);
      process.exit(2);
    }
  }
  return { root: root.replace(/\/$/, ""), dossier, gabarit };
}

async function main() {
  const { root, dossier: seul, gabarit } = args();
  forcerGabarit(gabarit);
  const config = lireKind(root, null, "config");
  const groupes = lireKind(root, null, "groupes");
  const deputes = lireKind(root, null, "deputes");
  if (!config || !groupes || !deputes) {
    console.error(`${root} : config.json, groupes.json ou deputes.json manquant ou invalide`);
    process.exit(1);
  }
  const dossiers = config.dossiers.filter((d) => !seul || d.id === seul);
  if (dossiers.length === 0) {
    console.error(`dossier inconnu : ${seul}`);
    process.exit(1);
  }
  let erreurs = 0;
  for (const d of dossiers) {
    noter(`— ${d.id} (date de référence : ${d.date_reference ?? "aucune"}, pivot de démo : ${d.pivot_demo ?? "aucun"})`);
    const ctx = chargerContexte(root, config, groupes, deputes, d);
    if (!ctx.pivots) noter(`! ${d.id} : pivots.json manquant, aucune fiche possible`);
    const index = await construireFiches(ctx);
    const argumentsEntendus = lireArguments(ctx, []);
    construireNouveautes(ctx, argumentsEntendus);
    await construireAction(ctx, index);

    // Relecture : chaque fichier écrit passe son schéma.
    const verifs: [string, keyof typeof SCHEMAS][] = [
      [dataPath(d.id, "fiches-index", undefined, root), "fiches-index"],
      [dataPath(d.id, "nouveautes", undefined, root), "nouveautes"],
      [dataPath(d.id, "action", undefined, root), "action"],
      ...index.disponibles.map((pa) => [dataPath(d.id, "fiche", pa, root), "fiche"] as [string, keyof typeof SCHEMAS]),
    ];
    for (const [chemin, kind] of verifs) {
      const r = SCHEMAS[kind].safeParse(lireJsonBrut(chemin));
      if (!r.success) {
        erreurs += 1;
        for (const i of r.error.issues.slice(0, 5)) noter(`✗ ${chemin} | ${i.path.join(".")} | ${i.message}`);
      }
    }
  }
  if (raisonDuGabarit()) noter(`rédaction : gabarit (${raisonDuGabarit()})`);
  noter(erreurs === 0 ? `OK : fichiers écrits sous ${root}/ (lancer bun run check)` : `${erreurs} fichier(s) invalide(s)`);
  process.exit(erreurs === 0 ? 0 : 1);
}

main();
