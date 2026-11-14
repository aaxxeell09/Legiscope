// Validation de data/ (ou des fixtures) : schémas zod puis intégrité croisée.
// Usage : bun qa/check.ts [--root data|contracts/fixtures] (défaut : les deux)
// Code de sortie 1 dès qu'une erreur est trouvée. Chaque erreur : fichier | champ | valeur.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ZodTypeAny } from "zod";
import {
  SCHEMAS, dataPath,
  type Kind, type Config, type Groupes, type Deputes, type Cohesion, type Texte, type Pivots, type Auditions,
  type Debats, type Amendements, type Hatvp, type Fiche, type FichesIndex, type Note, type Verdict,
  type Nouveautes, type Suite, type Action, type Etat,
} from "../contracts/index";
import { verifierChiffres } from "./verif";
import { verifierCroise } from "./croise";

type Erreur = { fichier: string; champ: string; valeur: unknown; message?: string };
const erreurs: Erreur[] = [];
const avertissements: string[] = [];
let fichiersValides = 0;

function erreur(fichier: string, champ: string, valeur: unknown, message?: string) {
  erreurs.push({ fichier, champ, valeur, message });
}

function valeurA(obj: unknown, path: (string | number)[]): unknown {
  let cur: any = obj;
  for (const p of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p as any];
  }
  return cur;
}

function fmt(v: unknown): string {
  if (v === undefined) return "(absent)";
  const s = JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 77) + "..." : s;
}

/** Lit et valide un fichier. Renvoie null (et enregistre l'erreur) s'il manque ou s'il est invalide. */
function charger<T>(fichier: string, kind: Kind, obligatoire = true): T | null {
  if (!existsSync(fichier)) {
    if (obligatoire) erreur(fichier, "(fichier)", undefined, "fichier manquant");
    return null;
  }
  let brut: unknown;
  try {
    brut = JSON.parse(readFileSync(fichier, "utf8"));
  } catch (e) {
    erreur(fichier, "(json)", String(e), "JSON illisible");
    return null;
  }
  const res = (SCHEMAS[kind] as ZodTypeAny).safeParse(brut);
  if (!res.success) {
    for (const issue of res.error.issues) {
      erreur(fichier, issue.path.join(".") || "(racine)", valeurA(brut, issue.path), issue.message);
    }
    return null;
  }
  fichiersValides += 1;
  return res.data as T;
}

function verifierMeta(fichier: string, obj: { meta?: { dossier_id: string | null } } | null, attendu: string | null) {
  if (!obj || !obj.meta) return;
  if (obj.meta.dossier_id !== attendu) erreur(fichier, "meta.dossier_id", obj.meta.dossier_id, `attendu ${fmt(attendu)}`);
}

function verifierTexteChiffres(fichier: string, champ: string, texte: string, autorises: string[]) {
  const r = verifierChiffres(texte, autorises);
  if (!r.ok) erreur(fichier, champ, r.fautifs, "nombre absent de chiffres_utilises");
}

function verifierRoot(root: string) {
  if (!existsSync(root)) {
    erreur(root, "(dossier)", undefined, "racine introuvable");
    return;
  }
  const p = (dossier: string | null, kind: Kind, pa?: string) => dataPath(dossier, kind, pa, root);

  const config = charger<Config>(p(null, "config"), "config");
  const groupes = charger<Groupes>(p(null, "groupes"), "groupes");
  const deputes = charger<Deputes>(p(null, "deputes"), "deputes");
  const cohesion = charger<Cohesion>(p(null, "cohesion"), "cohesion");
  verifierMeta(p(null, "config"), config, null);
  verifierMeta(p(null, "groupes"), groupes, null);
  verifierMeta(p(null, "deputes"), deputes, null);
  verifierMeta(p(null, "cohesion"), cohesion, null);

  const groupeIds = new Set((groupes?.groupes ?? []).map((g) => g.id));
  const deputeIds = new Set((deputes?.deputes ?? []).map((d) => d.id));
  const dossierIds = new Set((config?.dossiers ?? []).map((d) => d.id));

  const groupeExiste = (fichier: string, champ: string, id: string | null | undefined) => {
    if (id !== null && id !== undefined && !groupeIds.has(id)) erreur(fichier, champ, id, "groupe_id absent de groupes.json");
  };
  const deputeExiste = (fichier: string, champ: string, id: string | null | undefined) => {
    if (id !== null && id !== undefined && !deputeIds.has(id)) erreur(fichier, champ, id, "identifiant absent de deputes.json");
  };

  // deputes.json
  deputes?.deputes.forEach((d, i) => groupeExiste(p(null, "deputes"), `deputes.${i}.groupe_id`, d.groupe_id));

  // cohesion.json
  if (cohesion) {
    const f = p(null, "cohesion");
    cohesion.pairs.forEach((pair, i) => {
      groupeExiste(f, `pairs.${i}.a`, pair.a);
      groupeExiste(f, `pairs.${i}.b`, pair.b);
    });
    cohesion.signals.forEach((s, i) => {
      groupeExiste(f, `signals.${i}.pair.0`, s.pair[0]);
      groupeExiste(f, `signals.${i}.pair.1`, s.pair[1]);
    });
    cohesion.events.forEach((e, i) => {
      if (e.dossier_id && !dossierIds.has(e.dossier_id)) erreur(f, `events.${i}.dossier_id`, e.dossier_id, "dossier absent de config.json");
    });
  }

  // config.json
  if (config) {
    const f = p(null, "config");
    if (!dossierIds.has(config.dossier_demo)) erreur(f, "dossier_demo", config.dossier_demo, "dossier absent de config.dossiers");
    config.cohesion.paires_demo.forEach((pair, i) => {
      groupeExiste(f, `cohesion.paires_demo.${i}.0`, pair[0]);
      groupeExiste(f, `cohesion.paires_demo.${i}.1`, pair[1]);
    });
    config.dossiers.forEach((d, i) => deputeExiste(f, `dossiers.${i}.pivot_demo`, d.pivot_demo));

    // Sous-dossiers présents <=> dossiers déclarés (data/raw/ exclu).
    const presents = readdirSync(root).filter((n) => !n.startsWith(".") && n !== "raw" && statSync(join(root, n)).isDirectory());
    for (const n of presents) if (!dossierIds.has(n)) erreur(join(root, n), "(dossier)", n, "sous-dossier présent mais absent de config.dossiers");
    for (const d of config.dossiers) if (!presents.includes(d.id)) erreur(join(root, d.id), "(dossier)", d.id, "dossier déclaré dans config.json mais sous-dossier absent");
  }

  for (const dossier of config?.dossiers ?? []) {
    const id = dossier.id;
    if (!existsSync(join(root, id))) continue;

    const texte = charger<Texte>(p(id, "texte"), "texte");
    const pivots = charger<Pivots>(p(id, "pivots"), "pivots");
    const hatvp = charger<Hatvp>(p(id, "hatvp"), "hatvp");
    const note = charger<Note>(p(id, "note"), "note");
    const index = charger<FichesIndex>(p(id, "fiches-index"), "fiches-index");
    const verdict = charger<Verdict>(p(id, "verdict"), "verdict");
    const nouveautes = charger<Nouveautes>(p(id, "nouveautes"), "nouveautes");
    const suite = charger<Suite>(p(id, "suite"), "suite");
    const action = charger<Action>(p(id, "action"), "action");
    const etat = charger<Etat>(p(id, "etat"), "etat");
    // Intermédiaires (P3 et A2) : validés au schéma et au meta, comme les autres.
    const groupesAction = charger<unknown>(p(id, "groupes-action"), "groupes-action");
    const argumentsEntendus = charger<unknown>(p(id, "arguments"), "arguments");
    for (const [kind, obj] of [["texte", texte], ["pivots", pivots], ["hatvp", hatvp], ["note", note], ["fiches-index", index], ["verdict", verdict], ["nouveautes", nouveautes], ["suite", suite], ["action", action], ["etat", etat], ["groupes-action", groupesAction], ["arguments", argumentsEntendus]] as const) {
      verifierMeta(p(id, kind), obj as any, id);
    }

    // texte.json
    if (texte) {
      const f = p(id, "texte");
      if (texte.texte.id !== dossier.texte_id) erreur(f, "texte.id", texte.texte.id, `attendu ${fmt(dossier.texte_id)} (config.dossiers.texte_id)`);
      texte.positions.forEach((po, i) => groupeExiste(f, `positions.${i}.groupe_id`, po.groupe_id));
      texte.amendements.forEach((a, i) => {
        groupeExiste(f, `amendements.${i}.groupe_id`, a.groupe_id);
        deputeExiste(f, `amendements.${i}.auteur_id`, a.auteur_id);
        a.cosignataires_ids.forEach((c, j) => deputeExiste(f, `amendements.${i}.cosignataires_ids.${j}`, c));
      });
    }

    // pivots.json et fichiers par député
    const pivotIds = new Set<string>();
    const disponibles = new Set(index?.disponibles ?? []);
    const absents = new Set(index?.absents ?? []);
    if (index) {
      const f = p(id, "fiches-index");
      for (const pa of disponibles) if (absents.has(pa)) erreur(f, "absents", pa, "à la fois dans disponibles et absents");
      for (const pa of [...disponibles, ...absents]) deputeExiste(f, "disponibles/absents", pa);
      for (const pa of disponibles) if (!existsSync(p(id, "fiche", pa))) erreur(f, "disponibles", pa, "fiche listée disponible mais fichier absent");
    }
    if (pivots) {
      const f = p(id, "pivots");
      pivots.deputes.forEach((pv, i) => {
        pivotIds.add(pv.id);
        deputeExiste(f, `deputes.${i}.id`, pv.id);
        groupeExiste(f, `deputes.${i}.groupe_id`, pv.groupe_id);
        pv.ecarts.forEach((e, j) => groupeExiste(f, `deputes.${i}.ecarts.${j}.groupe_id_au_vote`, e.groupe_id_au_vote));

        const auditions = charger<Auditions>(p(id, "auditions", pv.id), "auditions");
        const debats = charger<Debats>(p(id, "debats", pv.id), "debats");
        const amendements = charger<Amendements>(p(id, "amendements", pv.id), "amendements");
        for (const [kind, obj] of [["auditions", auditions], ["debats", debats], ["amendements", amendements]] as const) {
          verifierMeta(p(id, kind, pv.id), obj as any, id);
          if (obj && obj.depute_id !== pv.id) erreur(p(id, kind, pv.id), "depute_id", obj.depute_id, `attendu ${pv.id} (nom du fichier)`);
        }

        // Fiche : obligatoire sauf si le pivot est listé dans absents.
        const fichierFiche = p(id, "fiche", pv.id);
        if (index && !disponibles.has(pv.id) && !absents.has(pv.id)) erreur(p(id, "fiches-index"), "disponibles/absents", pv.id, "pivot ni disponible ni absent dans fiches/index.json");
        if (absents.has(pv.id)) {
          if (existsSync(fichierFiche)) avertissements.push(`${fichierFiche} existe mais le pivot est listé dans absents`);
          return;
        }
        const fiche = charger<Fiche>(fichierFiche, "fiche");
        if (!fiche) return;
        verifierMeta(fichierFiche, fiche, id);
        if (fiche.depute_id !== pv.id) erreur(fichierFiche, "depute_id", fiche.depute_id, `attendu ${pv.id}`);
        // Fusion pure des trois producteurs et de hatvp.json.
        const memes = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
        if (auditions && !memes(fiche.auditions, auditions.auditions)) erreur(fichierFiche, "auditions", "(différent)", `diffère de ${p(id, "auditions", pv.id)}`);
        if (debats && !memes(fiche.debats, debats.debats)) erreur(fichierFiche, "debats", "(différent)", `diffère de ${p(id, "debats", pv.id)}`);
        if (amendements && !memes(fiche.amendements, amendements.amendements)) erreur(fichierFiche, "amendements", "(différent)", `diffère de ${p(id, "amendements", pv.id)}`);
        if (hatvp && !memes(fiche.hatvp, hatvp.organisations)) erreur(fichierFiche, "hatvp", "(différent)", `diffère de ${p(id, "hatvp")}`);
        if (auditions && debats) {
          const attendu = { ...auditions.couverture, ...debats.couverture };
          if (!memes(fiche.couverture, attendu)) erreur(fichierFiche, "couverture", fiche.couverture, `attendu ${fmt(attendu)}`);
        }
        if (fiche.synthese) {
          verifierTexteChiffres(fichierFiche, "synthese.chiffres_utilises", `${fiche.synthese.position_probable} ${fiche.synthese.argument}`, fiche.synthese.chiffres_utilises);
          if (fiche.synthese.mode === "gabarit" && fiche.synthese.modele !== null) erreur(fichierFiche, "synthese.modele", fiche.synthese.modele, "doit être null en mode gabarit");
        }
      });
      if (index) {
        const f = p(id, "fiches-index");
        // Une fiche peut exister pour tout député suivi : pivots.json ou groupes-action.json (actionnables, alliés, perdus).
        const ga = groupesAction as { actionnables?: { depute_id: string }[]; allies?: { depute_id: string }[]; perdus?: { depute_id: string }[] } | null;
        const connus = new Set<string>([...pivotIds, ...[...(ga?.actionnables ?? []), ...(ga?.allies ?? []), ...(ga?.perdus ?? [])].map((x) => x.depute_id)]);
        for (const pa of [...disponibles, ...absents]) if (!connus.has(pa)) erreur(f, "disponibles/absents", pa, "listé mais absent de pivots.json et de groupes-action.json");
      }
    }

    // note.json (bloc Compte rendu)
    if (note) {
      const f = p(id, "note");
      verifierTexteChiffres(f, "chiffres_utilises", note.texte, note.chiffres_utilises);
      if (note.mode === "gabarit" && note.modele !== null) erreur(f, "modele", note.modele, "doit être null en mode gabarit");
      if (note.client !== dossier.client) erreur(f, "client", note.client, `attendu ${fmt(dossier.client)} (config.json)`);
      if (JSON.stringify(note.objectifs) !== JSON.stringify(dossier.objectifs)) erreur(f, "objectifs", note.objectifs, `attendu ${fmt(dossier.objectifs)} (config.json)`);
    }

    const rangs = new Set(dossier.objectifs.map((o) => o.rang));
    const evenementIds = new Set((nouveautes?.evenements ?? []).map((e) => e.id));

    // verdict.json : un verdict par objectif, un seul de rang 1 (le schéma l'impose).
    if (verdict) {
      const f = p(id, "verdict");
      verdict.verdicts.forEach((v, i) => {
        if (!rangs.has(v.objectif_rang)) erreur(f, `verdicts.${i}.objectif_rang`, v.objectif_rang, "rang absent de config.dossiers[].objectifs");
        verifierTexteChiffres(f, `verdicts.${i}.lecture.chiffres_utilises`, v.lecture.texte, v.lecture.chiffres_utilises);
        if (v.lecture.mode === "gabarit" && v.lecture.modele !== null) erreur(f, `verdicts.${i}.lecture.modele`, v.lecture.modele, "doit être null en mode gabarit");
        if (v.situation === "insuffisant" && v.score !== null) erreur(f, `verdicts.${i}.score`, v.score, "doit être null quand la situation est « insuffisant »");
        if (v.cause_du_changement && nouveautes && !evenementIds.has(v.cause_du_changement.evenement_id)) erreur(f, `verdicts.${i}.cause_du_changement.evenement_id`, v.cause_du_changement.evenement_id, "événement absent de nouveautes.json");
      });
      for (const r of rangs) if (!verdict.verdicts.some((v) => v.objectif_rang === r)) erreur(f, "verdicts", r, "aucun verdict pour cet objectif de config.json");
    }

    // nouveautes.json
    nouveautes?.evenements.forEach((e, i) => {
      if (!rangs.has(e.objectif_rang)) erreur(p(id, "nouveautes"), `evenements.${i}.objectif_rang`, e.objectif_rang, "rang absent de config.dossiers[].objectifs");
    });

    // action.json
    if (action) {
      const f = p(id, "action");
      action.decideurs.forEach((d, i) => {
        deputeExiste(f, `decideurs.${i}.depute_id`, d.depute_id);
        groupeExiste(f, `decideurs.${i}.groupe_id`, d.groupe_id);
        if (d.role === "gouvernement" && d.depute_id !== null) erreur(f, `decideurs.${i}.depute_id`, d.depute_id, "le gouvernement n'a pas d'identifiant de député");
      });
      for (const cat of ["actionnables", "allies", "perdus"] as const) {
        action.groupes[cat].forEach((d, i) => {
          deputeExiste(f, `groupes.${cat}.${i}.depute_id`, d.depute_id);
          groupeExiste(f, `groupes.${cat}.${i}.groupe_id`, d.groupe_id);
          if (d.fiche && index && !disponibles.has(d.depute_id)) erreur(f, `groupes.${cat}.${i}.fiche`, true, `aucune fiche disponible pour ${d.depute_id} dans fiches/index.json`);
        });
      }
      for (const sens of ["pour", "contre"] as const) {
        action.arguments[sens].forEach((a, i) => {
          deputeExiste(f, `arguments.${sens}.${i}.orateur_id`, a.orateur_id);
          groupeExiste(f, `arguments.${sens}.${i}.groupe_id`, a.groupe_id);
        });
      }
      const argumentsConnus = new Set([...action.arguments.pour, ...action.arguments.contre].map((a) => a.argument));
      action.contre_arguments.forEach((c, i) => {
        verifierTexteChiffres(f, `contre_arguments.${i}.chiffres_utilises`, c.texte, c.chiffres_utilises);
        if (!argumentsConnus.has(c.repond_a)) erreur(f, `contre_arguments.${i}.repond_a`, c.repond_a, "ne correspond à aucun champ `argument` de action.arguments");
      });
    }

    // date_reference : rien de postérieur dans nouveautés, aucune échéance déjà passée dans suite.
    if (dossier.date_reference) {
      const ref = dossier.date_reference;
      nouveautes?.evenements.forEach((e, i) => {
        if (e.date > ref) erreur(p(id, "nouveautes"), `evenements.${i}.date`, e.date, `postérieure à date_reference ${ref}`);
      });
      suite?.echeances.forEach((e, i) => {
        if (e.date !== null && e.date < ref) erreur(p(id, "suite"), `echeances.${i}.date`, e.date, `échéance déjà passée à date_reference ${ref}`);
      });
    }
  }
}

// ---------- arguments ----------
const args = process.argv.slice(2);
const roots: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--root") roots.push(...(args[++i] ?? "").split(",").filter(Boolean));
  else if (args[i].startsWith("--root=")) roots.push(...args[i].slice(7).split(",").filter(Boolean));
  else {
    console.error(`argument inconnu : ${args[i]}\nusage : bun qa/check.ts [--root data|contracts/fixtures]`);
    process.exit(2);
  }
}
const explicite = roots.length > 0;
if (!explicite) roots.push("data", "contracts/fixtures");

for (const root of roots) {
  if (!explicite && !existsSync(root)) {
    avertissements.push(`${root} absent, ignoré (passer --root ${root} pour l'exiger)`);
    continue;
  }
  verifierRoot(root);
  verifierCroise(root, erreur);
}

for (const a of avertissements) console.log(`! ${a}`);
if (erreurs.length === 0) {
  console.log(`OK : ${fichiersValides} fichiers valides, intégrité croisée vérifiée (${roots.join(", ")})`);
  process.exit(0);
}
console.log(`${erreurs.length} erreur(s) :`);
for (const e of erreurs) {
  console.log(`✗ ${e.fichier} | ${e.champ} | ${fmt(e.valeur)}${e.message ? ` | ${e.message}` : ""}`);
}
process.exit(1);
