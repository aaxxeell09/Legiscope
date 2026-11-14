// P2 : courbe de cohésion entre groupes, mois par mois depuis juillet 2024.
// bun run cohesion  →  data/cohesion.json (+ analyse des décrochages dans pipeline/cohesion/.cache/analyse.json)
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { CohesionSchema } from "../../contracts";
import { ROOT, CACHE, SCRUTINS_URL, aliasGroupes, chargerConfig, chargerGroupes, chargerScrutins, positionMajoritaire, urlScrutin } from "./lib";

const DEBUT = "2024-07";
const SEUIL_DROP = 0.15;
const MIN_SCRUTINS_SIGNAL = 10;
const FENETRE_CENSURE_J = 60;

const { data: config } = chargerConfig();
const { data: groupesFile, chemin: cheminGroupes } = chargerGroupes();
const groupes = groupesFile.groupes;
const ids = groupes.map((g) => g.id);
const sigle = Object.fromEntries(groupes.map((g) => [g.id, g.sigle]));
const alias = aliasGroupes(groupes);
const scrutins = chargerScrutins();
const dossierIds = new Set<string>(config.dossiers.map((d: any) => d.id));

// Mois de la période
const dernierMois = scrutins.at(-1)!.date.slice(0, 7);
const mois: string[] = [];
for (let [y, m] = DEBUT.split("-").map(Number); `${y}-${String(m).padStart(2, "0")}` <= dernierMois; m === 12 ? (y++, (m = 1)) : m++) {
  mois.push(`${y}-${String(m).padStart(2, "0")}`);
}

// Positions majoritaires par scrutin et par groupe (non-inscrits et groupes absents de groupes.json ignorés)
const positions = scrutins.map((s) => {
  const pos: Record<string, string | null> = {};
  for (const g of s.groupes) {
    const id = alias[g.organe] ?? g.organe;
    if (!ids.includes(id)) continue;
    pos[id] = positionMajoritaire(g);
  }
  return { mois: s.date.slice(0, 7), pos };
});

const pairs: { a: string; b: string; series: { month: string; accord: number | null; n_scrutins: number }[] }[] = [];
for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i], b = ids[j];
    const series = mois.map((m) => {
      let n = 0, ok = 0;
      for (const p of positions) {
        if (p.mois !== m) continue;
        const pa = p.pos[a], pb = p.pos[b];
        if (pa == null || pb == null) continue;
        n++;
        if (pa === pb) ok++;
      }
      return { month: m, accord: n === 0 ? null : Math.round((ok / n) * 1000) / 1000, n_scrutins: n };
    });
    pairs.push({ a, b, series });
  }
}

// Événements, vérifiés dans les scrutins open data quand c'est un vote
const parUid = Object.fromEntries(scrutins.map((s) => [s.uid, s]));
function evScrutin(uid: string, type: string, label: (s: any) => string, dossier_id?: string) {
  const s = parUid[uid];
  if (!s) throw new Error(`scrutin ${uid} introuvable`);
  const e: any = { date: s.date, type, label: label(s), url: urlScrutin(s.numero) };
  if (dossier_id && dossierIds.has(dossier_id)) e.dossier_id = dossier_id;
  return e;
}
const events = [
  { date: "2024-06-09", type: "dissolution", label: "Dissolution de l'Assemblée nationale", url: "https://fr.wikipedia.org/wiki/Dissolution_de_l%27Assembl%C3%A9e_nationale_fran%C3%A7aise_de_2024" },
  { date: "2024-09-05", type: "nomination", label: "Michel Barnier nommé Premier ministre", url: "https://fr.wikipedia.org/wiki/Gouvernement_Michel_Barnier" },
  evScrutin("VTANR5L17V519", "censure", (s) => `Censure du gouvernement Barnier (${s.pour} voix)`),
  { date: "2024-12-13", type: "nomination", label: "François Bayrou nommé Premier ministre", url: "https://fr.wikipedia.org/wiki/Gouvernement_Fran%C3%A7ois_Bayrou" },
  evScrutin("VTANR5L17V3054", "censure", (s) => `Confiance refusée au gouvernement Bayrou (${s.contre} contre ${s.pour})`),
  { date: "2025-09-09", type: "nomination", label: "Sébastien Lecornu nommé Premier ministre", url: "https://fr.wikipedia.org/wiki/Gouvernement_S%C3%A9bastien_Lecornu_(1)" },
  { date: "2025-10-10", type: "nomination", label: "Sébastien Lecornu reconduit Premier ministre", url: "https://fr.wikipedia.org/wiki/Gouvernement_S%C3%A9bastien_Lecornu_(2)" },
  evScrutin("VTANR5L17V3999", "vote", (s) => `Article 22 du PLF 2026 (taxe petits colis) adopté ${s.pour} contre ${s.contre}, nuit du 19 au 20 novembre 2025`, "petits-colis"),
  evScrutin("VTANR5L17V9759", "vote", (s) => `Première partie du PLF 2027 rejetée (${s.contre} contre, ${s.pour} pour)`, "plf2027-holdings"),
].sort((x, y) => x.date.localeCompare(y.date));
const censures = events.filter((e) => e.type === "censure").map((e) => e.date);

// Signaux : décrochage de plus de 0,15 d'un mois au mois précédent ayant des scrutins (n ≥ 10 des deux côtés).
const finDeMois = (m: string) => {
  const [y, mm] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mm, 0)).toISOString().slice(0, 10);
};
const plusJours = (d: string, j: number) => new Date(Date.parse(d) + j * 86400000).toISOString().slice(0, 10);

function decrochages(a: string, b: string) {
  const pair = pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
  if (!pair) return [];
  const out: any[] = [];
  let prev: (typeof pair.series)[number] | null = null;
  for (const pt of pair.series) {
    if (pt.accord === null || pt.n_scrutins < MIN_SCRUTINS_SIGNAL) continue;
    if (prev && prev.accord !== null) {
      const drop = Math.round((pt.accord - prev.accord) * 1000) / 1000;
      if (drop < -SEUIL_DROP) {
        const date = finDeMois(pt.month);
        const debut = `${pt.month}-01`;
        const censure = censures.find((c) => c >= debut && c <= plusJours(date, FENETRE_CENSURE_J));
        out.push({ date, pair: [a, b] as [string, string], drop, mois: pt.month, mois_prec: prev.month, censure: censure ?? null });
      }
    }
    prev = pt;
  }
  return out;
}

const signals = config.cohesion.paires_demo.flatMap(([a, b]: [string, string]) =>
  decrochages(a, b).map((d) => ({
    date: d.date,
    pair: d.pair,
    drop: d.drop,
    label: `Décrochage ${sigle[a]} et ${sigle[b]} en ${d.mois} (${Math.round(-d.drop * 100)} points)${d.censure ? `, censure le ${d.censure}` : ", sans censure dans les 60 jours"}`,
    suivi_de_censure: d.censure !== null,
  })),
);

const ref = scrutins.filter((s) => s.date.slice(0, 7) >= DEBUT);
const cohesion = {
  meta: {
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    sources: [
      { label: "Open data Assemblée nationale, scrutins de la 17e législature", url: SCRUTINS_URL },
      { label: "Scrutin n° 519, censure du gouvernement Barnier", url: urlScrutin(519) },
      { label: "Scrutin n° 3054, confiance refusée au gouvernement Bayrou", url: urlScrutin(3054) },
    ],
    limits: [
      `${ref.length} scrutins publics du ${ref[0].date} au ${ref.at(-1)!.date} ; aucun scrutin public de juillet à septembre 2024 (accord null).`,
      "Position majoritaire d'un groupe = la plus fréquente parmi ses votants (pour, contre, abstention) au moment du vote, null si moins de 5 votants ou égalité.",
      "Les motions de censure ne comptent que les voix pour : les groupes qui ne la votent pas n'ont pas de position, le scrutin sort du dénominateur.",
      "Non-inscrits exclus. UDR suivi sous PO847173 jusqu'en juillet 2025 puis PO872880.",
      `Signaux : baisse de plus de ${SEUIL_DROP} par rapport au mois précédent ayant des scrutins, mois de ${MIN_SCRUTINS_SIGNAL} scrutins au moins ; « suivi de censure » si une censure ou un refus de confiance tombe entre le début du mois et 60 jours après sa fin.`,
      "Nominations et dissolution : dates publiques, sources encyclopédiques.",
      "Fichier commun aux deux dossiers : pour un dossier rejoué, seuls les mois antérieurs au mois de sa date de référence et les événements antérieurs à cette date sont connus (petits colis, matin du 19 novembre 2025 : courbe jusqu'à octobre 2025, le vote du 19 novembre est la chute, pas une donnée connue). La Suite applique cette coupure ; le front doit l'appliquer à la courbe.",
    ].join(" "),
    producer: "pipeline/cohesion",
    dossier_id: null,
  },
  periode: { from: mois[0], to: mois.at(-1)! },
  pairs,
  events,
  signals,
};

CohesionSchema.parse(cohesion);
mkdirSync(join(ROOT, "data"), { recursive: true });
writeFileSync(join(ROOT, "data/cohesion.json"), JSON.stringify(cohesion, null, 2) + "\n");

// Analyse 13 h 35 : décrochages sur toutes les paires, suivis ou non d'une censure
const tous = pairs.flatMap((p) => decrochages(p.a, p.b).map((d) => ({ ...d, paire: `${sigle[p.a]}-${sigle[p.b]}` })));
const analyse = {
  groupes_source: cheminGroupes,
  paires_demo: signals,
  toutes_paires: { total: tous.length, suivis: tous.filter((d) => d.censure).length, non_suivis: tous.filter((d) => !d.censure).length },
  par_mois: Object.entries(tous.reduce((acc: any, d) => ((acc[d.mois] ??= []).push(`${d.paire} ${d.drop}`), acc), {})),
};
writeFileSync(join(CACHE, "analyse.json"), JSON.stringify(analyse, null, 2));
console.log(`cohesion.json : ${pairs.length} paires, ${mois.length} mois, ${events.length} événements, ${signals.length} signaux (groupes : ${cheminGroupes})`);
console.log(JSON.stringify(analyse, null, 1));
