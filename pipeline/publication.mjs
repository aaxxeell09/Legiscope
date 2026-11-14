// Scelle un lot de JSON déjà générés, sans déplacer les chemins consommés par le front.
// Une modification ultérieure d'un fichier invalide le sceau et bloque le build.
// Publication normale : bun run publish:data (validation Zod/croisée, puis sceau).
// Bas niveau : node pipeline/publication.mjs [--check] [--root data] [--dossier id]

import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const FICHIERS = [
  "verdict.json",
  "nouveautes.json",
  "suite.json",
  "action.json",
  "note.json",
  "etat.json",
  "texte.json",
  "pivots.json",
  "hatvp.json",
  "fiches/index.json",
];

function options(argv) {
  let root = "data";
  let dossier = null;
  let check = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--check") check = true;
    else if (arg === "--root") root = argv[++i] ?? root;
    else if (arg.startsWith("--root=")) root = arg.slice(7);
    else if (arg === "--dossier") dossier = argv[++i] ?? null;
    else if (arg.startsWith("--dossier=")) dossier = arg.slice(10);
    else throw new Error(`argument inconnu : ${arg}`);
  }
  return { root: resolve(root), dossier, check };
}

function lireJson(chemin) {
  try {
    return JSON.parse(readFileSync(chemin, "utf8"));
  } catch (error) {
    throw new Error(`${chemin} : JSON illisible (${String(error)})`);
  }
}

const sha256 = (contenu) => createHash("sha256").update(contenu).digest("hex");

function inventaire(root, dossierId) {
  const fichiers = {};
  for (const relatif of FICHIERS) {
    const chemin = join(root, dossierId, relatif);
    if (!existsSync(chemin)) throw new Error(`${chemin} : fichier requis manquant`);
    const contenu = readFileSync(chemin);
    const json = lireJson(chemin);
    if (json?.meta?.dossier_id !== dossierId) {
      throw new Error(`${chemin} : meta.dossier_id=${JSON.stringify(json?.meta?.dossier_id)}, attendu ${dossierId}`);
    }
    if (typeof json?.meta?.generated_at !== "string" || typeof json?.meta?.producer !== "string") {
      throw new Error(`${chemin} : métadonnées de production absentes`);
    }
    fichiers[relatif] = {
      sha256: sha256(contenu),
      generated_at: json.meta.generated_at,
      producer: json.meta.producer,
    };
  }
  return fichiers;
}

function verifier(root, dossierId) {
  const chemin = join(root, dossierId, "publication.json");
  if (!existsSync(chemin)) throw new Error(`${chemin} : sceau de publication absent`);
  const manifeste = lireJson(chemin);
  if (manifeste.version !== 1 || manifeste.dossier_id !== dossierId) {
    throw new Error(`${chemin} : manifeste incompatible`);
  }
  const actuel = inventaire(root, dossierId);
  for (const relatif of FICHIERS) {
    const publie = manifeste.fichiers?.[relatif];
    if (!publie) throw new Error(`${chemin} : ${relatif} absent du manifeste`);
    if (publie.sha256 !== actuel[relatif].sha256) {
      throw new Error(`${join(root, dossierId, relatif)} : modifié depuis la publication`);
    }
    if (publie.generated_at !== actuel[relatif].generated_at || publie.producer !== actuel[relatif].producer) {
      throw new Error(`${join(root, dossierId, relatif)} : métadonnées différentes du manifeste`);
    }
  }
  return manifeste;
}

function executer(command, args) {
  return spawnSync(command, args, { cwd: process.cwd(), encoding: "utf8", stdio: "pipe" });
}

/** Validation Zod et croisée ciblée. Bun est préféré ; Rolldown+Node assure le même contrôle localement. */
function validerAvantPublication(root, dossierId) {
  const args = ["qa/check.ts", "--root", root, "--dossier", dossierId];
  let resultat = executer("bun", args);
  if (resultat.error?.code === "ENOENT") {
    const temporaire = mkdtempSync(join(tmpdir(), "legiscope-publication-"));
    const bundle = join(temporaire, "check.mjs");
    const rolldown = resolve("node_modules/.bin/rolldown");
    const compilation = executer(rolldown, ["qa/check.ts", "--platform", "node", "--format", "esm", "--file", bundle]);
    if (compilation.status !== 0) {
      rmSync(temporaire, { recursive: true, force: true });
      throw new Error(`validation impossible : ${compilation.stderr || compilation.stdout}`);
    }
    resultat = executer(process.execPath, [bundle, "--root", root, "--dossier", dossierId]);
    rmSync(temporaire, { recursive: true, force: true });
  }
  if (resultat.status !== 0) throw new Error(`validation QA refusée :\n${resultat.stdout}${resultat.stderr}`);
  process.stdout.write(resultat.stdout);
}

function publier(root, dossierId) {
  validerAvantPublication(root, dossierId);
  const fichiers = inventaire(root, dossierId);
  const manifeste = {
    version: 1,
    dossier_id: dossierId,
    published_at: new Date().toISOString(),
    fichiers,
  };
  const chemin = join(root, dossierId, "publication.json");
  const temporaire = join(dirname(chemin), `.publication-${process.pid}.tmp`);
  writeFileSync(temporaire, `${JSON.stringify(manifeste, null, 2)}\n`, { flag: "wx" });
  renameSync(temporaire, chemin);
  return manifeste;
}

const { root, dossier, check } = options(process.argv.slice(2));
const config = lireJson(join(root, "config.json"));
const declares = (config.dossiers ?? []).map((item) => item.id).filter((id) => !dossier || id === dossier);
const complet = (id) => FICHIERS.every((relatif) => existsSync(join(root, id, relatif)));
const dossiers = declares.filter((id) => {
  if (complet(id)) return true;
  if (dossier || existsSync(join(root, id, "publication.json"))) return true;
  console.warn(`IGNORÉ ${id} : dossier encore incomplet, aucun sceau existant`);
  return false;
});
if (dossiers.length === 0) throw new Error(`aucun dossier à ${check ? "vérifier" : "publier"}`);

let erreurs = 0;
for (const id of dossiers) {
  try {
    const manifeste = check ? verifier(root, id) : publier(root, id);
    console.log(`${check ? "OK" : "PUBLIÉ"} ${id} ${manifeste.published_at}`);
  } catch (error) {
    erreurs += 1;
    console.error(`ÉCHEC ${id} : ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (erreurs > 0) process.exit(1);

