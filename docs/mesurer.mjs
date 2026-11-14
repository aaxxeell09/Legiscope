// État mesuré du dépôt : lit data/ et écrit un rapport Markdown sur la sortie standard.
// Usage : node docs/mesurer.mjs [--commandes] > docs/ETAT.md
// Sans dépendance. Avec --commandes, lance aussi les commandes de vérification et note leur code de sortie.
// Aucun chiffre de docs/ETAT.md n'est écrit à la main : tout vient de ce script.

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const DATA = "data";
const lire = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
const liste = (d) => (existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")) : []);
const compter = (valeurs) => {
  const m = new Map();
  for (const v of valeurs) m.set(v ?? "absent", (m.get(v ?? "absent") ?? 0) + 1);
  return [...m].sort().map(([k, n]) => `${k} ${n}`).join(", ") || "aucun";
};
const pct = (x) => (typeof x === "number" ? `${Math.round(x * 100)} %` : "sans objet");
const table = (entetes, lignes) =>
  [`| ${entetes.join(" | ")} |`, `|${entetes.map(() => "---").join("|")}|`, ...lignes.map((l) => `| ${l.join(" | ")} |`)].join("\n");
const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  return { code: r.status, sortie: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
};

const config = lire(join(DATA, "config.json"));
const dossiers = config?.dossiers ?? [];
const PRINCIPAUX = ["verdict.json", "nouveautes.json", "suite.json", "action.json", "note.json", "etat.json", "texte.json", "pivots.json", "groupes-action.json", "arguments.json", "hatvp.json", "fiches/index.json", "publication.json"];

const commit = sh("git", ["rev-parse", "--short", "HEAD"]);
const quand = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" });

const out = [];
out.push("# État mesuré du dépôt");
out.push("");
out.push(`Fichier généré par \`node docs/mesurer.mjs --commandes > docs/ETAT.md\`, le ${quand} (heure de Paris)${commit.code === 0 ? `, à partir du commit \`${commit.sortie}\`` : ""}. Aucun chiffre n'est écrit à la main. Si \`data/\` change, relancer la commande.`);
out.push("");
out.push(`Produit : ${config?.produit?.nom ?? "?"}. Dossiers déclarés dans \`data/config.json\` : ${dossiers.length}.`);

// 1. Dossiers
out.push("", "## Dossiers", "");
out.push(table(["Identifiant", "Client d'exemple", "État", "Date de référence", "Fichiers principaux présents", "Manquants"], dossiers.map((d) => {
  const manquants = PRINCIPAUX.filter((f) => !existsSync(join(DATA, d.id, f)));
  return [`\`${d.id}\``, d.client, d.etat, d.date_reference ?? "aucune (dossier en cours)", `${PRINCIPAUX.length - manquants.length} sur ${PRINCIPAUX.length}`, manquants.join(", ") || "aucun"];
})));

// 2. Verdict
out.push("", "## Verdict de l'objectif principal", "");
out.push("Règle du projet (`pipeline/pivots/verdict.ts`), pas une prédiction validée.", "");
out.push(table(["Dossier", "Situation", "Score", "Tendance", "Confiance", "Rédaction de la lecture"], dossiers.map((d) => {
  const v = lire(join(DATA, d.id, "verdict.json"))?.verdicts?.find((x) => x.objectif_rang === 1);
  const lecture = v?.lecture;
  const mode = lecture && typeof lecture === "object" ? lecture.mode ?? "?" : "texte simple";
  return [`\`${d.id}\``, v?.situation ?? "absent", pct(v?.score), v?.tendance ?? "absent", v?.confiance?.niveau ?? "absent", mode];
})));

// 3. Amendements et Orcet
out.push("", "## Amendements de la mesure et prédictions Orcet", "");
out.push("Une prédiction Orcet est la moyenne des probabilités individuelles de voter pour un amendement. Ce n'est pas une probabilité d'adoption.", "");
out.push(table(["Dossier", "Amendements", "En attente", "Avec prédiction Orcet", "Valeurs", "Lignes Orcet dans le bloc Suite"], dossiers.map((d) => {
  const am = lire(join(DATA, d.id, "texte.json"))?.amendements ?? [];
  const pred = am.filter((a) => a.prediction && typeof a.prediction.proba_pour === "number").map((a) => a.prediction.proba_pour);
  const suite = (lire(join(DATA, d.id, "suite.json"))?.probables ?? []).filter((p) => typeof p.proba === "number").length;
  const valeurs = pred.length ? `${pct(Math.min(...pred))} à ${pct(Math.max(...pred))}` : "aucune";
  return [`\`${d.id}\``, am.length, am.filter((a) => a.sort === "en_attente").length, pred.length, valeurs, suite];
})));

// 4. Nouveautés et positions
out.push("", "## Nouveautés et positions des députés", "");
out.push(table(["Dossier", "Événements", "Dont de plus haute importance", "Sur qui agir", "Alliés", "Perdus", "Position inconnue", "Décideurs"], dossiers.map((d) => {
  const ev = lire(join(DATA, d.id, "nouveautes.json"))?.evenements ?? [];
  const max = ev.length ? Math.max(...ev.map((e) => e.importance ?? 0)) : 0;
  const ga = lire(join(DATA, d.id, "groupes-action.json")) ?? {};
  const n = (k) => (Array.isArray(ga[k]) ? ga[k].length : "absent");
  return [`\`${d.id}\``, ev.length, ev.filter((e) => e.importance === max).length, n("actionnables"), n("allies"), n("perdus"), n("position_inconnue"), n("decideurs")];
})));

// 5. Modèle, gabarit, règles
out.push("", "## Qui a produit quoi : modèle de langage, gabarit ou règles", "");
out.push("Champ `mode` de chaque texte (`llm` : rédigé par le modèle et vérifié ; `gabarit` : produit sans modèle). Méthode de classement des arguments lue dans `meta.limits` de `arguments.json`.", "");
out.push(table(["Dossier", "Compte rendu", "Synthèses de fiche député", "Réponses aux arguments", "Arguments pour / contre", "Classement des arguments"], dossiers.map((d) => {
  const note = lire(join(DATA, d.id, "note.json"));
  const fiches = liste(join(DATA, d.id, "fiches")).filter((f) => f !== "index.json").map((f) => lire(join(DATA, d.id, "fiches", f))?.synthese?.mode);
  const action = lire(join(DATA, d.id, "action.json"));
  const args = lire(join(DATA, d.id, "arguments.json"));
  const limites = [args?.meta?.limits ?? ""].flat().join(" ").toLowerCase();
  const methode = !args ? "absent" : /par le mod[èe]le/.test(limites) ? "modèle de langage" : /r[èe]gles? de mots|heuristique|mots-cl[ée]s/.test(limites) ? "règles de mots" : "non précisé";
  return [`\`${d.id}\``, note ? `${note.mode}${note.verifie ? ", nombres vérifiés" : ""}` : "absent", compter(fiches), compter((action?.contre_arguments ?? []).map((c) => c.mode)), args ? `${(args.pour ?? []).length} / ${(args.contre ?? []).length}` : "absent", methode];
})));

// 6. Fichiers par député et HATVP
out.push("", "## Fichiers par député et HATVP", "");
out.push(table(["Dossier", "Fiches", "Auditions", "Débats", "Amendements par député", "Organisations HATVP"], dossiers.map((d) => {
  const n = (s) => liste(join(DATA, d.id, s)).filter((f) => f !== "index.json").length;
  return [`\`${d.id}\``, n("fiches"), n("auditions"), n("debats"), n("amendements"), (lire(join(DATA, d.id, "hatvp.json"))?.organisations ?? []).length];
})));

// 7. Preuves
out.push("", "## Nature des preuves", "");
const natures = (o, acc) => {
  if (Array.isArray(o)) o.forEach((x) => natures(x, acc));
  else if (o && typeof o === "object") {
    if (o.preuve && typeof o.preuve.nature === "string") acc.push(o.preuve.nature);
    Object.values(o).forEach((x) => natures(x, acc));
  }
  return acc;
};
out.push(table(["Dossier", "Preuves dans verdict, nouveautés, suite, action, état"], dossiers.map((d) => {
  const acc = [];
  for (const f of ["verdict.json", "nouveautes.json", "suite.json", "action.json", "etat.json"]) natures(lire(join(DATA, d.id, f)), acc);
  return [`\`${d.id}\``, compter(acc)];
})));

// 8. Sceau de publication
out.push("", "## Sceau de publication", "");
out.push("`pipeline/publication.mjs` enregistre l'empreinte SHA-256 des fichiers principaux dans `publication.json`. Le sceau est valide si aucun fichier n'a changé depuis.", "");
out.push(table(["Dossier", "Publié le", "Fichiers scellés", "État du sceau"], dossiers.map((d) => {
  const pub = lire(join(DATA, d.id, "publication.json"));
  if (!pub) return [`\`${d.id}\``, "absent", 0, "pas de sceau"];
  const modifies = Object.entries(pub.fichiers ?? {}).filter(([f, info]) => {
    const chemin = join(DATA, d.id, f);
    return !existsSync(chemin) || createHash("sha256").update(readFileSync(chemin)).digest("hex") !== info.sha256;
  }).map(([f]) => f);
  return [`\`${d.id}\``, pub.published_at ?? "?", Object.keys(pub.fichiers ?? {}).length, modifies.length ? `à refaire : ${modifies.join(", ")}` : "valide"];
})));

// 9. Commandes
if (process.argv.includes("--commandes")) {
  out.push("", "## Commandes de vérification", "");
  out.push(`Lancées par ce script. Versions : Node ${process.version}, Bun ${sh("bun", ["--version"]).sortie || "absent"}.`, "");
  const cmds = [
    ["npm run typecheck", "npm", ["run", "typecheck"]],
    ["bun qa/check.ts --root data", "bun", ["qa/check.ts", "--root", "data"]],
    ["bun qa/check.ts --root contracts/fixtures", "bun", ["qa/check.ts", "--root", "contracts/fixtures"]],
    ["node pipeline/publication.mjs --check", "node", ["pipeline/publication.mjs", "--check"]],
    ["bun test", "bun", ["test"]],
    ["npm run build", "npm", ["run", "build"]],
  ];
  out.push(table(["Commande", "Code de sortie", "Dernière ligne utile"], cmds.map(([nom, c, a]) => {
    const r = sh(c, a);
    const lignes = r.sortie.split("\n").map((l) => l.trim()).filter(Boolean);
    const utile = [...lignes].reverse().find((l) => /OK |ÉCHEC|\bpass\b|\bfail\b|erreur|built in|Ran /i.test(l)) ?? lignes.at(-1) ?? "aucune sortie";
    return [`\`${nom}\``, r.code, utile.replace(/\|/g, "/").replace(/\u001b\[[0-9;]*m/g, "").slice(0, 160)];
  })));
}

console.log(out.join("\n"));
