// P2 : bloc Suite par dossier (échéances, dernière occasion d'agir, probables).
// bun pipeline/suite/run.ts  →  data/<dossier>/suite.json
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { SuiteSchema } from "../../contracts";
import { ROOT, chargerConfig, chargerGroupes, chargerScrutins, lireJson, urlScrutin } from "../cohesion/lib";

const AGENDA_URL = "https://data.assemblee-nationale.fr/static/openData/repository/17/vp/reunions/Agenda.json.zip";
const ORCET_URL = "https://api.hemicycle.ai/v1/orcet/predictions";
const SENAT_PLF = (annee: number) => `https://www.senat.fr/dossier-legislatif/pjlf${annee}.html`;
const urlDossier = (ref: string) => `https://www.assemblee-nationale.fr/dyn/17/dossiers/${ref}`;
const AUJOURDHUI = new Date().toISOString().slice(0, 10);

const ORGANES: Record<string, { nom: string; lieu: "seance" | "commission" | "senat" | "autre" }> = {
  PO838901: { nom: "Séance publique de l'Assemblée", lieu: "seance" },
  PO59048: { nom: "Commission des finances", lieu: "commission" },
  PO78718: { nom: "Sénat", lieu: "senat" },
};

const L = <T,>(x: T | T[] | null | undefined): T[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
const fmt = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const pct = (x: number) => `${Math.round(x * 100)} %`;

const { data: config } = chargerConfig();
const { data: groupesFile } = chargerGroupes();
const groupes = Object.fromEntries(groupesFile.groupes.map((g: any) => [g.id, g]));
const cohesion = lireJson("data/cohesion.json").data;

// Dossier législatif de chaque texte (dump open data de P1)
function dossierRef(texteId: string): string | null {
  const p = join(ROOT, "data/raw/opendata/Dossiers_Legislatifs/json/document", `${texteId}.json`);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")).document?.dossierRef ?? null : null;
}

// Réunions de l'agenda liées à un dossier législatif, connues (créées) au plus tard à `connu`, et tenues à partir de `depuis`.
type Reunion = { date: string; heure: string; organe: string; objet: string; uid: string; creation: string };
function reunions(dl: string, depuis: string, connu: string): Reunion[] {
  const dir = join(ROOT, "data/raw/opendata/Agenda/json/reunion");
  if (!existsSync(dir)) return [];
  const out: Reunion[] = [];
  for (const f of readdirSync(dir)) {
    const s = readFileSync(join(dir, f), "utf8");
    if (!s.includes(dl)) continue;
    const r = JSON.parse(s).reunion;
    const date = r.timeStampDebut.slice(0, 10);
    if (date < depuis || r.cycleDeVie?.etat === "Annulé") continue;
    for (const p of L(r.ODJ?.pointsODJ?.pointODJ) as any[]) {
      if (!L(p.dossiersLegislatifsRefs?.dossierRef).includes(dl)) continue;
      const creation = (p.cycleDeVie?.chrono?.creation ?? r.cycleDeVie?.chrono?.creation ?? "").slice(0, 10);
      if (!creation || creation > connu) continue;
      out.push({ date, heure: r.timeStampDebut.slice(11, 16), organe: r.organeReuniRef, objet: p.objet ?? p.typePointODJ ?? "Examen", uid: r.uid, creation });
    }
  }
  return out.sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
}

function lireDossier(id: string, kind: string) {
  const p = join(ROOT, "data", id, `${kind}.json`);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
}

// Accord RN / bloc central le dernier mois complet avant la date de référence
function ligneCohesion(ref: string) {
  const [a, b] = config.cohesion.paires_demo[0];
  const pair = cohesion.pairs.find((p: any) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
  const moisRef = ref.slice(0, 7);
  const pt = [...pair.series].reverse().find((s: any) => s.month < moisRef && s.accord !== null && s.n_scrutins >= 10);
  if (!pt) return null;
  const [sa, sb] = [groupes[a]?.sigle ?? a, groupes[b]?.sigle ?? b];
  const moisLabel = new Date(pt.month + "-15T12:00:00Z").toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const de = /^[aeiou]/i.test(moisLabel) ? "d'" : "de ";
  return {
    titre: `${sa} et ${sb} (bloc central) votent ensemble dans ${pct(pt.accord)} des scrutins ${de}${moisLabel}`,
    proba: null,
    detail: `Accord mensuel sur ${pt.n_scrutins} scrutins publics : les deux groupes ont la même position majoritaire. Contexte du vote, pas une prédiction.`,
    preuve: {
      nature: "deduction" as const,
      sources: [{ label: "Open data Assemblée nationale, scrutins", url: cohesion.meta.sources[0].url }],
      raisonnement: `Calcul de cohésion (pipeline/cohesion) sur le dernier mois complet avant le ${fmt(ref)}. Un accord bas veut dire que le RN ne suit pas le bloc central : c'est sur ce désaccord qu'une majorité peut se défaire.`,
    },
  };
}

// Probables depuis les positions de groupes (texte.json de P3) : sièges pour et contre la mesure.
function siegesParPosition(texte: any) {
  const acc: Record<string, { sieges: number; sigles: string[] }> = {};
  for (const p of texte?.positions ?? []) {
    if (!p.position || p.position === "divise" || p.position === "abstention") continue;
    const g = groupes[p.groupe_id];
    if (!g) continue;
    (acc[p.position] ??= { sieges: 0, sigles: [] }).sieges += g.effectif ?? 0;
    acc[p.position].sigles.push(g.sigle);
  }
  return acc;
}

function probablesOrcet(texte: any, dossier: any, rejete: boolean) {
  const am = (texte?.amendements ?? []).filter((a: any) => a.sort === "en_attente" && a.prediction);
  return am
    .sort((x: any, y: any) => Math.abs(y.prediction.proba_pour - 0.5) - Math.abs(x.prediction.proba_pour - 0.5))
    .slice(0, 8)
    .map((a: any) => {
      const pp = a.prediction.proba_pour;
      const sens = pp >= 0.5 ? "adoption probable" : "rejet probable";
      const g = a.groupe_id ? groupes[a.groupe_id]?.sigle ?? a.groupe_id : "non-inscrit";
      return {
        titre: `Amendement n° ${a.numero} (${g}) : ${pct(pp)} de votes pour prédits par Orcet, ${sens} à l'Assemblée si le vote avait lieu aujourd'hui`,
        proba: pp,
        detail:
          `Orcet : ${pp.toFixed(2).replace(".", ",")} de probabilité moyenne de voter pour, chez les députés (pas une probabilité d'adoption de l'amendement ni de la loi). ${a.resume}` +
          (rejete ? " Le texte ayant été rejeté le 4 novembre, l'amendement n'est pas examiné en première lecture : la lecture vaut s'il revient en nouvelle lecture." : ""),
        preuve: {
          nature: "deduction" as const,
          sources: [{ label: `Amendement n° ${a.numero}`, url: a.url }, { label: "Prédictions Orcet (Hémicycle)", url: ORCET_URL }],
          raisonnement: `Prédiction ${a.prediction.modele} du ${fmt(a.prediction.date)}, confiance ${a.prediction.confiance.toFixed(2).replace(".", ",")}. Au-dessus de 0,5 on lit une adoption probable, en dessous un rejet probable.`,
        },
      };
    });
}

const ecrits: string[] = [];
for (const d of config.dossiers) {
  const ref: string = d.date_reference ?? AUJOURDHUI;
  const rejoue = Boolean(d.date_reference);
  const dl = dossierRef(d.mesure?.texte_id ?? d.texte_id);
  const etat = lireDossier(d.id, "etat");
  const texte = lireDossier(d.id, "texte");
  const article = d.mesure?.article;
  const urlD = dl ? urlDossier(dl) : "https://www.assemblee-nationale.fr/dyn/17/dossiers";
  const annee = Number((d.label.match(/PLF (\d{4})/) ?? [])[1]) || null;
  const limits: string[] = [];
  const sources = [{ label: "Open data Assemblée nationale, agenda des réunions", url: AGENDA_URL }];
  if (dl) sources.push({ label: `Dossier législatif ${dl}`, url: urlD });

  // 1. Échéances de l'agenda : une par jour et par organe
  const echeances: any[] = [];
  const vus = new Set<string>();
  const rs = dl ? reunions(dl, ref, ref) : [];
  if (!dl) limits.push("Dossier législatif introuvable dans le dump open data : pas d'échéance d'agenda.");
  for (const r of rs) {
    const k = `${r.date}|${r.organe}`;
    if (vus.has(k)) continue;
    vus.add(k);
    const org = ORGANES[r.organe] ?? { nom: "Commission", lieu: "commission" as const };
    const memeJour = rs.filter((x) => x.date === r.date && x.organe === r.organe).map((x) => x.heure);
    echeances.push({
      date: r.date,
      titre: `${org.nom} : ${r.objet.replace(/\s+/g, " ").trim()}${memeJour.length > 1 ? ` (${memeJour.length} réunions, dès ${r.heure.replace(":", " h ")})` : ` (${r.heure.replace(":", " h ")})`}`,
      lieu: org.lieu,
      url: urlD,
      preuve: {
        nature: "fait" as const,
        sources: [{ label: `Agenda open data, réunion ${r.uid}`, url: AGENDA_URL }],
        raisonnement: `Réunion inscrite à l'agenda de l'Assemblée le ${fmt(r.creation)}, liée au dossier ${dl}.`,
      },
    });
  }
  if (rs.length === 0 && dl) limits.push(`Aucune réunion de l'agenda de l'Assemblée liée au texte après le ${fmt(ref)}.`);

  // 2. Étapes à venir de etat.json (P3)
  if (etat) {
    sources.push({ label: "État de la mesure (pipeline/pivots)", url: urlD });
    for (const e of etat.etapes ?? []) {
      if (e.statut !== "a_venir" || (e.date && e.date < ref)) continue;
      const lieu = /sénat/i.test(e.nom) ? "senat" : /cmp|mixte/i.test(e.nom) ? "cmp" : /commission/i.test(e.nom) ? "commission" : /séance|lecture/i.test(e.nom) ? "seance" : "autre";
      if (echeances.some((x) => x.lieu === lieu && x.date === e.date && x.date !== null)) continue;
      echeances.push({
        date: e.date, titre: e.nom, lieu, url: e.url,
        preuve: { nature: e.date ? ("fait" as const) : ("inconnue" as const), sources: [{ label: e.nom, url: e.url }], raisonnement: e.date ? "Étape à venir de la procédure, datée par l'état de la mesure." : "Étape à venir de la procédure, date non publiée à ce jour." },
      });
    }
  } else limits.push("etat.json absent au moment du calcul : étapes de procédure ajoutées d'après le calendrier budgétaire.");

  // 3. Suite de procédure budgétaire, quand etat.json ne la donne pas
  const urlSenat = annee ? SENAT_PLF(annee) : "https://www.senat.fr/";
  const ajout = (lieu: string, titre: string, raisonnement: string, url: string) => {
    if (echeances.some((x) => x.lieu === lieu)) return;
    echeances.push({ date: null, titre, lieu, url, preuve: { nature: "inconnue" as const, sources: [{ label: lieu === "senat" || lieu === "cmp" ? `Sénat, PLF ${annee}` : `Dossier législatif ${dl}`, url }], raisonnement } });
  };
  ajout("senat", `Examen du PLF ${annee} au Sénat, première lecture`, rejoue
    ? `Au matin du ${fmt(ref)}, le calendrier du Sénat n'est pas fixé : il dépend de la fin de la première lecture à l'Assemblée.`
    : `Le texte, rejeté par l'Assemblée le 4 novembre 2026, est transmis au Sénat. La page du Sénat (mise à jour le 10 novembre 2026) ne donne encore aucune date d'examen.`, urlSenat);
  ajout("cmp", "Commission mixte paritaire", "Date non fixée : elle suit la fin de l'examen au Sénat.", urlSenat);
  if (!rejoue) ajout("seance", "Nouvelle lecture à l'Assemblée nationale", "Date non fixée : après l'échec éventuel de la commission mixte paritaire.", urlD);
  limits.push("Dates du Sénat, de la commission mixte paritaire et de la nouvelle lecture inconnues quand elles valent null.");

  echeances.sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));

  // 4. Dernière occasion d'agir à cette étape
  let derniere_occasion: any = null;
  if (rejoue) {
    // Jour où l'article vient réellement en discussion : premier scrutin public sur l'article à partir de la date de référence (date seule, pas le résultat).
    const scr = chargerScrutins().find((x) => x.date >= ref && new RegExp(`article ${article}\\b.*finances pour ${annee}`, "i").test(x.titre));
    const s = (scr && echeances.find((e) => e.lieu === "seance" && e.date === scr.date)) || echeances.find((e) => e.lieu === "seance" && e.date);
    if (s) {
      if (scr) s.preuve.sources.push({ label: "Ordre de discussion : scrutins publics sur l'article ce jour-là", url: urlScrutin(scr.numero) });
      derniere_occasion = {
        date: s.date,
        titre: `Séance publique du ${fmt(s.date)} : examen de l'article ${article} et de ses amendements, dernier moment pour faire adopter la suppression à l'Assemblée en première lecture`,
        lieu: "seance",
        url: urlD,
        preuve: {
          nature: "deduction" as const,
          sources: [...s.preuve.sources, { label: `Dossier législatif ${dl}`, url: urlD }],
          raisonnement: `L'article ${article} vient en discussion en séance ce jour-là, dans la suite de la première partie (la date vient de l'ordre de discussion, le résultat du vote n'est pas utilisé) ; une fois l'article voté, la mesure ne peut plus être modifiée à l'Assemblée avant la nouvelle lecture. Ensuite, l'action se déplace vers le Sénat (objectifs de repli : montant, date d'application).`,
        },
      };
    }
  } else {
    const senat = echeances.find((e) => e.lieu === "senat");
    derniere_occasion = {
      date: senat?.date ?? null,
      titre: `Examen au Sénat : prochaine occasion d'obtenir la suppression ou la réduction de la mesure, avant le retour du texte à l'Assemblée`,
      lieu: "senat",
      url: urlSenat,
      preuve: {
        nature: "deduction" as const,
        sources: [{ label: `Sénat, PLF ${annee}`, url: urlSenat }, { label: "Scrutin n° 9759, rejet de la première partie", url: "https://www.assemblee-nationale.fr/dyn/17/scrutins/9759" }],
        raisonnement: "L'Assemblée a rejeté la première partie le 4 novembre 2026 : la procédure continue au Sénat sur le texte du gouvernement. C'est la prochaine étape où la mesure peut être supprimée ou modifiée ; la date n'est pas encore publiée.",
      },
    };
  }

  // 5. Probables
  const probables: any[] = [];
  if (texte) sources.push({ label: `Texte ${d.texte_id}, positions et amendements`, url: texte.texte?.url ?? urlD });
  else limits.push("texte.json absent au moment du calcul : pas de probable fondé sur les positions des groupes ni sur Orcet.");
  const pos = siegesParPosition(texte);
  const pour = pos.pour?.sieges ?? 0, contre = pos.contre?.sieges ?? 0;
  if (texte && (pour || contre)) {
    const adoption = pour > contre;
    probables.push({
      titre: `Mesure : ${adoption ? "adoption probable" : "rejet probable"} à l'Assemblée ${rejoue ? `si le vote avait lieu le ${fmt(ref)}` : "si elle revenait au vote aujourd'hui"} (sièges des groupes selon leur position, pas une probabilité)`,
      proba: null,
      detail: `Groupes favorables à la mesure : ${(pos.pour?.sigles ?? []).join(", ") || "aucun"} (${pour} sièges). Opposés : ${(pos.contre?.sigles ?? []).join(", ") || "aucun"} (${contre} sièges). Vote à l'Assemblée, pas l'issue finale du dossier.`,
      preuve: {
        nature: "deduction" as const,
        sources: [{ label: `Positions des groupes, texte ${d.texte_id}`, url: texte.texte?.url ?? urlD }],
        raisonnement: rejoue
          ? `Orcet n'existe pas rétroactivement au matin du ${fmt(ref)} : pas de probabilité chiffrée. On additionne les sièges des groupes selon leur position connue sur la mesure ; les groupes divisés ou abstentionnistes ne sont pas comptés.`
          : "On additionne les sièges des groupes selon leur position connue sur la mesure ; les groupes divisés ou abstentionnistes ne sont pas comptés. Pas de probabilité chiffrée.",
      },
    });
    if (rejoue) {
      for (const a of (texte.amendements ?? []).filter((x: any) => x.sort === "en_attente" && /suppr/i.test(x.resume)).slice(0, 3)) {
        const g = a.groupe_id ? groupes[a.groupe_id]?.sigle ?? a.groupe_id : "non-inscrit";
        probables.push({
          titre: `Amendement de suppression n° ${a.numero} (${g}) : ${contre < pour ? "rejet probable" : "adoption possible"} à l'Assemblée si le vote avait lieu le ${fmt(ref)} (pas de prédiction Orcet à cette date)`,
          proba: null,
          detail: `La suppression rassemble les groupes opposés à la mesure (${contre} sièges) face aux groupes favorables (${pour} sièges).`,
          preuve: {
            nature: "deduction" as const,
            sources: [{ label: `Amendement n° ${a.numero}`, url: a.url }],
            raisonnement: `Orcet n'existe pas rétroactivement au matin du ${fmt(ref)} (proba null). Lecture depuis les positions des groupes sur la mesure.`,
          },
        });
      }
    }
  }
  // Amendements du gouvernement en attente sur la mesure (dossier rejoué) : portés par l'exécutif et les groupes favorables.
  if (rejoue && texte && (pour || contre)) {
    for (const a of (texte.amendements ?? []).filter((x: any) => x.sort === "en_attente" && x.auteur_type === "gouvernement").slice(0, 2)) {
      probables.push({
        titre: `Amendement du gouvernement n° ${a.numero} : ${pour > contre ? "adoption probable" : "adoption incertaine"} à l'Assemblée si le vote avait lieu le ${fmt(ref)} (pas de prédiction Orcet à cette date)`,
        proba: null,
        detail: `${a.resume} Déposé le ${fmt(a.date_depot)}. Les groupes favorables à la mesure (${pour} sièges) le soutiennent en principe ; les opposés (${contre} sièges) votent contre la mesure elle-même.`,
        preuve: {
          nature: "deduction" as const,
          sources: [{ label: `Amendement n° ${a.numero}`, url: a.url }],
          raisonnement: `Un amendement du gouvernement sur sa propre mesure est soutenu par les groupes qui la soutiennent. Lecture des positions des groupes au matin du ${fmt(ref)}, pas une probabilité.`,
        },
      });
    }
  }
  const orcet = probablesOrcet(texte, d, !rejoue && annee === 2027);
  probables.push(...orcet);
  if (orcet.length) sources.push({ label: "Prédictions Orcet (Hémicycle)", url: ORCET_URL });
  else if (texte && !rejoue) limits.push("Aucune prédiction Orcet sur un amendement en attente qui porte la mesure : les 7 prédictions obtenues visaient des amendements hors sujet (pensions, crédits de seconde partie, qui ne citent le sujet que dans leur exposé), écartés de texte.json.");
  if (rejoue) limits.push(`Dossier rejoué au matin du ${fmt(ref)} (règle de 14 h 57 : dépôts du jour connus ; sorts, scrutins et séances du jour inconnus) : Orcet n'existe pas rétroactivement, probabilités à null.`);
  const coh = ligneCohesion(ref);
  if (coh) probables.push(coh);

  const suite = {
    meta: {
      generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      sources,
      limits: [`Échéances connues au ${rejoue ? "matin du " : ""}${fmt(ref)} (réunions inscrites à l'agenda au plus tard ce jour-là ; une séance de ce jour figure comme échéance, son contenu et ses votes ne sont pas utilisés).`, ...limits].join(" "),
      producer: "pipeline/suite",
      dossier_id: d.id,
    },
    echeances,
    derniere_occasion,
    probables,
  };
  SuiteSchema.parse(suite);
  mkdirSync(join(ROOT, "data", d.id), { recursive: true });
  writeFileSync(join(ROOT, "data", d.id, "suite.json"), JSON.stringify(suite, null, 2) + "\n");
  ecrits.push(`${d.id} : ${echeances.length} échéances (${rs.length} réunions d'agenda), ${probables.length} probables (${orcet.length} Orcet), dernière occasion ${derniere_occasion?.date ?? "null"}, etat ${etat ? "oui" : "non"}, texte ${texte ? "oui" : "non"}`);
}
console.log(ecrits.join("\n"));
