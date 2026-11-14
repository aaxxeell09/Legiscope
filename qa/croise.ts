// Complément 7 (14 h 05) : contrôle croisé par dossier. Un même fait a la même valeur dans tous les fichiers.
// Appelé par qa/check.ts après la validation des schémas ; lit les JSON bruts, tolère les fichiers absents
// (leur absence est déjà signalée par check.ts). Message : fichier A, fichier B, champ, deux valeurs.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Erreur = (fichier: string, champ: string, valeur: unknown, message?: string) => void;

function lire(f: string): any | null {
  if (!existsSync(f)) return null;
  try {
    return JSON.parse(readFileSync(f, "utf8"));
  } catch {
    return null;
  }
}

function ecart(erreur: Erreur, a: string, b: string, champ: string, va: unknown, vb: unknown) {
  erreur(a, champ, va, `diffère de ${b} (${JSON.stringify(vb)})`);
}

const MOTS_SITUATION: Record<string, string[]> = {
  favorable: ["favorable", "bonne voie"],
  incertaine: ["incertain"],
  defavorable: ["défavorable", "defavorable", "mal engagé", "mal engage"],
  insuffisant: ["pas assez d'information", "insuffisant", "indécidable"],
};

export function verifierCroise(root: string, erreur: Erreur) {
  const config = lire(join(root, "config.json"));
  const deputes = lire(join(root, "deputes.json"));
  if (!config?.dossiers) return;
  const groupeDe = new Map<string, string | null>();
  for (const d of deputes?.deputes ?? []) groupeDe.set(d.id, d.groupe_id ?? null);

  for (const dossier of config.dossiers) {
    const id: string = dossier.id;
    const dir = join(root, id);
    if (!existsSync(dir)) continue;
    const P = (...x: string[]) => join(dir, ...x);

    // 1. Sort et nature d'un amendement : texte.json fait foi.
    const texte = lire(P("texte.json"));
    const refAmdt = new Map<string, { sort: string; nature?: string }>();
    for (const a of texte?.amendements ?? []) refAmdt.set(a.id, { sort: a.sort, nature: a.nature });
    const comparerAmendements = (fichier: string, liste: any[] | undefined) => {
      for (const a of liste ?? []) {
        const ref = refAmdt.get(a.id);
        if (!ref) continue;
        if (a.sort !== undefined && a.sort !== ref.sort) ecart(erreur, fichier, P("texte.json"), `amendement ${a.id}.sort`, a.sort, ref.sort);
        if (a.nature !== undefined && ref.nature !== undefined && a.nature !== ref.nature) ecart(erreur, fichier, P("texte.json"), `amendement ${a.id}.nature`, a.nature, ref.nature);
      }
    };
    for (const sous of ["amendements", "fiches"]) {
      const d = P(sous);
      if (!existsSync(d)) continue;
      for (const f of readdirSync(d)) {
        if (!f.endsWith(".json") || f === "index.json") continue;
        const obj = lire(join(d, f));
        comparerAmendements(join(d, f), obj?.amendements);
      }
    }

    // 2. Groupe d'un député : deputes.json fait foi (groupe_id du jour ; groupe_id_au_vote peut différer).
    const comparerGroupe = (fichier: string, champ: string, pa: string, g: unknown) => {
      if (!groupeDe.has(pa) || g === undefined) return;
      const ref = groupeDe.get(pa);
      if (g !== ref) ecart(erreur, fichier, join(root, "deputes.json"), `${champ} ${pa}.groupe_id`, g, ref);
    };
    const pivots = lire(P("pivots.json"));
    for (const d of pivots?.deputes ?? []) comparerGroupe(P("pivots.json"), "pivot", d.id, d.groupe_id);
    const ga = lire(P("groupes-action.json"));
    for (const k of ["actionnables", "allies", "perdus", "position_inconnue"]) for (const d of ga?.[k] ?? []) comparerGroupe(P("groupes-action.json"), k, d.depute_id, d.groupe_id);
    const action = lire(P("action.json"));
    for (const k of ["actionnables", "allies", "perdus", "position_inconnue"]) for (const d of action?.groupes?.[k] ?? []) comparerGroupe(P("action.json"), k, d.depute_id, d.groupe_id);

    // 3. Complément 5 : dès qu'un producteur publie `position_inconnue`, plus aucun député sans fondement dans les trois listes.
    for (const [fichier, groupes] of [
      [P("groupes-action.json"), ga],
      [P("action.json"), action?.groupes],
    ] as const) {
      if (!groupes || groupes.position_inconnue === undefined) continue;
      for (const k of ["actionnables", "allies", "perdus"]) {
        for (const d of groupes[k] ?? []) {
          if (!Array.isArray(d.fondement) || d.fondement.length === 0) erreur(fichier, `${k} ${d.depute_id}.fondement`, d.fondement, "sans acte personnel lié à la mesure : doit être dans position_inconnue");
        }
      }
    }

    // 4. Situation et score de l'objectif principal : verdict.json fait foi, le compte rendu doit dire la même chose.
    const verdict = lire(P("verdict.json"));
    const note = lire(P("note.json"));
    const v0 = (verdict?.verdicts ?? []).find((v: any) => v.objectif_rang === 1);
    if (v0 && note?.texte) {
      const txt = String(note.texte).toLowerCase();
      const mots = MOTS_SITUATION[v0.situation] ?? [];
      if (mots.length && !mots.some((m) => txt.includes(m))) ecart(erreur, P("note.json"), P("verdict.json"), "situation (objectif 1)", "(absente du texte)", v0.situation);
      // Le brief exécutif (choix d'Axel, 16 h 40) ne cite pas forcément le score. S'il cite un pourcentage
      // à côté de la situation, ce doit être celui du verdict, écrit « X % des sièges favorables à l'objectif ».
      if (typeof v0.score === "number") {
        const pct = Math.round(v0.score * 100);
        const pourcentages = [...txt.matchAll(/(\d{1,3})\s?%\s?des si[èe]ges/g)].map((m) => Number(m[1]));
        if (pourcentages.length && !pourcentages.includes(pct)) ecart(erreur, P("note.json"), P("verdict.json"), "score (objectif 1)", pourcentages, `${pct} %`);
      }
    }

    // 5. État de la mesure et du texte : etat.json fait foi. Le verdict ne porte pas encore ces champs ;
    //    on vérifie la cohérence interne (texte rejeté ou retiré => la mesure n'est plus « dans le texte » examiné).
    const etat = lire(P("etat.json"));
    const te = etat?.texte_etat;
    // Un texte rejeté en première lecture à l'Assemblée part au Sénat tel que déposé : la mesure du gouvernement y reste.
    // Seul un texte retiré rend « dans_le_texte: true » incohérent.
    if (te && etat?.mesure && te.statut === "retire" && etat.mesure.dans_le_texte === true && dossier.date_reference === null) {
      ecart(erreur, P("etat.json"), P("etat.json"), "mesure.dans_le_texte vs texte_etat.statut", etat.mesure.dans_le_texte, te.statut);
    }
  }
}
