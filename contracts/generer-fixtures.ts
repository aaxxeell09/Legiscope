// Génère contracts/fixtures/ (jeu complet et réaliste, miroir de data/).
// Exécution : bun contracts/generer-fixtures.ts
// Chaque fichier est validé contre son schéma avant écriture.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ZodTypeAny } from "zod";
import {
  AmendementsSchema, AuditionsSchema, CohesionSchema, ConfigSchema, DebatsSchema, DeputesSchema,
  FicheSchema, FichesIndexSchema, GroupesSchema, HatvpSchema, NoteSchema, PivotsSchema, TexteSchema,
  VerdictSchema, NouveautesSchema, SuiteSchema, ActionSchema, EtatSchema,
  dataPath,
  type Amendements, type Auditions, type Cohesion, type Config, type Debats, type Deputes, type Fiche,
  type FichesIndex, type Groupes, type Hatvp, type Meta, type Note, type Pivots, type Texte, type Kind,
  type Verdict, type Nouveautes, type Suite, type Action, type Etat, type Preuve, type Objectifs, type Mesure,
} from "./index";
import { verifierChiffres } from "../qa/verif";

const ROOT = join(import.meta.dir, "fixtures");
const GENERATED_AT = "2026-11-14T12:50:00+01:00";
const AN = "https://www.assemblee-nationale.fr";

// ---------- utilitaires ----------
let seed = 20261114;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const r2 = (x: number) => Math.round(x * 100) / 100;

function meta(producer: string, dossier_id: string | null, sources: Meta["sources"], limits: string): Meta {
  return { generated_at: GENERATED_AT, sources, limits, producer, dossier_id };
}

function ecrire<T>(schema: ZodTypeAny, dossier: string | null, kind: Kind, obj: T, pa?: string) {
  const res = schema.safeParse(obj);
  if (!res.success) {
    console.error(`fixture invalide ${kind} ${dossier ?? ""} ${pa ?? ""}`, res.error.issues);
    process.exit(1);
  }
  const rel = dataPath(dossier, kind, pa, "fixtures");
  const abs = join(import.meta.dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(obj, null, 2) + "\n");
}

function assertChiffres(ou: string, texte: string, autorises: string[]) {
  const r = verifierChiffres(texte, autorises);
  if (!r.ok) {
    console.error(`chiffres non autorisés dans ${ou} :`, r.fautifs);
    process.exit(1);
  }
}

// ---------- groupes (17e législature, identifiants PO réels, voir fixtures/README.md) ----------
const GROUPES = [
  { id: "PO845401", sigle: "RN", nom: "Rassemblement National", couleur: "#0D378A", effectif: 121 },
  { id: "PO845407", sigle: "EPR", nom: "Ensemble pour la République", couleur: "#F2C200", effectif: 90 },
  { id: "PO845413", sigle: "LFI-NFP", nom: "La France insoumise - Nouveau Front Populaire", couleur: "#CC2443", effectif: 70 },
  { id: "PO845419", sigle: "SOC", nom: "Socialistes et apparentés", couleur: "#FF8080", effectif: 68 },
  { id: "PO845425", sigle: "DR", nom: "Droite Républicaine", couleur: "#2A6CB0", effectif: 46 },
  { id: "PO845439", sigle: "EcoS", nom: "Écologiste et Social", couleur: "#00A95C", effectif: 38 },
  { id: "PO845454", sigle: "DEM", nom: "Les Démocrates", couleur: "#FF9900", effectif: 37 },
  { id: "PO845470", sigle: "HOR", nom: "Horizons & Indépendants", couleur: "#1F8BA6", effectif: 35 },
  { id: "PO845485", sigle: "LIOT", nom: "Libertés, Indépendants, Outre-mer et Territoires", couleur: "#B07AA1", effectif: 24 },
  { id: "PO845514", sigle: "GDR", nom: "Gauche Démocrate et Républicaine", couleur: "#DD0000", effectif: 17 },
  { id: "PO872880", sigle: "UDR", nom: "Union des droites pour la République", couleur: "#1C2A5A", effectif: 17 },
];
const G = Object.fromEntries(GROUPES.map((g) => [g.sigle, g.id]));

// ---------- députés fictifs (noms clairement fictifs, identifiants PA de forme réaliste) ----------
const FINANCES = "PO59048";
const LOIS = "PO59051";
const ECO = "PO419604";
const SOCIALES = "PO420120";
const DEPTS = ["75", "69", "13", "59", "33", "44", "31", "67", "35", "06", "38", "76", "29", "34", "974", "2A"];

const deputes: Deputes["deputes"] = [];
let idSeq = 720892;
let lettre = 0;
const suffixe = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : "A" + String.fromCharCode(65 + (i - 26)));
function nouveauDepute(groupe_id: string | null, commissions: string[]) {
  const id = `PA${idSeq}`;
  idSeq += 1 + Math.floor(rnd() * 900);
  const d = {
    id,
    nom: `Test ${suffixe(lettre)}`,
    prenom: "Député",
    groupe_id,
    departement: DEPTS[lettre % DEPTS.length],
    circonscription: 1 + (lettre % 7),
    commissions,
  };
  lettre += 1;
  deputes.push(d);
  return id;
}
// 3 par groupe : le premier siège aux finances.
const parGroupe: Record<string, string[]> = {};
for (const g of GROUPES) {
  parGroupe[g.sigle] = [
    nouveauDepute(g.id, [FINANCES]),
    nouveauDepute(g.id, [ECO]),
    nouveauDepute(g.id, [rnd() < 0.5 ? LOIS : SOCIALES]),
  ];
}
const NI1 = nouveauDepute(null, [LOIS]);
const NI2 = nouveauDepute(null, [SOCIALES]);

const SOURCES_API = [{ label: "Hémicycle API", url: "https://api.hemicycle.ai/v1/acteurs" }];
const SOURCES_AN = [{ label: "Open data Assemblée nationale", url: "https://data.assemblee-nationale.fr/" }];

ecrire<Groupes>(GroupesSchema, null, "groupes", {
  meta: meta("pipeline/collecte", null, [{ label: "Hémicycle API organes", url: "https://api.hemicycle.ai/v1/organes" }], "Effectifs au 14 novembre 2026, apparentés inclus, non-inscrits exclus."),
  groupes: GROUPES,
});
ecrire<Deputes>(DeputesSchema, null, "deputes", {
  meta: meta("pipeline/collecte", null, SOURCES_API, "Instantané du jour. Noms fictifs dans les fixtures."),
  deputes,
});

// ---------- cohésion : 24 mois, 3 paires, août 2024 à null ----------
const MOIS: string[] = [];
for (let i = 0; i < 24; i++) {
  const y = 2024 + Math.floor((6 + i) / 12);
  const m = ((6 + i) % 12) + 1;
  MOIS.push(`${y}-${String(m).padStart(2, "0")}`);
}
// Trajectoire RN / EPR : décrochage en novembre 2024 (avant Barnier) et juillet 2025 (avant Bayrou).
const BASE: Record<string, number[]> = {
  "RN-EPR": [0.61, 0, 0.63, 0.6, 0.39, 0.42, 0.47, 0.52, 0.5, 0.33, 0.46, 0.49, 0.51, 0.34, 0, 0.3, 0.37, 0.4, 0.43, 0.45, 0.44, 0.47, 0.46, 0.48],
  "LFI-SOC": [0.84, 0, 0.82, 0.8, 0.78, 0.76, 0.71, 0.69, 0.72, 0.7, 0.68, 0.66, 0.64, 0.62, 0, 0.6, 0.58, 0.61, 0.57, 0.59, 0.56, 0.55, 0.57, 0.54],
  "EPR-DR": [0.72, 0, 0.74, 0.77, 0.79, 0.75, 0.7, 0.68, 0.73, 0.71, 0.69, 0.72, 0.7, 0.66, 0, 0.62, 0.64, 0.67, 0.65, 0.68, 0.66, 0.63, 0.65, 0.64],
};
const paires: [string, string, string][] = [["RN-EPR", G.RN, G.EPR], ["LFI-SOC", G["LFI-NFP"], G.SOC], ["EPR-DR", G.EPR, G.DR]];
const cohesion: Cohesion = {
  meta: meta("pipeline/cohesion", null, [{ label: "Hémicycle API scrutins", url: "https://api.hemicycle.ai/v1/scrutins" }], "Scrutins publics uniquement, position majoritaire par groupe au moment du vote. Août 2024 et août 2025 sans scrutin."),
  periode: { from: MOIS[0], to: MOIS[MOIS.length - 1] },
  pairs: paires.map(([k, a, b]) => ({
    a, b,
    series: MOIS.map((month, i) => {
      const v = BASE[k][i];
      const n = v === 0 ? 0 : 18 + Math.floor(rnd() * 40);
      return { month, accord: v === 0 ? null : v, n_scrutins: n };
    }),
  })),
  events: [
    { date: "2024-09-05", type: "nomination", label: "Michel Barnier nommé Premier ministre", url: "https://www.vie-publique.fr/" },
    { date: "2024-12-04", type: "censure", label: "Censure du gouvernement Barnier (331 voix)", url: "https://www.info.gouv.fr/actualite/motions-de-censure-discours-du-premier-ministre-a-lassemblee-nationale" },
    { date: "2024-12-13", type: "nomination", label: "François Bayrou nommé Premier ministre", url: "https://www.vie-publique.fr/" },
    { date: "2025-09-08", type: "censure", label: "Confiance refusée au gouvernement Bayrou (364 contre 194)", url: "https://datan.fr/blog/actualite-politique/les-deputes-refusent-la-confiance-a-francois-bayrou-et-maintenant" },
    { date: "2025-09-09", type: "nomination", label: "Sébastien Lecornu nommé Premier ministre", url: "https://www.vie-publique.fr/" },
    { date: "2025-11-20", type: "vote", label: "Taxe petits colis adoptée 208 contre 87", url: `${AN}/dyn/17/scrutins`, dossier_id: "petits-colis" },
  ],
  signals: [
    { date: "2024-11-30", pair: [G.RN, G.EPR], drop: -0.21, label: "Décrochage RN et bloc central, avant la censure Barnier", suivi_de_censure: true },
    { date: "2025-03-31", pair: [G.RN, G.EPR], drop: -0.17, label: "Décrochage RN et bloc central, sans censure", suivi_de_censure: false },
    { date: "2025-07-31", pair: [G.RN, G.EPR], drop: -0.17, label: "Décrochage RN et bloc central, avant la chute du gouvernement Bayrou", suivi_de_censure: true },
  ],
};
ecrire<Cohesion>(CohesionSchema, null, "cohesion", cohesion);

// ---------- dossiers ----------
type Org = { nom: string; type: "entreprise" | "federation" | "cabinet" | "association" | "administration" | "syndicat" | "autre"; hatvp_id: string | null };
const ORG = {
  fevad: { nom: "Fédération du e-commerce et de la vente à distance (Fevad)", type: "federation", hatvp_id: "812604106" },
  cpme: { nom: "Confédération des petites et moyennes entreprises (CPME)", type: "federation", hatvp_id: "784296512" },
  medef: { nom: "Mouvement des entreprises de France (Medef)", type: "federation", hatvp_id: "425088391" },
  adan: { nom: "Association pour le développement des actifs numériques (Adan)", type: "association", hatvp_id: "881372045" },
  alibaba: { nom: "Alibaba France", type: "entreprise", hatvp_id: "530476110" },
  dgfip: { nom: "Direction générale des finances publiques", type: "administration", hatvp_id: null },
  douane: { nom: "Direction générale des douanes et droits indirects", type: "administration", hatvp_id: null },
  oec: { nom: "Conseil national de l'Ordre des experts-comptables", type: "autre", hatvp_id: null },
  afep: { nom: "Association française des entreprises privées (Afep)", type: "association", hatvp_id: "317486009" },
  franceinvest: { nom: "France Invest", type: "federation", hatvp_id: "602514378" },
  cpo: { nom: "Conseil des prélèvements obligatoires", type: "administration", hatvp_id: null },
  oef: { nom: "Observatoire européen de la fiscalité", type: "autre", hatvp_id: null },
} satisfies Record<string, Org>;

type DossierDef = {
  id: string; label: string; texte_id: string; etat: "en_cours" | "clos";
  client: string; objectifs: Objectifs; mesure: Mesure; date_reference: string | null;
  sujet: { label: string; mots_cles: string[] };
  titre: string; etape: string; url: string;
};
const DOSSIERS: DossierDef[] = [
  {
    id: "plf2027-holdings", label: "PLF 2027, taxe sur les holdings (Zucman)", texte_id: "PRJLANR5L17B3210", etat: "en_cours",
    client: "Afep", date_reference: null,
    objectifs: [
      { rang: 1, texte: "Empêcher la taxe sur les holdings et la fortune improductive", position_cible: "contre" },
      { rang: 2, texte: "Limiter son assiette", position_cible: "contre" },
      { rang: 3, texte: "Repousser son entrée en vigueur", position_cible: "contre" },
    ],
    mesure: { label: "Taxe sur la fortune improductive (article 3) et taxe de 0,5 % sur les holdings patrimoniales (n° 3140)", article: "3", texte_id: "PRJLANR5L17B3210" },
    sujet: { label: "Taxe sur les holdings et la fortune improductive", mots_cles: ["zucman", "holding", "holdings", "impôt sur la fortune", "fortune improductive", "patrimoine improductif", "ISF", "IFF"] },
    titre: "Projet de loi de finances pour 2027", etape: "Première lecture, Sénat (première partie rejetée par l'Assemblée nationale le 4 novembre 2026)",
    url: `${AN}/dyn/17/textes/l17b3210_projet-loi`,
  },
  {
    id: "petits-colis", label: "PLF 2026, taxe petits colis", texte_id: "PRJLANR5L17B1906", etat: "clos",
    client: "Alibaba France", date_reference: "2025-11-19",
    objectifs: [
      { rang: 1, texte: "Empêcher que la taxe soit votée", position_cible: "contre" },
      { rang: 2, texte: "Réduire son montant", position_cible: "contre" },
      { rang: 3, texte: "Repousser son application", position_cible: "contre" },
    ],
    mesure: { label: "Taxe de 2 euros par article sur les colis de moins de 150 euros venant de hors d'Europe", article: "22", texte_id: "PRJLANR5L17B1906" },
    sujet: { label: "Taxe sur les petits colis", mots_cles: ["petits colis", "colis", "franchise douanière"] },
    titre: "Projet de loi de finances pour 2026", etape: "Première lecture, Assemblée nationale, séance publique, première partie",
    url: `${AN}/dyn/17/textes/l17b1906_projet-loi`,
  },
];

function pivotsDe(d: DossierDef): Pivots["deputes"] {
  const sujet = d.id === "petits-colis";
  const ids = sujet
    ? [parGroupe.RN[1], parGroupe.EPR[0], parGroupe["LFI-NFP"][2], parGroupe.SOC[0], parGroupe.DR[1], parGroupe.DEM[2]]
    : [parGroupe.DEM[0], parGroupe.RN[1], parGroupe.LIOT[0], parGroupe.EPR[2], parGroupe.HOR[1], parGroupe.DR[0]];
  const scrutins = sujet
    ? [
        { scrutin_id: "VTANR5L17V4401", date: "2025-11-19", titre: "Amendement n° 2470 au PLF 2026, date d'entrée en vigueur de la taxe", url: `${AN}/dyn/17/scrutins/4401` },
        { scrutin_id: "VTANR5L17V4388", date: "2025-11-18", titre: "Amendement n° 2384 au PLF 2026, seuil de la franchise douanière", url: `${AN}/dyn/17/scrutins/4388` },
        { scrutin_id: "VTANR5L17V4375", date: "2025-11-17", titre: "Article 21 du PLF 2026, droits de douane sur les colis", url: `${AN}/dyn/17/scrutins/4375` },
      ]
    : [
        { scrutin_id: "VTANR5L17V9730", date: "2026-11-02", titre: "Amendement n° 3140 au PLF 2027, taxe sur les holdings patrimoniales", url: `${AN}/dyn/17/scrutins/9730` },
        { scrutin_id: "VTANR5L17V9712", date: "2026-10-31", titre: "Amendement n° 2841 au PLF 2027, taxe Zucman", url: `${AN}/dyn/17/scrutins/9712` },
        { scrutin_id: "VTANR5L17V9759", date: "2026-11-04", titre: "Première partie du projet de loi de finances pour 2027, ensemble (rejet)", url: `${AN}/dyn/17/scrutins/9759` },
      ];
  const nEcarts = [2, 1, 3, 2, 1, 3];
  return ids.map((id, i) => {
    const dep = deputes.find((x) => x.id === id)!;
    const loy = r2(0.66 + i * 0.03);
    return {
      id,
      groupe_id: dep.groupe_id!,
      rang: i + 1,
      score_imprevisibilite: r2(1 - loy),
      loyaute_12m: loy,
      base: "sujet",
      ecarts: scrutins.slice(0, nEcarts[i]).map((s, j) => ({
        ...s,
        vote: j === 1 ? "abstention" : "pour",
        position_groupe: i === 3 && j === 0 ? null : "contre",
        groupe_id_au_vote: dep.groupe_id!,
      })),
    };
  });
}

// Amendement réel de suppression de l'article 22 par le RN (rendu-final.md, section 6).
const AMD_806 = "AMANR5L17PO838901B1906P1D1N000806";
const AMD_806_URL = `${AN}/dyn/17/amendements/${AMD_806}`;

function amendementsTexte(d: DossierDef): Texte["amendements"] {
  const sujet = d.id === "petits-colis";
  const pref = `AMANR5L17PO59048B${d.texte_id.slice(-4)}P1D1N`;
  const url = (n: string) => `${AN}/dyn/17/amendements/${d.texte_id.slice(-4)}/AN/${n}`;
  if (!sujet) {
    const p = (proba_pour: number, confiance: number) => ({ proba_pour, confiance, modele: "orcet-v2", date: "2026-11-03" });
    return [
      { id: pref + "003140", numero: "3140", url: url("3140"), auteur_id: parGroupe.DEM[0], cosignataires_ids: [parGroupe.LIOT[0], parGroupe.RN[1], parGroupe.DEM[2]], groupe_id: G.DEM, resume: "Crée une taxe de 0,5 % sur l'actif net non réinvesti des holdings patrimoniales.", sort: "adopte", prediction: p(0.54, 0.6) },
      { id: pref + "002841", numero: "2841", url: url("2841"), auteur_id: parGroupe.SOC[0], cosignataires_ids: [parGroupe.EcoS[0], parGroupe.GDR[0]], groupe_id: G.SOC, resume: "Crée une taxe de 2 % sur le patrimoine au-delà de 100 millions d'euros (taxe Zucman).", sort: "rejete", prediction: p(0.38, 0.8) },
      { id: pref + "002988", numero: "2988", url: url("2988"), auteur_id: parGroupe.EcoS[0], cosignataires_ids: [parGroupe["LFI-NFP"][0]], groupe_id: G.EcoS, resume: "Porte la taxe Zucman à 3 % sur les patrimoines de plus de 100 millions d'euros.", sort: "rejete", prediction: p(0.3, 0.82) },
      { id: pref + "003107", numero: "3107", url: url("3107"), auteur_id: parGroupe.EPR[2], cosignataires_ids: [parGroupe.EPR[1], parGroupe.HOR[0]], groupe_id: G.EPR, resume: "Exclut les holdings animatrices du champ de la taxe sur la fortune improductive.", sort: "adopte", prediction: p(0.57, 0.63) },
      { id: pref + "001187", numero: "1187", url: url("1187"), auteur_id: parGroupe.RN[0], cosignataires_ids: [parGroupe.RN[1], parGroupe.RN[2]], groupe_id: G.RN, resume: "Supprime la taxe sur la fortune improductive.", sort: "rejete", prediction: p(0.44, 0.7) },
      { id: pref + "003301", numero: "3301", url: url("3301"), auteur_id: parGroupe.EPR[1], cosignataires_ids: [], groupe_id: G.EPR, resume: "Demande un rapport sur le rendement de la taxe sur la fortune improductive.", sort: "retire", prediction: p(0.61, 0.55) },
      { id: pref + "003550", numero: "3550", url: url("3550"), auteur_id: NI1, cosignataires_ids: [], groupe_id: null, resume: "Exonère les holdings familiales de moins de 50 millions d'euros d'actif.", sort: "non_examine", prediction: p(0.22, 0.77) },
      { id: pref + "003602", numero: "3602", url: url("3602"), auteur_id: parGroupe.HOR[0], cosignataires_ids: [parGroupe.HOR[1]], groupe_id: G.HOR, resume: "Exonère les holdings qui réinvestissent leur actif dans les 24 mois.", sort: "tombe", prediction: null },
    ];
  }
  // Rejoué à la veille du vote (date_reference 2025-11-19) : l'article 22 n'est pas encore voté.
  const p = (proba_pour: number, confiance: number) => ({ proba_pour, confiance, modele: "orcet-v2", date: "2025-11-19" });
  return [
    { id: AMD_806, numero: "806", url: AMD_806_URL, auteur_id: parGroupe.RN[1], cosignataires_ids: [parGroupe.RN[0], parGroupe.RN[2]], groupe_id: G.RN, resume: "Supprime l'article 22 (taxe sur les petits colis).", sort: "en_attente", prediction: p(0.24, 0.78) },
    { id: pref + "002231", numero: "2231", url: url("2231"), auteur_id: parGroupe.EPR[0], cosignataires_ids: [parGroupe.DEM[2], parGroupe.HOR[0]], groupe_id: G.EPR, resume: "Amendement de compromis : précise le mode de paiement de la taxe de 2 euros par colis de moins de 150 euros, à la charge de la plateforme.", sort: "en_attente", prediction: p(0.71, 0.8) },
    { id: pref + "002384", numero: "2384", url: url("2384"), auteur_id: parGroupe.RN[1], cosignataires_ids: [parGroupe.RN[0]], groupe_id: G.RN, resume: "Relève le seuil de la franchise douanière à 300 euros.", sort: "rejete", prediction: p(0.29, 0.73) },
    { id: pref + "002470", numero: "2470", url: url("2470"), auteur_id: parGroupe.DR[1], cosignataires_ids: [parGroupe.DR[0]], groupe_id: G.DR, resume: "Avance l'entrée en vigueur de la taxe au 1er janvier 2026.", sort: "adopte", prediction: p(0.64, 0.66) },
    { id: pref + "002512", numero: "2512", url: url("2512"), auteur_id: parGroupe["LFI-NFP"][2], cosignataires_ids: [parGroupe.GDR[0]], groupe_id: G["LFI-NFP"], resume: "Porte la taxe à 5 euros par colis.", sort: "en_attente", prediction: p(0.33, 0.7) },
    { id: pref + "002601", numero: "2601", url: url("2601"), auteur_id: parGroupe.SOC[0], cosignataires_ids: [parGroupe.EcoS[1]], groupe_id: G.SOC, resume: "Affecte le produit de la taxe au fonds de soutien au commerce de proximité.", sort: "en_attente", prediction: null },
    { id: pref + "002733", numero: "2733", url: url("2733"), auteur_id: NI2, cosignataires_ids: [], groupe_id: null, resume: "Exonère les colis en provenance des collectivités d'outre-mer.", sort: "en_attente", prediction: p(0.48, 0.51) },
  ];
}

function positionsDe(d: DossierDef): Texte["positions"] {
  const sujet = d.id === "petits-colis";
  const n = sujet ? 3 : 2;
  const base = sujet ? "3 scrutins liés" : "2 scrutins liés";
  const rows: [string, "pour" | "contre" | "abstention" | "divise" | null, number, string][] = sujet
    ? [["RN", "contre", 0.86, "12 amendements"], ["EPR", "pour", 0.91, "8 amendements"], ["LFI-NFP", "pour", 0.58, "9 amendements"], ["SOC", "divise", 0.52, "4 amendements"], ["DR", "pour", 0.83, "6 amendements"], ["EcoS", "pour", 0.69, "3 amendements"], ["DEM", "pour", 0.88, "5 amendements"], ["HOR", "pour", 0.85, "2 amendements"], ["LIOT", "divise", 0.5, "2 amendements"], ["GDR", "pour", 0.64, "3 amendements"], ["UDR", "pour", 0.8, "1 amendement"]]
    : [["RN", "divise", 0.5, "12 amendements"], ["EPR", "contre", 0.78, "8 amendements"], ["LFI-NFP", "pour", 0.9, "9 amendements"], ["SOC", "pour", 0.88, "4 amendements"], ["DR", "contre", 0.85, "6 amendements"], ["EcoS", "pour", 0.86, "3 amendements"], ["DEM", "divise", 0.47, "5 amendements"], ["HOR", "contre", 0.74, "2 amendements"], ["LIOT", null, 0.3, "2 amendements"], ["GDR", "pour", 0.82, "3 amendements"], ["UDR", "contre", 0.8, "1 amendement"]];
  return rows.map(([sigle, position, confiance, amd]) => ({ groupe_id: G[sigle], position, confiance, base: `${base}, ${amd}`, n_scrutins_sujet: n }));
}

const config: Config = {
  produit: { nom: "Bascule", accroche: "Bascule vous dit quel vote peut basculer, et grâce à qui." },
  dataset: "fixtures",
  dossiers: DOSSIERS.map((d) => ({ id: d.id, label: d.label, client: d.client, objectifs: d.objectifs, mesure: d.mesure, date_reference: d.date_reference, texte_id: d.texte_id, etat: d.etat, sujet: d.sujet, pivot_demo: d.id === "petits-colis" ? pivotsDe(d)[0].id : null })),
  dossier_demo: "petits-colis",
  cohesion: {
    paires_demo: [[G.RN, G.EPR]],
    curseur_presets: [
      { label: "Avant la censure Barnier", date: "2024-11-15" },
      { label: "Avant la censure Bayrou", date: "2025-08-25" },
      { label: "Aujourd'hui", date: "2026-11-14" },
    ],
  },
};
ecrire<Config>(ConfigSchema, null, "config", config);

for (const d of DOSSIERS) {
  const sujet = d.id === "petits-colis";
  const pivots = pivotsDe(d);
  const amds = amendementsTexte(d);

  ecrire<Texte>(TexteSchema, d.id, "texte", {
    meta: meta("pipeline/pivots", d.id, [{ label: "Hémicycle API textes et amendements", url: `https://api.hemicycle.ai/v1/textes/${d.texte_id}` }, { label: "Orcet", url: "https://api.hemicycle.ai/v1/orcet/predictions" }], sujet ? "Positions calculées sur 3 scrutins nominatifs liés au sujet." : "Positions calculées sur 2 scrutins nominatifs liés au sujet ; première partie rejetée le 4 novembre 2026."),
    texte: { id: d.texte_id, titre: d.titre, etape: d.etape, url: d.url },
    positions: positionsDe(d),
    amendements: amds,
  });

  ecrire<Pivots>(PivotsSchema, d.id, "pivots", {
    meta: meta("pipeline/pivots", d.id, [{ label: "Hémicycle API loyauté", url: "https://api.hemicycle.ai/v1/agregats/loyaute-deputes" }], sujet ? "Base sujet : 3 scrutins nominatifs liés." : "Base sujet : 2 scrutins nominatifs liés, plus le scrutin de rejet de la première partie."),
    deputes: pivots,
  });

  const hatvp: Hatvp = {
    meta: meta("pipeline/collecte", d.id, [{ label: "Hémicycle API entreprises (HATVP)", url: "https://api.hemicycle.ai/v1/entreprises" }], "Déclarations HATVP mentionnant le texte ; identifiants HATVP non vérifiés dans les fixtures."),
    organisations: sujet
      ? [
          { hatvp_id: ORG.alibaba.hatvp_id!, nom: "Alibaba France", type: "entreprise", fiche_url: "https://www.hatvp.fr/fiche-organisation/?organisation=530476110", objet: "Taxe sur les petits colis, PLF 2026", actions: ["rencontre", "transmission d'expertise"] },
          { hatvp_id: ORG.fevad.hatvp_id!, nom: "Fevad", type: "federation", fiche_url: "https://www.hatvp.fr/fiche-organisation/?organisation=812604106", objet: "Franchise douanière et taxe sur les petits colis", actions: ["rencontre", "envoi de position"] },
        ]
      : [
          { hatvp_id: ORG.afep.hatvp_id!, nom: "Afep", type: "association", fiche_url: "https://www.hatvp.fr/fiche-organisation/?organisation=317486009", objet: "Taxe sur les holdings et la fortune improductive, PLF 2027", actions: ["rencontre", "transmission d'expertise"] },
          { hatvp_id: ORG.medef.hatvp_id!, nom: "Medef", type: "federation", fiche_url: "https://www.hatvp.fr/fiche-organisation/?organisation=425088391", objet: "Fiscalité du patrimoine, PLF 2027", actions: ["rencontre"] },
          { hatvp_id: ORG.franceinvest.hatvp_id!, nom: "France Invest", type: "federation", fiche_url: "https://www.hatvp.fr/fiche-organisation/?organisation=602514378", objet: "Taxe sur les holdings patrimoniales, PLF 2027", actions: ["envoi de position"] },
        ],
  };
  ecrire<Hatvp>(HatvpSchema, d.id, "hatvp", hatvp);

  const rapportUrl = (n: number) => `${AN}/dyn/17/rapports/cion_fin/l17b${n}-tii.html`;
  const crUrl = (date: string, lieu: "seance" | "commission") =>
    lieu === "seance"
      ? `${AN}/dyn/17/comptes-rendus/seance/session-ordinaire-de-${date.slice(0, 4)}/seance-du-${date}`
      : `${AN}/dyn/17/comptes-rendus/cion_fin/l17cion_fin${date.replace(/-/g, "")}`;

  const disponibles: string[] = [];
  const absents: string[] = [];

  pivots.forEach((p, i) => {
    const pa = p.id;
    const dep = deputes.find((x) => x.id === pa)!;
    const auxFinances = dep.commissions.includes(FINANCES);
    const vide = i === 4; // un pivot avec auditions vides et couverture 0

    const auditions: Auditions = {
      meta: meta("pipeline/auditions", d.id, SOURCES_AN, vide ? "Aucun rapport rattaché à ce député sur ce texte." : "Annexes « personnes entendues » des rapports de la commission des finances, extraites par Featherless."),
      depute_id: pa,
      auditions: vide
        ? []
        : [
            {
              texte_id: d.texte_id, rapport_url: rapportUrl(sujet ? 1990 : 3302), date: sujet ? "2025-10-16" : "2026-10-15",
              role: i === 0 ? "rapporteur_general" : auxFinances ? "membre" : "rapporteur_avis",
              organisations: sujet ? [ORG.fevad, ORG.alibaba, ORG.douane] : [ORG.afep, ORG.medef, ORG.dgfip],
            },
            ...(i < 2 ? [{ texte_id: d.texte_id, rapport_url: null, date: sujet ? "2025-10-22" : "2026-10-20", role: "membre" as const, organisations: sujet ? [ORG.medef] : [ORG.franceinvest, ORG.cpo] }] : []),
          ],
      couverture: vide ? { rapports_total: 0, rapports_avec_liste: 0 } : { rapports_total: 4, rapports_avec_liste: i < 2 ? 2 : 1 },
    };
    ecrire<Auditions>(AuditionsSchema, d.id, "auditions", auditions, pa);

    const citations = sujet
      ? [
          { date: "2025-11-19", lieu: "seance" as const, citation: "Cette taxe pèse d'abord sur les ménages modestes qui achètent en ligne faute de mieux." },
          { date: "2025-10-28", lieu: "commission" as const, citation: "Je ne voterai pas une taxe que la douane ne peut pas percevoir au 1er janvier." },
          { date: "2025-11-18", lieu: "seance" as const, citation: "Les plateformes qui expédient des millions de colis par an doivent participer au financement de nos douanes." },
        ]
      : [
          { date: "2026-11-02", lieu: "seance" as const, citation: "Taxer les holdings, c'est taxer l'outil de travail de ceux qui investissent en France." },
          { date: "2026-10-14", lieu: "commission" as const, citation: "Une taxe sur la fortune improductive ne rapportera rien si les holdings animatrices en sont exclues." },
          { date: "2026-10-31", lieu: "seance" as const, citation: "La taxe Zucman n'est pas un impôt sur l'entreprise, c'est un impôt sur l'accumulation." },
        ];
    const nCit = [3, 2, 1, 2, 0, 1][i];
    const debats: Debats = {
      meta: meta("pipeline/debats", d.id, [{ label: "Comptes rendus de séance (syseron)", url: "https://data.assemblee-nationale.fr/travaux-parlementaires/debats" }], "Interventions avec identifiant d'orateur uniquement ; commission lue en HTML."),
      depute_id: pa,
      debats: citations.slice(0, nCit).map((c) => ({ ...c, texte_id: d.texte_id, url: crUrl(c.date, c.lieu) })),
      couverture: { comptes_rendus_lus: nCit === 0 ? 4 : 9 },
    };
    ecrire<Debats>(DebatsSchema, d.id, "debats", debats, pa);

    const miens = amds.filter((a) => a.auteur_id === pa || a.cosignataires_ids.includes(pa));
    const amendements: Amendements = {
      meta: meta("pipeline/amendements", d.id, [{ label: "Hémicycle API amendements", url: "https://api.hemicycle.ai/v1/amendements" }], "Mention « travaillé avec » extraite de l'exposé des motifs."),
      depute_id: pa,
      amendements: miens.map((a) => ({
        id: a.id, texte_id: d.texte_id, role: a.auteur_id === pa ? "auteur" : "cosignataire", resume: a.resume, sort: a.sort,
        travaille_avec: a.numero === "3140" ? ["France Invest"] : a.numero === "3107" ? ["Afep"] : a.numero === "2231" ? ["Fevad"] : a.numero === "2384" ? ["Alibaba France"] : a.numero === "806" ? ["Alibaba France", "Fevad"] : [],
        url: a.url,
      })),
    };
    ecrire<Amendements>(AmendementsSchema, d.id, "amendements", amendements, pa);

    if (i >= 4) {
      absents.push(pa);
      return;
    }
    disponibles.push(pa);

    let synthese: Fiche["synthese"];
    if (i === 0) {
      synthese = sujet
        ? { position_probable: "Auteur de l'amendement de suppression n° 806 ; votera contre l'article 22 avec son groupe.", argument: "Lui fournir l'estimation du coût de la taxe pour les ménages modestes afin d'étayer son intervention en séance du 20 novembre 2025.", chiffres_utilises: ["806", "22", "2025-11-20"], mode: "llm", modele: "Qwen/Qwen3.8-27B", verifie: true, date: "2025-11-19" }
        : { position_probable: "Auteur de la taxe de 0,5 % sur les holdings patrimoniales (n° 3140) ; favorable à une taxe ciblée, hostile à la taxe Zucman.", argument: "Présenter le nombre de holdings animatrices de sa circonscription touchées par le n° 3140 et proposer l'exonération des réinvestissements sous 24 mois du n° 3602.", chiffres_utilises: ["0.5", "3140", "24", "3602"], mode: "llm", modele: "Qwen/Qwen3.8-27B", verifie: true, date: "2026-11-14" };
    } else if (i === 1) {
      synthese = sujet
        ? { position_probable: "Favorable à la taxe et auteur du compromis n° 2231 sur le mode de paiement ; attentif à sa perception effective par la douane.", argument: "Apporter l'écart entre les 500 millions d'euros de recettes annoncés et la capacité de contrôle réelle de la douane.", chiffres_utilises: ["2231", "500", "1000000"], mode: "llm", modele: "Qwen/Qwen3.8-27B", verifie: true, date: "2025-11-19" }
        : { position_probable: "A cosigné le n° 3140 malgré la position divisée de son groupe ; hostile à la taxe Zucman (n° 2841).", argument: "Rappeler son vote contre le n° 2841 le 31 octobre 2026 et chiffrer l'effet du n° 3140 sur les holdings familiales de moins de 50 millions d'euros.", chiffres_utilises: ["3140", "2841", "2026-10-31", "50", "1000000"], mode: "llm", modele: "Qwen/Qwen3.8-27B", verifie: true, date: "2026-11-14" };
    } else if (i === 2) {
      // Gabarit de secours : texte sans modèle, chiffres pris dans les données.
      synthese = { position_probable: `Position déduite de ${p.ecarts.length} écarts avec son groupe sur 12 mois ; loyauté ${p.loyaute_12m}.`, argument: `Aborder le député sur l'amendement n° ${miens[0]?.id.slice(-4).replace(/^0+/, "") ?? amds[0].numero} ${miens[0] ? "qu'il a " + (miens[0].auteur_id === pa ? "déposé" : "cosigné") : "en discussion"} et sur les organisations entendues en commission.`, chiffres_utilises: [String(p.ecarts.length), "12", String(p.loyaute_12m), miens[0]?.id.slice(-4).replace(/^0+/, "") ?? amds[0].numero], mode: "gabarit", modele: null, verifie: true, date: "2026-11-14" };
    } else {
      synthese = null; // pas encore produite
    }
    if (synthese) assertChiffres(`${d.id}/fiches/${pa}`, `${synthese.position_probable} ${synthese.argument}`, synthese.chiffres_utilises);

    const fiche: Fiche = {
      meta: meta("pipeline/fiches", d.id, [...auditions.meta.sources, ...debats.meta.sources, ...amendements.meta.sources, ...hatvp.meta.sources], "Fusion des trois producteurs et de la HATVP ; synthèse vérifiée par qa/verif.ts."),
      depute_id: pa,
      auditions: auditions.auditions,
      debats: debats.debats,
      amendements: amendements.amendements,
      hatvp: hatvp.organisations,
      synthese,
      couverture: { ...auditions.couverture, ...debats.couverture },
    };
    ecrire<Fiche>(FicheSchema, d.id, "fiche", fiche, pa);
  });

  ecrire<FichesIndex>(FichesIndexSchema, d.id, "fiches-index", {
    meta: meta("pipeline/fiches", d.id, [], `${disponibles.length} fiches produites sur ${pivots.length} pivots.`),
    disponibles,
    absents,
  });

  const note: Note = sujet
    ? {
        meta: meta("pipeline/note", d.id, [{ label: "Amendement n° 806", url: AMD_806_URL }, { label: "HATVP, Alibaba France", url: "https://www.hatvp.fr/fiche-organisation/?organisation=530476110" }], "Rejoué à la date de référence du 19 novembre 2025, veille du vote de l'article 22 ; prédictions Orcet du même jour."),
        client: d.client,
        objectifs: d.objectifs,
        texte: "À la veille du vote de l'article 22, la taxe de 2 euros par colis de moins de 150 euros est portée par le gouvernement et soutenue par 9 groupes sur 11 ; seul le RN annonce un vote contre, les socialistes et LIOT sont divisés. L'amendement de suppression n° 806 du RN est en attente ; Orcet lui prédit 24 % de votes pour, avec une confiance de 0.78. L'amendement de compromis n° 2231 sur le mode de paiement, qui lève la réserve de LFI, est prédit à 71 % de votes pour. Sur les 7 amendements du sujet, 2 ont déjà été tranchés : le relèvement de la franchise à 300 euros (n° 2384) a été rejeté le 18 novembre 2025 et l'entrée en vigueur au 1er janvier 2026 (n° 2470) a été adoptée le 19 novembre 2025. Les 6 pivots identifiés sur 3 scrutins liés ont une loyauté de 12 mois comprise entre 0.66 et 0.81 ; 4 ont une fiche d'approche. Alibaba France a déclaré 2 actions à la HATVP sur ce texte. Objectif du client : empêcher le vote de la taxe ; probabilité estimée 12 %.",
        chiffres_utilises: ["22", "2", "150", "9", "11", "806", "0.24", "0.78", "2231", "0.71", "7", "300", "2384", "2025-11-18", "2026-01-01", "2470", "2025-11-19", "6", "3", "12", "0.66", "0.81", "4", "0.12"],
        sources: [{ label: "Amendement n° 806, Assemblée nationale", url: AMD_806_URL }, { label: "Fiche HATVP Alibaba France", url: "https://www.hatvp.fr/fiche-organisation/?organisation=530476110" }, { label: "Prédictions Orcet", url: "https://api.hemicycle.ai/v1/orcet/predictions" }],
        limites: "Rejoué à la date de référence du 19 novembre 2025, veille du vote de l'article 22 ; prédictions Orcet du même jour.",
        mode: "llm", modele: "Qwen/Qwen3.8-27B", verifie: true,
      }
    : {
        meta: meta("pipeline/note", d.id, [{ label: "Scrutin n° 9759", url: `${AN}/dyn/17/scrutins/9759` }, { label: "Orcet", url: "https://api.hemicycle.ai/v1/orcet/predictions" }], "Prédictions Orcet du 3 novembre 2026 ; première partie rejetée le 4 novembre 2026, texte au Sénat."),
        client: d.client,
        objectifs: d.objectifs,
        texte: "La première partie du PLF 2027 a été rejetée par l'Assemblée nationale le 4 novembre 2026 (scrutin n° 9759) : la taxe de 0,5 % sur les holdings patrimoniales (n° 3140), adoptée en séance le 2 novembre 2026, tombe avec elle, de même que l'exclusion des holdings animatrices (n° 3107). La taxe Zucman (n° 2841) avait été rejetée le 31 octobre 2026. Le texte est au Sénat, qui repart du projet initial. Sur les 8 amendements du sujet, 2 ont été adoptés et 3 rejetés ; Orcet prédisait 54 % de votes pour sur le n° 3140 avec une confiance de 0.6. Le RN et les Démocrates sont divisés, LIOT n'a pas de position ; la gauche, 4 groupes, soutient une taxe sur les holdings. Les 6 pivots identifiés sur 2 scrutins liés ont une loyauté de 12 mois comprise entre 0.66 et 0.81 ; 4 ont une fiche d'approche. L'Afep, le Medef et France Invest ont déclaré une action à la HATVP. Risque principal : le retour du n° 3140 en nouvelle lecture. Probabilité estimée que l'objectif soit atteint : 64 %.",
        chiffres_utilises: ["2026-11-04", "9759", "0.5", "3140", "2026-11-02", "3107", "2841", "2026-10-31", "8", "2", "3", "0.54", "0.6", "4", "6", "12", "0.66", "0.81", "0.64"],
        sources: [{ label: "Scrutin n° 9759, Assemblée nationale", url: `${AN}/dyn/17/scrutins/9759` }, { label: "Prédictions Orcet", url: "https://api.hemicycle.ai/v1/orcet/predictions" }, { label: "Rapport de la commission des finances n° 3302", url: rapportUrl(3302) }],
        limites: "Prédictions Orcet du 3 novembre 2026 ; première partie rejetée le 4 novembre 2026, texte au Sénat.",
        mode: "llm", modele: "Qwen/Qwen3.8-27B", verifie: true,
      };
  assertChiffres(`${d.id}/note`, note.texte, note.chiffres_utilises);
  ecrire<Note>(NoteSchema, d.id, "note", note);

  // ---------- tableau de bord (rendu-final.md) ----------
  // pr = déduction de l'outil ; fait = publié par l'Assemblée ; inconnu = on ne sait pas.
  const pr = (raisonnement: string, ...sources: { label: string; url: string }[]): Preuve => ({ sources, raisonnement, nature: "deduction" });
  const fait = (raisonnement: string, ...sources: { label: string; url: string }[]): Preuve => ({ sources, raisonnement, nature: "fait" });
  const inconnu = (raisonnement: string, ...sources: { label: string; url: string }[]): Preuve => ({ sources, raisonnement, nature: "inconnue" });
  const srcTexte = { label: `Texte ${d.texte_id}`, url: d.url };
  const srcOrcet = { label: "Prédictions Orcet", url: "https://api.hemicycle.ai/v1/orcet/predictions" };
  const srcScrutins = { label: "Hémicycle API scrutins", url: "https://api.hemicycle.ai/v1/scrutins" };
  const amdUrl = (n: string) => amds.find((a) => a.numero === n)!.url;
  const srcAmd = (n: string) => ({ label: `Amendement n° ${n}`, url: amdUrl(n) });
  const aFiche = (pa: string) => disponibles.includes(pa);
  const groupeDe = (pa: string) => deputes.find((x) => x.id === pa)!.groupe_id!;
  const nomDe = (pa: string) => { const x = deputes.find((y) => y.id === pa)!; return `${x.prenom} ${x.nom}`; };
  type Fond = ("dit" | "depose" | "vote")[];
  const dAction = (pa: string, score: number, raison: string, fondement: Fond, preuve: Preuve): Action["groupes"]["allies"][number] => ({ depute_id: pa, groupe_id: groupeDe(pa), score, raison, fiche: aFiche(pa), fondement, position_connue: fondement.length > 0, preuve });
  const seanceUrl = (date: string) => crUrl(date, "seance");
  const commissionUrl = (date: string) => crUrl(date, "commission");
  const metaTB = (producer: string, limits: string) => meta(producer, d.id, [srcTexte, srcOrcet, srcScrutins], limits);

  let verdict: Verdict;
  let nouveautes: Nouveautes;
  let suite: Suite;
  let action: Action;
  let etat: Etat;

  if (sujet) {
    const RN1 = parGroupe.RN[1], RN0 = parGroupe.RN[0], EPR0 = parGroupe.EPR[0], LFI2 = parGroupe["LFI-NFP"][2], SOC0 = parGroupe.SOC[0], LIOT0 = parGroupe.LIOT[0], DR1 = parGroupe.DR[1], DEM2 = parGroupe.DEM[2];
    verdict = {
      meta: metaTB("pipeline/verdict", "Rejoué à la date de référence du 19 novembre 2025. Avis du rapporteur général et du gouvernement pris en compte, visibles dans les preuves."),
      verdicts: [
        {
          objectif_rang: 1,
          situation: "defavorable",
          score: 0.12,
          tendance: "degradation",
          confiance: {
            niveau: "elevee",
            etabli: ["Positions des 11 groupes sur 3 scrutins liés", "Amendement de suppression n° 806 déposé par le RN", "Avis favorable du gouvernement et du rapporteur général"],
            inconnu: ["Vote de LFI : réserve levée par le compromis n° 2231, non confirmée par un scrutin"],
          },
          lecture: { texte: "La mesure est portée par le gouvernement et soutenue par 9 groupes sur 11 ; seul le RN annonce un vote contre.", chiffres_utilises: ["9", "11"], mode: "llm", modele: "Qwen/Qwen3.8-27B", verifie: true },
          favorable: [
            { titre: "Le RN a déposé un amendement de suppression de l'article 22", detail: "L'amendement n° 806 supprime l'article 22 ; le RN, 121 députés, annonce un vote contre en séance.", preuve: fait("Un groupe de 121 députés porte la position du client. Il reste minoritaire sans le soutien d'au moins un autre groupe.", srcAmd("806"), { label: "Positions des groupes", url: "https://api.hemicycle.ai/v1/agregats/positions-groupes" }) },
          ],
          bloquant: [
            { titre: "Le gouvernement prépare un amendement de compromis sur le mode de paiement", detail: "L'amendement n° 2231 met la taxe à la charge de la plateforme, ce qui lève la réserve de LFI sur les ménages.", preuve: pr("Avec LFI, le socle gouvernemental et la droite, l'article dispose d'une majorité large. Orcet prédit 71 % de votes pour sur le compromis.", srcAmd("2231"), srcOrcet) },
            { titre: "Socle gouvernemental et Droite Républicaine favorables", detail: "EPR, DEM, HOR et DR affichent une position pour avec une confiance supérieure à 0.8 sur 3 scrutins liés.", preuve: pr("Positions majoritaires calculées sur les scrutins des 17, 18 et 19 novembre 2025.", srcScrutins) },
          ],
          cause_du_changement: { evenement_id: "ev-2231", titre: "Dépôt du compromis n° 2231 sur le mode de paiement", preuve: fait("Déposé le 19 novembre 2025 ; retire à LFI son motif d'abstention.", srcAmd("2231")) },
        },
        {
          objectif_rang: 2,
          situation: "insuffisant",
          score: null,
          tendance: "stable",
          confiance: { niveau: "faible", etabli: ["Montant de 2 euros dans le texte initial"], inconnu: ["Aucun amendement de réduction du montant déposé", "Position du Sénat sur le montant"] },
          lecture: { texte: "Aucun amendement ne réduit le montant de 2 euros ; le n° 2512 le porte à 5 euros.", chiffres_utilises: ["2", "2512", "5"], mode: "llm", modele: "Qwen/Qwen3.8-27B", verifie: true },
          favorable: [],
          bloquant: [
            { titre: "Le seul amendement sur le montant l'augmente", detail: "Le n° 2512 (LFI) porte la taxe à 5 euros par colis.", preuve: fait("Dépôt du n° 2512 ; Orcet prédit 33 % de votes pour.", srcAmd("2512"), srcOrcet) },
          ],
          cause_du_changement: null,
        },
        {
          objectif_rang: 3,
          situation: "defavorable",
          score: 0.2,
          tendance: "degradation",
          confiance: { niveau: "elevee", etabli: ["Amendement n° 2470 adopté le 19 novembre 2025 : entrée en vigueur au 1er janvier 2026"], inconnu: ["Capacité de la douane à percevoir la taxe dès janvier 2026"] },
          lecture: { texte: "L'entrée en vigueur a été avancée au 1er janvier 2026 par le n° 2470, adopté le 19 novembre 2025.", chiffres_utilises: ["2026-01-01", "2470", "2025-11-19"], mode: "llm", modele: "Qwen/Qwen3.8-27B", verifie: true },
          favorable: [
            { titre: "La douane doute de pouvoir percevoir la taxe dès janvier", detail: "Un pivot a dit en commission qu'il ne voterait pas une taxe que la douane ne peut pas percevoir au 1er janvier.", preuve: fait("Intervention en commission des finances le 28 octobre 2025.", { label: "Commission des finances, 28 octobre 2025", url: commissionUrl("2025-10-28") }) },
          ],
          bloquant: [
            { titre: "Entrée en vigueur avancée au 1er janvier 2026", detail: "Scrutin n° 4401 du 19 novembre 2025.", preuve: fait("Amendement n° 2470 adopté.", srcAmd("2470"), { label: "Scrutin n° 4401", url: `${AN}/dyn/17/scrutins/4401` }) },
          ],
          cause_du_changement: { evenement_id: "ev-2470", titre: "Adoption du n° 2470 (entrée en vigueur au 1er janvier 2026)", preuve: fait("Scrutin n° 4401.", { label: "Scrutin n° 4401", url: `${AN}/dyn/17/scrutins/4401` }) },
        },
      ],
    };
    nouveautes = {
      meta: metaTB("pipeline/nouveautes", "Événements jusqu'au 19 novembre 2025 inclus (date de référence)."),
      evenements: [
        { id: "ev-2231", date: "2025-11-19", type: "amendement_depose", importance: 3, titre: "Amendement de compromis n° 2231 déposé", detail: "Mode de paiement de la taxe à la charge de la plateforme ; lève la réserve de LFI.", url: amdUrl("2231"), effet: "affaiblit", objectif_rang: 1, preuve: fait("Le compromis retire à LFI son motif d'abstention : la majorité en faveur de l'article s'élargit.", srcAmd("2231")) },
        { id: "ev-806", date: "2025-11-17", type: "amendement_depose", importance: 3, titre: "Amendement de suppression n° 806 déposé par le RN", detail: "Suppression de l'article 22.", url: AMD_806_URL, effet: "renforce", objectif_rang: 1, preuve: fait("Seul amendement qui supprime la mesure ; porte la position du client.", srcAmd("806")) },
        { id: "ev-2470", date: "2025-11-19", type: "scrutin", importance: 2, titre: "Amendement n° 2470 adopté : entrée en vigueur au 1er janvier 2026", detail: "Scrutin n° 4401.", url: `${AN}/dyn/17/scrutins/4401`, effet: "affaiblit", objectif_rang: 3, preuve: fait("Le calendrier avancé montre que la majorité veut une application rapide.", srcScrutins) },
        { id: "ev-2384", date: "2025-11-18", type: "scrutin", importance: 2, titre: "Amendement n° 2384 rejeté (franchise à 300 euros)", detail: "Scrutin n° 4388.", url: `${AN}/dyn/17/scrutins/4388`, effet: "affaiblit", objectif_rang: 2, preuve: fait("Le rejet du relèvement de franchise confirme l'isolement du RN sur le sujet.", srcScrutins) },
        { id: "ev-hatvp", date: "2025-11-14", type: "hatvp", importance: 1, titre: "Alibaba France déclare une rencontre à la HATVP", detail: "Objet : taxe sur les petits colis, PLF 2026.", url: "https://www.hatvp.fr/fiche-organisation/?organisation=530476110", effet: "neutre", objectif_rang: 1, preuve: fait("Déclaration publique du client lui-même ; sans effet sur le vote.", { label: "HATVP", url: "https://www.hatvp.fr/" }) },
        { id: "ev-agenda", date: "2025-11-12", type: "agenda", importance: 1, titre: "Article 22 inscrit à l'ordre du jour de la séance du 20 novembre", detail: "Conférence des présidents.", url: `${AN}/dyn/17/ordre-du-jour`, effet: "neutre", objectif_rang: 1, preuve: fait("Fixe la date limite d'action.", { label: "Ordre du jour", url: `${AN}/dyn/17/ordre-du-jour` }) },
      ],
    };
    suite = {
      meta: metaTB("pipeline/suite", "Échéances connues au 19 novembre 2025."),
      echeances: [
        { date: "2025-11-20", titre: "Examen de l'article 22 en séance publique", lieu: "seance", url: `${AN}/dyn/17/ordre-du-jour`, preuve: fait("Inscrit à l'ordre du jour par la conférence des présidents du 12 novembre 2025.", { label: "Ordre du jour", url: `${AN}/dyn/17/ordre-du-jour` }) },
        { date: "2025-11-25", titre: "Vote solennel sur la première partie du PLF 2026", lieu: "seance", url: `${AN}/dyn/17/ordre-du-jour`, preuve: fait("Date annoncée par la conférence des présidents.", { label: "Ordre du jour", url: `${AN}/dyn/17/ordre-du-jour` }) },
        { date: "2025-12-01", titre: "Transmission au Sénat", lieu: "senat", url: "https://www.senat.fr/", preuve: fait("Calendrier budgétaire : le Sénat dispose de 20 jours après l'Assemblée.", { label: "Sénat", url: "https://www.senat.fr/" }) },
      ],
      derniere_occasion: { date: "2025-11-20", titre: "Séance publique du 20 novembre 2025 : dernier examen de l'article 22 à l'Assemblée en première lecture", lieu: "seance", url: `${AN}/dyn/17/ordre-du-jour`, preuve: fait("Après ce vote, la mesure ne peut plus être modifiée à l'Assemblée avant la nouvelle lecture.", { label: "Ordre du jour", url: `${AN}/dyn/17/ordre-du-jour` }) },
      probables: [
        { titre: "Adoption de l'article 22", proba: 0.88, detail: "Majorité large, RN seul contre.", preuve: pr("Positions des groupes et prédictions Orcet sur les amendements de l'article.", srcOrcet, srcScrutins) },
        { titre: "Rejet de l'amendement de suppression n° 806", proba: 0.76, detail: "Orcet prédit 24 % de votes pour.", preuve: pr("Moyenne des probabilités individuelles de voter pour : 0.24, confiance 0.78.", srcOrcet) },
        { titre: "Adoption du compromis n° 2231", proba: 0.71, detail: "Orcet prédit 71 % de votes pour.", preuve: pr("Moyenne des probabilités individuelles de voter pour : 0.71, confiance 0.8.", srcOrcet) },
        { titre: "Modification du dispositif au Sénat", proba: null, detail: "Pas de prédiction : le Sénat n'est pas couvert.", preuve: pr("Hors périmètre des données ; mentionné pour mémoire.", { label: "Sénat", url: "https://www.senat.fr/" }) },
      ],
    };
    action = {
      meta: metaTB("pipeline/action", "« pour » et « contre » qualifient la mesure, pas l'objectif du client. Un député n'est classé que sur ses propres actes."),
      decideurs: [
        { role: "gouvernement", depute_id: null, nom: "Gouvernement (ministre chargé du budget)", groupe_id: null, position: "pour", preuve: fait("Auteur de l'article 22 ; avis favorable au compromis n° 2231 et défavorable au n° 806 annoncé en séance.", srcTexte, srcAmd("2231")) },
        { role: "rapporteur_general", depute_id: parGroupe.EPR[1], nom: nomDe(parGroupe.EPR[1]), groupe_id: G.EPR, position: "pour", preuve: fait("Avis favorable à l'article 22 dans le rapport n° 1990 ; avis défavorable au n° 806.", { label: "Rapport n° 1990", url: rapportUrl(1990) }) },
        { role: "chef_de_file", depute_id: RN1, nom: nomDe(RN1), groupe_id: G.RN, position: "contre", preuve: fait("Auteur du n° 806 et orateur du groupe en séance le 19 novembre 2025.", srcAmd("806")) },
        { role: "president_commission", depute_id: parGroupe["LFI-NFP"][0], nom: nomDe(parGroupe["LFI-NFP"][0]), groupe_id: G["LFI-NFP"], position: "inconnue", preuve: inconnu("Aucune prise de position publique sur l'article 22 au 19 novembre 2025.", srcTexte) },
      ],
      groupes: {
        actionnables: [
          dAction(SOC0, 0.46, "Groupe divisé ; sensible à l'argument de la consommation populaire.", ["dit"], pr("Position du groupe : divisé (confiance 0.52). A cosigné l'affectation du produit au commerce de proximité (n° 2601).", srcAmd("2601"), srcScrutins)),
          dAction(LIOT0, 0.41, "Groupe divisé ; a dénoncé le contournement par de plus gros colis.", ["dit"], pr("Intervention en séance du 19 novembre 2025 ; groupe sans position majoritaire.", { label: "Séance du 19 novembre 2025", url: seanceUrl("2025-11-19") })),
          dAction(LFI2, 0.33, "A voté contre son groupe sur 2 des 3 scrutins liés ; reste réceptif à l'argument des ménages modestes malgré le compromis n° 2231.", ["vote"], pr("Écarts avec son groupe sur 2 des 3 scrutins liés ; loyauté 0.72 sur 12 mois.", srcScrutins)),
        ],
        allies: [
          dAction(RN1, 0.92, "Auteur de l'amendement de suppression n° 806.", ["depose"], pr("Dépôt du n° 806 le 17 novembre 2025 ; vote contre annoncé en séance.", srcAmd("806"))),
          dAction(RN0, 0.85, "Cosignataire du n° 806 ; membre de la commission des finances.", ["depose"], pr("Cosignature du n° 806 et position du groupe contre (confiance 0.86).", srcAmd("806"))),
        ],
        perdus: [
          dAction(EPR0, 0.06, "Auteur du compromis n° 2231 ; porte la mesure.", ["depose"], pr("Dépôt du n° 2231 ; position du groupe pour (confiance 0.91).", srcAmd("2231"))),
          dAction(DR1, 0.1, "A fait avancer l'entrée en vigueur (n° 2470 adopté).", ["depose"], pr("Auteur du n° 2470 adopté le 19 novembre 2025.", srcAmd("2470"))),
          dAction(DEM2, 0.09, "Cosignataire du compromis n° 2231.", ["depose"], pr("Cosignature du n° 2231 ; position du groupe pour (confiance 0.88).", srcAmd("2231"))),
        ],
      },
      arguments: {
        pour: [
          { argument: "Protéger le commerce de proximité face aux plateformes", citation: "Les plateformes qui expédient des millions de colis par an doivent participer au financement de nos douanes.", orateur_id: EPR0, groupe_id: G.EPR, date: "2025-11-18", lieu: "seance", url: seanceUrl("2025-11-18"), preuve: fait("Intervention en séance, orateur identifié par son identifiant d'acteur.", { label: "Séance du 18 novembre 2025", url: seanceUrl("2025-11-18") }) },
          { argument: "Financer les contrôles douaniers, environ 500 millions d'euros de recettes", citation: "Le rendement attendu, de l'ordre de 500 millions d'euros, financera le renforcement des contrôles.", orateur_id: null, groupe_id: null, date: "2025-11-18", lieu: "seance", url: seanceUrl("2025-11-18"), preuve: fait("Prise de parole du gouvernement (pas d'identifiant d'acteur).", { label: "Séance du 18 novembre 2025", url: seanceUrl("2025-11-18") }) },
        ],
        contre: [
          { argument: "La taxe pèse sur les ménages modestes", citation: "Cette taxe pèse d'abord sur les ménages modestes qui achètent en ligne faute de mieux.", orateur_id: RN1, groupe_id: G.RN, date: "2025-11-19", lieu: "seance", url: seanceUrl("2025-11-19"), preuve: fait("Intervention en séance, orateur identifié.", { label: "Séance du 19 novembre 2025", url: seanceUrl("2025-11-19") }) },
          { argument: "La taxe se contourne avec de plus gros colis", citation: "Une taxe par colis pousse simplement à regrouper les envois : elle ne rapportera pas ce qu'on annonce.", orateur_id: LIOT0, groupe_id: G.LIOT, date: "2025-11-19", lieu: "seance", url: seanceUrl("2025-11-19"), preuve: fait("Intervention en séance, orateur identifié.", { label: "Séance du 19 novembre 2025", url: seanceUrl("2025-11-19") }) },
        ],
      },
      contre_arguments: [
        { texte: "Les 500 millions d'euros annoncés supposent un contrôle unitaire que la douane n'assure pas : 2 euros par colis ne couvrent pas le coût d'un contrôle.", repond_a: "Financer les contrôles douaniers, environ 500 millions d'euros de recettes", chiffres_utilises: ["500", "1000000", "2"], mode: "llm", verifie: true, preuve: pr("Croise le rendement annoncé en séance et le montant de la taxe par colis dans l'article 22.", srcTexte, { label: "Séance du 18 novembre 2025", url: seanceUrl("2025-11-18") }) },
        { texte: "Le commerce de proximité ne vend pas les produits concernés : la mesure déplace la dépense des ménages, elle ne la rapatrie pas.", repond_a: "Protéger le commerce de proximité face aux plateformes", chiffres_utilises: [], mode: "gabarit", verifie: true, preuve: pr("Gabarit de secours ; à étayer avec une étude de substitution.", srcTexte) },
      ],
    };
    etat = {
      meta: metaTB("pipeline/etat", "État au 19 novembre 2025."),
      mesure: {
        label: d.mesure.label,
        article: d.mesure.article,
        dans_le_texte: true,
        redaction_actuelle: "Texte initial du gouvernement (taxe de 2 euros par article sur les colis de moins de 150 euros venant de hors d'Europe), modifié par le n° 2470 : entrée en vigueur au 1er janvier 2026. Examen en séance prévu le 20 novembre 2025.",
        modifications: [
          { date: "2025-11-19", par: "Amendement n° 2470 (Droite Républicaine)", quoi: "Entrée en vigueur avancée au 1er janvier 2026", url: amdUrl("2470"), preuve: fait("Adopté par le scrutin n° 4401.", srcAmd("2470"), { label: "Scrutin n° 4401", url: `${AN}/dyn/17/scrutins/4401` }) },
        ],
      },
      etape: "Première lecture, Assemblée nationale, séance publique, première partie",
      etapes: [
        { nom: "Dépôt du projet de loi", date: "2025-10-14", statut: "fait", url: d.url },
        { nom: "Commission des finances", date: "2025-10-22", statut: "fait", url: commissionUrl("2025-10-22") },
        { nom: "Séance publique, première partie", date: "2025-11-19", statut: "en_cours", url: seanceUrl("2025-11-19") },
        { nom: "Vote solennel sur la première partie", date: "2025-11-25", statut: "a_venir", url: `${AN}/dyn/17/ordre-du-jour` },
        { nom: "Sénat, première lecture", date: null, statut: "a_venir", url: "https://www.senat.fr/" },
      ],
      articles: [
        { numero: "21", titre: "Droits de douane sur les colis hors Union européenne", statut: "vote", sort_detail: "Adopté le 17 novembre 2025 (scrutin n° 4375)", url: `${AN}/dyn/17/scrutins/4375` },
        { numero: "22", titre: "Taxe sur les petits colis", statut: "reste", sort_detail: "Examen prévu le 20 novembre 2025 ; 7 amendements dont 5 en attente", url: d.url },
        { numero: "23", titre: "Taxe sur les emballages d'expédition", statut: "supprime", sort_detail: "Supprimé en commission des finances le 22 octobre 2025", url: commissionUrl("2025-10-22") },
      ],
    };
  } else {
    const DEM0 = parGroupe.DEM[0], RN1 = parGroupe.RN[1], LIOT0 = parGroupe.LIOT[0], EPR2 = parGroupe.EPR[2], HOR1 = parGroupe.HOR[1], DR0 = parGroupe.DR[0], SOC0 = parGroupe.SOC[0], LFI0 = parGroupe["LFI-NFP"][0], GDR0 = parGroupe.GDR[0];
    const srcRejet = { label: "Scrutin n° 9759, rejet de la première partie", url: `${AN}/dyn/17/scrutins/9759` };
    const srcSenat = { label: "Sénat, PLF 2027", url: "https://www.senat.fr/dossier-legislatif/pjlf2027.html" };
    verdict = {
      meta: metaTB("pipeline/verdict", "État au 14 novembre 2026 ; avis du rapporteur général et du gouvernement pris en compte, visibles dans les preuves."),
      verdicts: [
        {
          objectif_rang: 1,
          situation: "favorable",
          score: 0.64,
          tendance: "amelioration",
          confiance: { niveau: "moyenne", etabli: ["Rejet de la première partie le 4 novembre 2026 (scrutin n° 9759)", "Positions des groupes sur 2 scrutins liés"], inconnu: ["Position de la majorité sénatoriale sur l'article 3", "Dépôt ou non du n° 3140 en nouvelle lecture"] },
          lecture: { texte: "Le rejet de la première partie le 4 novembre 2026 fait tomber la taxe de 0,5 % sur les holdings (n° 3140) ; elle peut revenir en nouvelle lecture.", chiffres_utilises: ["2026-11-04", "0.5", "3140"], mode: "llm", modele: "Qwen/Qwen3.8-27B", verifie: true },
          favorable: [
            { titre: "La première partie du PLF 2027 a été rejetée par l'Assemblée", detail: "Scrutin n° 9759 du 4 novembre 2026 : tous les amendements adoptés en séance, dont le n° 3140, tombent.", preuve: fait("Le rejet de la première partie renvoie au Sénat le projet initial du gouvernement, sans taxe sur les holdings.", srcRejet) },
            { titre: "Le Sénat repart du texte initial", detail: "La majorité sénatoriale est hostile à toute taxe sur les holdings ; le gouvernement n'a pas redéposé la mesure.", preuve: pr("Position de la commission des finances du Sénat et absence d'amendement du gouvernement au 14 novembre 2026.", srcSenat) },
          ],
          bloquant: [
            { titre: "Le n° 3140 a réuni une majorité en séance", detail: "Adopté le 2 novembre 2026 avec le RN et les Démocrates divisés ; Orcet prédisait 54 % de votes pour.", preuve: pr("Scrutin n° 9730 et prédiction Orcet (0.54, confiance 0.6) : la majorité peut se reformer en nouvelle lecture.", { label: "Scrutin n° 9730", url: `${AN}/dyn/17/scrutins/9730` }, srcOrcet) },
            { titre: "La gauche redéposera la taxe Zucman en nouvelle lecture", detail: "4 groupes ont voté pour le n° 2841 le 31 octobre 2026.", preuve: pr("Positions majoritaires LFI, SOC, EcoS et GDR sur le scrutin n° 9712.", { label: "Scrutin n° 9712", url: `${AN}/dyn/17/scrutins/9712` }) },
          ],
          cause_du_changement: { evenement_id: "ev-9759", titre: "Rejet de la première partie du PLF 2027", preuve: fait("Scrutin n° 9759 du 4 novembre 2026.", srcRejet) },
        },
        {
          objectif_rang: 2,
          situation: "favorable",
          score: 0.7,
          tendance: "stable",
          confiance: { niveau: "moyenne", etabli: ["Exclusion des holdings animatrices (n° 3107) adoptée le 2 novembre 2026, tombée le 4 novembre 2026"], inconnu: ["Reprise du n° 3107 par le Sénat ou en nouvelle lecture"] },
          lecture: { texte: "L'exclusion des holdings animatrices (n° 3107) a réuni une majorité le 2 novembre 2026 ; elle devra être redéposée.", chiffres_utilises: ["3107", "2026-11-02"], mode: "llm", modele: "Qwen/Qwen3.8-27B", verifie: true },
          favorable: [
            { titre: "Majorité acquise pour exclure les holdings animatrices", detail: "Le n° 3107 (EPR, travaillé avec l'Afep) a été adopté avant de tomber avec la première partie.", preuve: fait("Adoption du n° 3107 en séance le 2 novembre 2026.", srcAmd("3107")) },
          ],
          bloquant: [],
          cause_du_changement: null,
        },
        {
          objectif_rang: 3,
          situation: "insuffisant",
          score: null,
          tendance: "stable",
          confiance: { niveau: "faible", etabli: [], inconnu: ["Aucun amendement de report d'entrée en vigueur déposé", "Calendrier de la nouvelle lecture"] },
          lecture: { texte: "Aucun amendement de report d'entrée en vigueur n'a été déposé sur le n° 3140 ni sur l'article 3.", chiffres_utilises: ["3140", "3"], mode: "gabarit", modele: null, verifie: true },
          favorable: [],
          bloquant: [],
          cause_du_changement: null,
        },
      ],
    };
    nouveautes = {
      meta: metaTB("pipeline/nouveautes", "Événements jusqu'au 14 novembre 2026."),
      evenements: [
        { id: "ev-9759", date: "2026-11-04", type: "scrutin", importance: 3, titre: "Première partie du PLF 2027 rejetée (scrutin n° 9759)", detail: "Le texte part au Sénat dans sa version initiale ; le n° 3140 tombe.", url: `${AN}/dyn/17/scrutins/9759`, effet: "renforce", objectif_rang: 1, preuve: fait("Vote sur l'ensemble de la première partie ; conséquence directe sur l'objectif du client.", srcRejet) },
        { id: "ev-3140", date: "2026-11-02", type: "scrutin", importance: 3, titre: "Amendement n° 3140 adopté : taxe de 0,5 % sur les holdings patrimoniales", detail: "Scrutin n° 9730 ; RN et Démocrates divisés.", url: `${AN}/dyn/17/scrutins/9730`, effet: "affaiblit", objectif_rang: 1, preuve: fait("Première majorité en faveur d'une taxe sur les holdings dans cette législature.", { label: "Scrutin n° 9730", url: `${AN}/dyn/17/scrutins/9730` }) },
        { id: "ev-senat", date: "2026-11-10", type: "agenda", importance: 2, titre: "Première partie inscrite en commission des finances du Sénat", detail: "Examen à partir du 19 novembre 2026 en séance.", url: "https://www.senat.fr/dossier-legislatif/pjlf2027.html", effet: "neutre", objectif_rang: 1, preuve: fait("Calendrier publié par le Sénat.", srcSenat) },
        { id: "ev-2841", date: "2026-10-31", type: "scrutin", importance: 2, titre: "Taxe Zucman (n° 2841) rejetée (scrutin n° 9712)", detail: "Rejetée par le bloc central, la droite et une partie du RN.", url: `${AN}/dyn/17/scrutins/9712`, effet: "renforce", objectif_rang: 1, preuve: fait("Le rejet montre la ligne de partage : taxe large rejetée, taxe ciblée possible.", { label: "Scrutin n° 9712", url: `${AN}/dyn/17/scrutins/9712` }) },
        { id: "ev-hatvp", date: "2026-10-20", type: "hatvp", importance: 1, titre: "L'Afep déclare une rencontre à la HATVP", detail: "Objet : taxe sur les holdings et la fortune improductive.", url: "https://www.hatvp.fr/fiche-organisation/?organisation=317486009", effet: "neutre", objectif_rang: 1, preuve: fait("Déclaration publique du client lui-même ; sans effet sur le vote.", { label: "HATVP", url: "https://www.hatvp.fr/" }) },
        { id: "ev-rapport", date: "2026-10-15", type: "rapport", importance: 1, titre: "Rapport de la commission des finances n° 3302 publié", detail: "Annexe des personnes entendues : Afep, Medef, DGFiP, France Invest.", url: rapportUrl(3302), effet: "neutre", objectif_rang: 1, preuve: fait("Liste des auditions et avis du rapporteur général.", { label: "Rapport n° 3302", url: rapportUrl(3302) }) },
      ],
    };
    suite = {
      meta: metaTB("pipeline/suite", "Échéances connues au 14 novembre 2026 ; dates du Sénat et de la nouvelle lecture non fixées pour certaines."),
      echeances: [
        { date: "2026-11-19", titre: "Examen de la première partie au Sénat, séance publique", lieu: "senat", url: "https://www.senat.fr/dossier-legislatif/pjlf2027.html", preuve: fait("Calendrier publié par le Sénat le 10 novembre 2026.", srcSenat) },
        { date: null, titre: "Commission mixte paritaire", lieu: "cmp", url: "https://www.senat.fr/dossier-legislatif/pjlf2027.html", preuve: fait("Date non fixée ; dépend de la fin de l'examen au Sénat.", srcSenat) },
        { date: null, titre: "Nouvelle lecture à l'Assemblée nationale", lieu: "seance", url: `${AN}/dyn/17/ordre-du-jour`, preuve: fait("Date non fixée ; c'est là que le n° 3140 peut revenir.", { label: "Ordre du jour", url: `${AN}/dyn/17/ordre-du-jour` }) },
      ],
      derniere_occasion: { date: null, titre: "Nouvelle lecture à l'Assemblée nationale : dernière occasion d'empêcher le retour du n° 3140", lieu: "seance", url: `${AN}/dyn/17/ordre-du-jour`, preuve: inconnu("Date non fixée au 14 novembre 2026 ; dépend du Sénat et de la CMP.", { label: "Ordre du jour", url: `${AN}/dyn/17/ordre-du-jour` }) },
      probables: [
        { titre: "Retour du n° 3140 en nouvelle lecture", proba: null, detail: "Pas de prédiction Orcet : l'amendement n'est pas redéposé à ce jour.", preuve: pr("Majorité réunie le 2 novembre 2026 ; auteur et cosignataires non interrogés.", { label: "Scrutin n° 9730", url: `${AN}/dyn/17/scrutins/9730` }) },
        { titre: "Maintien du texte initial au Sénat, sans taxe sur les holdings", proba: null, detail: "Pas de prédiction : le Sénat n'est pas couvert.", preuve: pr("Position de la majorité sénatoriale.", srcSenat) },
        { titre: "Nouveau dépôt de la taxe Zucman par la gauche", proba: null, detail: "Pas de prédiction : amendement non déposé.", preuve: pr("4 groupes ont voté pour le n° 2841.", { label: "Scrutin n° 9712", url: `${AN}/dyn/17/scrutins/9712` }) },
      ],
    };
    action = {
      meta: metaTB("pipeline/action", "« pour » et « contre » qualifient la mesure (taxe sur les holdings), pas l'objectif du client. Un député n'est classé que sur ses propres actes."),
      decideurs: [
        { role: "gouvernement", depute_id: null, nom: "Gouvernement (ministre chargé du budget)", groupe_id: null, position: "contre", preuve: fait("Avis défavorable au n° 3140 et au n° 2841 en séance ; auteur de l'article 3 (fortune improductive) dans sa rédaction initiale.", srcTexte) },
        { role: "rapporteur_general", depute_id: parGroupe.EPR[1], nom: nomDe(parGroupe.EPR[1]), groupe_id: G.EPR, position: "contre", preuve: fait("Avis défavorable au n° 3140 dans le rapport n° 3302 et en séance le 2 novembre 2026.", { label: "Rapport n° 3302", url: rapportUrl(3302) }) },
        { role: "chef_de_file", depute_id: DEM0, nom: nomDe(DEM0), groupe_id: G.DEM, position: "pour", preuve: fait("Auteur du n° 3140 ; orateur du groupe sur l'article 3.", srcAmd("3140")) },
        { role: "president_commission", depute_id: LFI0, nom: nomDe(LFI0), groupe_id: G["LFI-NFP"], position: "pour", preuve: fait("Cosignataire du n° 2988 (taxe Zucman à 3 %).", srcAmd("2988")) },
      ],
      groupes: {
        actionnables: [
          dAction(DEM0, 0.52, "Auteur du n° 3140, ouvert à l'exonération des réinvestissements (n° 3602).", ["depose", "dit"], pr("Dépôt du n° 3140 ; soutien déclaré au n° 3602 en séance le 2 novembre 2026.", srcAmd("3140"), srcAmd("3602"))),
          dAction(RN1, 0.47, "Cosignataire du n° 3140 dans un groupe divisé ; a voté contre la taxe Zucman.", ["depose", "vote"], pr("Cosignature du n° 3140 ; vote contre le n° 2841 le 31 octobre 2026.", srcAmd("3140"), { label: "Scrutin n° 9712", url: `${AN}/dyn/17/scrutins/9712` })),
          dAction(LIOT0, 0.44, "Cosignataire du n° 3140 ; groupe sans position.", ["depose"], pr("Cosignature du n° 3140 ; LIOT sans position majoritaire sur les 2 scrutins liés.", srcAmd("3140"))),
          dAction(DR0, 0.5, "Position personnelle non connue : aucun dépôt, vote nominatif ou intervention sur la mesure ; son groupe est contre, ce qui ne suffit pas à le classer.", [], inconnu("Absent des 2 scrutins liés ; aucune cosignature ni intervention repérée.", srcScrutins)),
        ],
        allies: [
          dAction(EPR2, 0.82, "Auteur du n° 3107 (exclusion des holdings animatrices) ; a voté contre le n° 3140.", ["depose", "vote"], pr("Dépôt du n° 3107, travaillé avec l'Afep ; position du groupe contre (confiance 0.78).", srcAmd("3107"))),
          dAction(HOR1, 0.78, "Cosignataire du n° 3602 (exonération des réinvestissements).", ["depose"], pr("Cosignature du n° 3602 ; position du groupe contre (confiance 0.74).", srcAmd("3602"))),
        ],
        perdus: [
          dAction(SOC0, 0.05, "Auteur de la taxe Zucman (n° 2841).", ["depose"], pr("Dépôt du n° 2841 ; position du groupe pour (confiance 0.88).", srcAmd("2841"))),
          dAction(LFI0, 0.04, "Cosignataire du n° 2988 (taxe Zucman à 3 %).", ["depose"], pr("Cosignature du n° 2988 ; position du groupe pour (confiance 0.9).", srcAmd("2988"))),
          dAction(GDR0, 0.06, "Cosignataire du n° 2841.", ["depose"], pr("Cosignature du n° 2841 ; position du groupe pour (confiance 0.82).", srcAmd("2841"))),
        ],
      },
      arguments: {
        pour: [
          { argument: "Taxer l'accumulation plutôt que l'entreprise", citation: "La taxe Zucman n'est pas un impôt sur l'entreprise, c'est un impôt sur l'accumulation.", orateur_id: SOC0, groupe_id: G.SOC, date: "2026-10-31", lieu: "seance", url: seanceUrl("2026-10-31"), preuve: fait("Intervention en séance, orateur identifié.", { label: "Séance du 31 octobre 2026", url: seanceUrl("2026-10-31") }) },
          { argument: "Les holdings patrimoniales servent à différer l'impôt", citation: "Une holding patrimoniale qui ne réinvestit pas n'est qu'un report d'impôt sans fin.", orateur_id: DEM0, groupe_id: G.DEM, date: "2026-11-02", lieu: "seance", url: seanceUrl("2026-11-02"), preuve: fait("Intervention en séance, orateur identifié.", { label: "Séance du 2 novembre 2026", url: seanceUrl("2026-11-02") }) },
        ],
        contre: [
          { argument: "Taxer les holdings, c'est taxer l'outil de travail", citation: "Taxer les holdings, c'est taxer l'outil de travail de ceux qui investissent en France.", orateur_id: EPR2, groupe_id: G.EPR, date: "2026-11-02", lieu: "seance", url: seanceUrl("2026-11-02"), preuve: fait("Intervention en séance, orateur identifié.", { label: "Séance du 2 novembre 2026", url: seanceUrl("2026-11-02") }) },
          { argument: "Une taxe inefficace si les holdings animatrices sont exclues", citation: "Une taxe sur la fortune improductive ne rapportera rien si les holdings animatrices en sont exclues.", orateur_id: HOR1, groupe_id: G.HOR, date: "2026-10-14", lieu: "commission", url: commissionUrl("2026-10-14"), preuve: fait("Intervention en commission des finances, lue en HTML.", { label: "Commission des finances, 14 octobre 2026", url: commissionUrl("2026-10-14") }) },
        ],
      },
      contre_arguments: [
        { texte: "Sur les 4\u202F000 holdings patrimoniales recensées, 9 sur 10 détiennent des participations dans des PME : la taxe de 0,5 % frappe l'investissement, pas l'accumulation.", repond_a: "Taxer l'accumulation plutôt que l'entreprise", chiffres_utilises: ["4000", "9", "10", "0.5"], mode: "llm", verifie: true, preuve: pr("Croise le recensement de France Invest et le périmètre exact du n° 3140.", srcAmd("3140"), { label: "France Invest", url: "https://www.franceinvest.eu/" }) },
        { texte: "Le report d'imposition n'est pas une exonération : l'impôt est dû à la sortie de la holding.", repond_a: "Les holdings patrimoniales servent à différer l'impôt", chiffres_utilises: [], mode: "gabarit", verifie: true, preuve: pr("Gabarit de secours ; à étayer avec le rapport du Conseil des prélèvements obligatoires.", srcTexte) },
      ],
    };
    etat = {
      meta: metaTB("pipeline/etat", "État au 14 novembre 2026 : première partie rejetée par l'Assemblée, texte au Sénat."),
      mesure: {
        label: d.mesure.label,
        article: d.mesure.article,
        dans_le_texte: true,
        redaction_actuelle: "Projet initial du gouvernement : article 3, taxe sur la fortune improductive. La taxe de 0,5 % sur les holdings patrimoniales (n° 3140, article 3 bis) et l'exclusion des holdings animatrices (n° 3107) sont tombées avec le rejet de la première partie le 4 novembre 2026.",
        modifications: [
          { date: "2026-11-02", par: "Amendement n° 3140 (Les Démocrates)", quoi: "Ajout d'un article 3 bis : taxe de 0,5 % sur l'actif net non réinvesti des holdings patrimoniales (tombé le 4 novembre 2026)", url: amdUrl("3140"), preuve: fait("Adopté par le scrutin n° 9730, tombé avec le rejet de la première partie (scrutin n° 9759).", srcAmd("3140"), srcRejet) },
          { date: "2026-11-02", par: "Amendement n° 3107 (Ensemble pour la République)", quoi: "Exclusion des holdings animatrices du champ de l'article 3 (tombée le 4 novembre 2026)", url: amdUrl("3107"), preuve: fait("Adopté en séance, tombé avec le rejet de la première partie.", srcAmd("3107"), srcRejet) },
        ],
      },
      etape: "Première lecture, Sénat (première partie rejetée par l'Assemblée nationale le 4 novembre 2026)",
      etapes: [
        { nom: "Commission des finances, Assemblée nationale", date: "2026-10-15", statut: "fait", url: commissionUrl("2026-10-14") },
        { nom: "Séance publique, première lecture, Assemblée nationale (première partie rejetée)", date: "2026-11-04", statut: "fait", url: `${AN}/dyn/17/scrutins/9759` },
        { nom: "Sénat, première lecture", date: "2026-11-19", statut: "en_cours", url: "https://www.senat.fr/dossier-legislatif/pjlf2027.html" },
        { nom: "Commission mixte paritaire", date: null, statut: "a_venir", url: "https://www.senat.fr/dossier-legislatif/pjlf2027.html" },
        { nom: "Nouvelle lecture, Assemblée nationale", date: null, statut: "a_venir", url: `${AN}/dyn/17/ordre-du-jour` },
      ],
      articles: [
        { numero: "2", titre: "Barème de l'impôt sur le revenu", statut: "reste", sort_detail: "Voté le 24 octobre 2026 puis tombé avec le rejet de la première partie ; à réexaminer au Sénat", url: d.url },
        { numero: "3", titre: "Taxe sur la fortune improductive", statut: "vote", sort_detail: "Modifié par le n° 3107 (exclusion des holdings animatrices) puis tombé avec le rejet de la première partie le 4 novembre 2026", url: amdUrl("3107") },
        { numero: "3 bis", titre: "Taxe sur les holdings patrimoniales (n° 3140)", statut: "supprime", sort_detail: "Adopté le 2 novembre 2026, supprimé par le rejet de la première partie le 4 novembre 2026", url: amdUrl("3140") },
      ],
    };
  }

  verdict.verdicts.forEach((v) => assertChiffres(`${d.id}/verdict.${v.objectif_rang}`, v.lecture.texte, v.lecture.chiffres_utilises));
  action.contre_arguments.forEach((c, i) => assertChiffres(`${d.id}/action.contre_arguments.${i}`, c.texte, c.chiffres_utilises));
  ecrire<Verdict>(VerdictSchema, d.id, "verdict", verdict);
  ecrire<Nouveautes>(NouveautesSchema, d.id, "nouveautes", nouveautes);
  ecrire<Suite>(SuiteSchema, d.id, "suite", suite);
  ecrire<Action>(ActionSchema, d.id, "action", action);
  ecrire<Etat>(EtatSchema, d.id, "etat", etat);
}

console.log(`fixtures écrites dans ${ROOT}`);
