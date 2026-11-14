import { useSearchParams } from "react-router-dom";
import { Meta, Panel, Table, type Column } from "../../components";
import { useConfig } from "../../lib/config";
import { pathFor, useData, type DataKind, type DataState, type Meta as MetaType } from "../../lib/data";
import { formatDate, formatDateTime } from "../../lib/format";

/**
 * Page « Sources et limites » (route /sources).
 *
 * Deux tableaux, construits depuis les blocs `meta` des fichiers chargés :
 *   1. Sources : source, ce qu'on en tire, date de synchronisation, limite.
 *      Les quatre sources fixes (Hémicycle, open data AN, HATVP, Featherless)
 *      sont toujours présentes ; les URL citées par les `meta` s'y rattachent,
 *      toute autre URL citée devient une ligne à part.
 *   2. Fichiers chargés : un fichier par ligne, avec son `meta.limits`.
 *
 * Le dossier courant vient de `?dossier=<id>`, sinon de `config.dossier_demo`.
 */

type Lien = { label: string; url: string };
type AvecMeta = { meta?: MetaType | null };

type Fichier = { kind: DataKind; bloc: string; tire: string; racine?: boolean };

/** Fichiers lus par la page. L'ordre est celui de la lecture du tableau de bord. */
const FICHIERS: Fichier[] = [
  { kind: "verdict", bloc: "Verdict", tire: "Situation, tendance et confiance par objectif, points favorables, points de blocage" },
  { kind: "nouveautes", bloc: "Nouveautés", tire: "Événements qui touchent la mesure, triés par importance, effet sur le verdict" },
  { kind: "suite", bloc: "Suite", tire: "Échéances, dernière occasion d'agir, issues probables" },
  { kind: "action", bloc: "Action", tire: "Décideurs, députés classés sur leurs propres actes, arguments, contre-arguments" },
  { kind: "note", bloc: "Compte rendu", tire: "Synthèse à reprendre pour le client, chiffres vérifiés" },
  { kind: "etat", bloc: "État de la mesure", tire: "Présence dans le texte, rédaction, modifications, étapes, articles" },
  { kind: "texte", bloc: "Base", tire: "Texte, positions des groupes, amendements, prédictions Orcet" },
  { kind: "pivots", bloc: "Pivots", tire: "Députés les moins prévisibles sur le sujet" },
  { kind: "hatvp", bloc: "HATVP", tire: "Organisations ayant déclaré une action sur le texte" },
  { kind: "fiches_index", bloc: "Fiches de députés", tire: "Fiches disponibles et fiches absentes" },
  { kind: "cohesion", bloc: "Cohésion", tire: "Accord mensuel entre groupes, censures, signaux", racine: true },
  { kind: "groupes", bloc: "Groupes", tire: "Sigle, couleur, effectif", racine: true },
  { kind: "deputes", bloc: "Députés", tire: "Groupe et commissions de chaque député", racine: true },
];

type FamilleId = "hemicycle" | "an" | "hatvp" | "featherless";

type Famille = {
  id: FamilleId;
  label: string;
  url: string;
  licence: string;
  tire: string;
  limite: string;
  /** Cadence propre à la source, quand elle est connue. */
  cadence?: string;
};

/** Sources fixes : descriptions et limites reprises de PLAN.md (annexe A) et du cadrage. */
const FAMILLES: Famille[] = [
  {
    id: "hemicycle",
    label: "API Hémicycle",
    url: "https://hemicycle.ai/donnees",
    licence: "accès par clé, conditions de l'API",
    tire: "Scrutins et votes nominatifs, textes et amendements, députés et groupes, accord entre groupes, loyauté, prédictions Orcet",
    limite:
      "Ne donne ni les débats, ni les comptes rendus, ni les rapports. Orcet renvoie la moyenne des probabilités individuelles de voter pour, pas une probabilité d'adoption. Sans prédiction, rien n'est affiché.",
    cadence: "base mise à jour chaque nuit",
  },
  {
    id: "an",
    label: "Assemblée nationale, open data et site",
    url: "https://data.assemblee-nationale.fr",
    licence: "Licence Ouverte (Etalab)",
    tire: "Dossiers législatifs et rapporteurs, comptes rendus de séance, agenda, rapports et comptes rendus de commission lus sur le site",
    limite:
      "Tous les rapports n'ont pas de liste de personnes entendues : la couverture est partielle et affichée. Pas d'export en masse des comptes rendus de commission. Une intervention n'est gardée que si l'orateur est identifié.",
  },
  {
    id: "hatvp",
    label: "HATVP, répertoire des représentants d'intérêts",
    url: "https://www.hatvp.fr",
    licence: "Licence Ouverte (Etalab)",
    tire: "Organisations ayant déclaré une action de représentation d'intérêts sur le texte",
    limite:
      "Données déclaratives, lues par l'API Hémicycle. Le filtre par mots-clés peut retenir une organisation à tort.",
  },
  {
    id: "featherless",
    label: "Featherless, modèle de langage ouvert",
    url: "https://featherless.ai",
    licence: "service à clé, modèle ouvert",
    tire: "Extraction des personnes entendues, classement des arguments, rédaction de la lecture du verdict, des synthèses, des contre-arguments et du compte rendu",
    limite:
      "Le modèle ne voit jamais un vote. Il reçoit des chiffres et des citations. Un nombre absent de la liste autorisée fait rejeter le texte : trois essais, puis un gabarit sans modèle.",
  },
];

/** Rattache une URL citée dans un `meta` à une source fixe, ou à rien. */
function familleDe(url: string): FamilleId | null {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = u.pathname.toLowerCase();
  } catch {
    return null;
  }
  if (host.endsWith("hatvp.fr")) return "hatvp";
  if (host.endsWith("hemicycle.ai")) return path.includes("/entreprises") ? "hatvp" : "hemicycle";
  if (host.endsWith("assemblee-nationale.fr")) return "an";
  if (host.endsWith("featherless.ai")) return "featherless";
  return null;
}

type Redaction = { llm: number; gabarit: number; modeles: string[] };

/** Compte les textes rédigés d'un fichier : objets portant `mode` « llm » ou « gabarit ». */
function redactionDe(data: unknown): Redaction {
  const r: Redaction = { llm: 0, gabarit: 0, modeles: [] };
  const visite = (v: unknown): void => {
    if (Array.isArray(v)) {
      v.forEach(visite);
      return;
    }
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (o.mode === "llm" || o.mode === "gabarit") {
      if (o.mode === "llm") r.llm += 1;
      else r.gabarit += 1;
      if (typeof o.modele === "string" && !r.modeles.includes(o.modele)) r.modeles.push(o.modele);
    }
    Object.values(o).forEach(visite);
  };
  visite(data);
  return r;
}

type Charge = Fichier & { chemin: string; state: DataState<AvecMeta> };

/** Charge tous les fichiers de la page. Nombre et ordre d'appels fixes (règle des hooks). */
function useFichiers(dossier: string | undefined, racineDepot: string): Charge[] {
  const states: DataState<AvecMeta>[] = [
    useData<AvecMeta>("verdict", dossier),
    useData<AvecMeta>("nouveautes", dossier),
    useData<AvecMeta>("suite", dossier),
    useData<AvecMeta>("action", dossier),
    useData<AvecMeta>("note", dossier),
    useData<AvecMeta>("etat", dossier),
    useData<AvecMeta>("texte", dossier),
    useData<AvecMeta>("pivots", dossier),
    useData<AvecMeta>("hatvp", dossier),
    useData<AvecMeta>("fiches_index", dossier),
    useData<AvecMeta>("cohesion"),
    useData<AvecMeta>("groupes"),
    useData<AvecMeta>("deputes"),
  ];
  return FICHIERS.map((f, i) => {
    let chemin = "";
    try {
      chemin = racineDepot + pathFor(f.kind, f.racine ? undefined : dossier);
    } catch {
      chemin = `${racineDepot}/…/${f.kind}.json`;
    }
    return { ...f, chemin, state: states[i] ?? { status: "loading" } };
  });
}

type LigneSource = {
  id: string;
  label: string;
  url: string;
  licence?: string;
  tire: string;
  limite: string;
  cadence?: string;
  /** URL précises citées par les `meta` des fichiers chargés. */
  cites: Lien[];
  blocs: string[];
  /** `generated_at` le plus récent des fichiers qui citent la source. */
  date: string | null;
  note?: string;
};

function plusRecent(a: string | null, b: string | undefined): string | null {
  if (!b) return a;
  if (!a) return b;
  return new Date(b).getTime() > new Date(a).getTime() ? b : a;
}

function ajoute<T>(liste: T[], v: T): void {
  if (!liste.includes(v)) liste.push(v);
}

function lignesSources(charges: Charge[]): LigneSource[] {
  const fixes = new Map<FamilleId, LigneSource>(
    FAMILLES.map((f) => [f.id, { ...f, cites: [], blocs: [], date: null }]),
  );
  const autres = new Map<string, LigneSource>();
  const redaction: Redaction = { llm: 0, gabarit: 0, modeles: [] };

  for (const c of charges) {
    if (c.state.status !== "ok" || !c.state.data) continue;
    const meta = c.state.data.meta;

    // Featherless n'est pas cité dans les `meta` : on le repère aux textes rédigés.
    const r = redactionDe(c.state.data);
    if (r.llm + r.gabarit > 0) {
      redaction.llm += r.llm;
      redaction.gabarit += r.gabarit;
      r.modeles.forEach((m) => ajoute(redaction.modeles, m));
      if (r.llm > 0) {
        const f = fixes.get("featherless");
        if (f) {
          ajoute(f.blocs, c.bloc);
          f.date = plusRecent(f.date, meta?.generated_at);
        }
      }
    }

    for (const s of meta?.sources ?? []) {
      const fam = familleDe(s.url);
      let ligne = fam ? fixes.get(fam) : autres.get(s.url);
      if (!ligne) {
        ligne = { id: s.url, label: s.label, url: s.url, tire: "", limite: "", cites: [], blocs: [], date: null };
        autres.set(s.url, ligne);
      }
      if (fam && !ligne.cites.some((l) => l.url === s.url)) ligne.cites.push({ label: s.label, url: s.url });
      ajoute(ligne.blocs, c.bloc);
      ligne.date = plusRecent(ligne.date, meta?.generated_at);
    }
  }

  const feather = fixes.get("featherless");
  if (feather && redaction.llm + redaction.gabarit > 0) {
    const parts: string[] = [];
    if (redaction.modeles.length > 0) parts.push(`modèle ${redaction.modeles.join(", ")}`);
    parts.push(`${redaction.llm} ${redaction.llm > 1 ? "textes rédigés" : "texte rédigé"} par le modèle`);
    parts.push(`${redaction.gabarit} en gabarit`);
    feather.note = parts.join(" ; ");
  }

  return [...fixes.values(), ...autres.values()];
}

const COLONNES_SOURCES: Column<LigneSource>[] = [
  {
    key: "source",
    label: "Source",
    width: "24%",
    render: (l) => (
      <div>
        <a href={l.url} target="_blank" rel="noreferrer">
          {l.label}
        </a>
        {l.licence && <div className="text-2">{l.licence}</div>}
        {l.cites.length > 0 && (
          <div className="text-2">
            cité :{" "}
            {l.cites.map((s, i) => (
              <span key={s.url}>
                {i > 0 && ", "}
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </span>
            ))}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "tire",
    label: "Ce qu'on en tire",
    width: "30%",
    render: (l) => (
      <div>
        {l.tire && <div>{l.tire}</div>}
        {l.blocs.length > 0 && <div className="text-2">utilisé par : {l.blocs.join(", ")}</div>}
        {l.note && <div className="text-2">{l.note}</div>}
      </div>
    ),
  },
  {
    key: "date",
    label: "Date de synchronisation",
    width: "16%",
    render: (l) => (
      <div>
        {l.date ? <div>{formatDateTime(l.date)}</div> : <div className="text-2">aucun fichier chargé ne la cite</div>}
        {l.cadence && <div className="text-2">{l.cadence}</div>}
      </div>
    ),
  },
  {
    key: "limite",
    label: "Limite",
    render: (l) => (l.limite ? l.limite : <span className="text-2">voir les fichiers qui la citent</span>),
  },
];

const COLONNES_FICHIERS: Column<Charge>[] = [
  {
    key: "fichier",
    label: "Fichier",
    width: "26%",
    render: (c) => (
      <div>
        <div>{c.bloc}</div>
        <div className="text-2">{c.chemin}</div>
      </div>
    ),
  },
  {
    key: "tire",
    label: "Ce qu'on en tire",
    width: "26%",
    render: (c) => (
      <div>
        <div>{c.tire}</div>
        {c.state.data?.meta?.producer && <div className="text-2">produit par {c.state.data.meta.producer}</div>}
      </div>
    ),
  },
  {
    key: "date",
    label: "Généré le",
    width: "14%",
    render: (c) => {
      if (c.state.status === "loading") return <span className="text-2">chargement</span>;
      if (c.state.status === "error") return <span className="status-error">non chargé</span>;
      const d = c.state.data?.meta?.generated_at;
      return d ? formatDateTime(d) : <span className="status-error">date absente</span>;
    },
  },
  {
    key: "limite",
    label: "Limite",
    render: (c) => {
      if (c.state.status === "loading") return <span className="text-2">chargement</span>;
      if (c.state.status === "error") return <span className="status-error">{c.state.error}</span>;
      const m = c.state.data?.meta;
      if (!m) return <span className="status-error">bloc meta absent</span>;
      return m.limits ? m.limits : <span className="status-error">limite absente</span>;
    },
  },
];

export default function SourcesView() {
  const config = useConfig();
  const [params, setParams] = useSearchParams();

  const dossiers = config?.dossiers ?? [];
  const demande = params.get("dossier");
  const dossier =
    dossiers.find((d) => d.id === demande) ?? dossiers.find((d) => d.id === config?.dossier_demo) ?? dossiers[0];
  const dossierId = dossier?.id;

  const racineDepot = config?.dataset === "fixtures" ? "contracts/fixtures" : "data";
  const charges = useFichiers(dossierId, racineDepot);
  const lignes = lignesSources(charges);

  const chargesOk = charges.filter((c) => c.state.status === "ok").length;
  const enErreur = charges.filter((c) => c.state.status === "error").length;

  // Pied de page : un `meta` de synthèse, daté du fichier le plus récent.
  let dernier: string | null = null;
  for (const c of charges) dernier = plusRecent(dernier, c.state.data?.meta?.generated_at);
  const limitesPied: string[] = [];
  if (config?.dataset === "fixtures") limitesPied.push("Jeu d'exemple : députés fictifs, numéros et probabilités non réels.");
  if (dossier?.date_reference) limitesPied.push(`Dossier rejoué au ${formatDate(dossier.date_reference)} : rien de postérieur n'est retenu.`);
  limitesPied.push("Fiches de députés : sources et limites en pied de chaque fiche.");
  const metaPied: MetaType = {
    generated_at: dernier ?? "",
    sources: FAMILLES.map((f) => ({ label: f.label, url: f.url })),
    limits: limitesPied.join(" "),
    producer: "web/views/sources",
  };

  return (
    <div className="view" data-view="sources">
      <div className="view-title">
        <h1>Sources et limites</h1>
        {dossiers.length > 0 && (
          <span className="topbar-dossier">
            <label htmlFor="sources-dossier">Dossier</label>{" "}
            <select
              id="sources-dossier"
              value={dossierId ?? ""}
              onChange={(e) => setParams({ dossier: e.target.value }, { replace: true })}
            >
              {dossiers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.client ? `${d.client}, ${d.label}` : d.label}
                </option>
              ))}
            </select>
          </span>
        )}
        {config && <span className="text-2">jeu de données : {config.dataset === "fixtures" ? "exemple (fixtures)" : "réel (live)"}</span>}
        {dossier?.date_reference && <span className="text-2">vu au {formatDate(dossier.date_reference)}</span>}
      </div>

      <Panel title="Sources" aside={`${lignes.length} sources`}>
        <Table columns={COLONNES_SOURCES} rows={lignes} rowKey={(l) => l.id} empty="Aucune source" />
      </Panel>

      <Panel
        title="Fichiers chargés"
        aside={enErreur > 0 ? `${chargesOk} sur ${charges.length}, ${enErreur} non chargés` : `${chargesOk} sur ${charges.length}`}
      >
        <Table
          columns={COLONNES_FICHIERS}
          rows={charges}
          rowKey={(c) => c.kind}
          isRowMuted={(c) => c.state.status === "error"}
          empty="Aucun fichier"
        />
      </Panel>

      <Meta meta={metaPied} />
    </div>
  );
}
