import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { AmendementTexte, Deputes, Etat as EtatData, Groupes, Sort, Texte } from "@contracts/index";
import { Etat, GroupeTag, Meta, Panel, Table, type Column } from "../../components";
import { useDossier } from "../../lib/config";
import { useData } from "../../lib/data";
import { formatDate, formatNom } from "../../lib/format";
import "./base.css";

const SORT_LABEL: Record<Sort, string> = {
  en_attente: "en attente",
  adopte: "adopté",
  rejete: "rejeté",
  retire: "retiré",
  tombe: "tombé",
  non_examine: "non examiné",
  non_soutenu: "non soutenu",
  irrecevable: "irrecevable",
};
const SORT_ORDRE: Sort[] = ["en_attente", "adopte", "rejete", "retire", "tombe", "non_soutenu", "irrecevable", "non_examine"];

/** Champs ajoutés par les compléments de 14 h 05, optionnels tant que les schémas ne les portent pas. */
type AuteurType = "depute" | "gouvernement" | "commission";
type Nature = "supprime" | "reduit" | "reporte" | "aggrave" | "autre";
type Amdt = AmendementTexte & {
  auteur_type?: AuteurType;
  auteur_libelle?: string;
  nature?: Nature;
  nature_mode?: "regle" | "llm" | "defaut";
};
type Tri = "statut" | "numero" | "recent";
const PAR_PAGE = 25;

const NATURE_LABEL: Record<Nature, string> = {
  supprime: "supprime",
  reduit: "réduit",
  reporte: "reporte",
  aggrave: "aggrave",
  autre: "autre",
};

/** Amendement du gouvernement ou d'une commission (pas de groupe). */
function estInstitutionnel(a: Amdt): boolean {
  return a.auteur_type === "gouvernement" || a.auteur_type === "commission" || a.auteur_id === "GOUVERNEMENT";
}

const ARTICLE_LABEL = { vote: "voté", reste: "reste à voter", supprime: "supprimé" } as const;

/** Numéro d'amendement comparable : « 2470 » avant « 806 rect. » si plus grand, etc. */
function numeroCle(n: string): number {
  const m = n.match(/\d+/);
  return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER;
}

/** Base complète : état de la mesure, état du texte, amendements du dossier. */
export default function BaseView() {
  const { id = "" } = useParams<{ id: string }>();
  const d = useDossier(id);
  const etat = useData<EtatData>("etat", id);
  const texte = useData<Texte>("texte", id);
  const groupes = useData<Groupes>("groupes");
  const deputes = useData<Deputes>("deputes");
  const [q, setQ] = useState("");
  const [sortFiltre, setSortFiltre] = useState<Sort | "">("");
  const [groupeFiltre, setGroupeFiltre] = useState("");
  const [natureFiltre, setNatureFiltre] = useState<Nature | "">("");
  const [tri, setTri] = useState<Tri>("statut");
  const [page, setPage] = useState(1);

  const groupeParId = useMemo(() => new Map((groupes.data?.groupes ?? []).map((g) => [g.id, g])), [groupes.data]);
  const deputeParId = useMemo(() => new Map((deputes.data?.deputes ?? []).map((p) => [p.id, p])), [deputes.data]);

  const amendements = useMemo(() => {
    const all = [...((texte.data?.amendements ?? []) as Amdt[])]
      .filter((a) => !sortFiltre || a.sort === sortFiltre)
      .filter((a) => !groupeFiltre || a.groupe_id === groupeFiltre)
      .filter((a) => !natureFiltre || a.nature === natureFiltre)
      .sort((a, b) => {
        if (tri === "numero") return numeroCle(a.numero) - numeroCle(b.numero);
        if (tri === "recent") return (b.date_depot ?? "").localeCompare(a.date_depot ?? "") || numeroCle(a.numero) - numeroCle(b.numero);
        return SORT_ORDRE.indexOf(a.sort) - SORT_ORDRE.indexOf(b.sort) || numeroCle(a.numero) - numeroCle(b.numero);
      });
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter((a) => {
      const p = deputeParId.get(a.auteur_id);
      const g = a.groupe_id ? groupeParId.get(a.groupe_id) : undefined;
      return [a.numero, a.resume, SORT_LABEL[a.sort], a.auteur_libelle, a.nature && NATURE_LABEL[a.nature], p?.nom, p?.prenom, g?.sigle].some((x) => x && x.toLowerCase().includes(s));
    });
  }, [texte.data, q, sortFiltre, groupeFiltre, natureFiltre, tri, deputeParId, groupeParId]);
  const pages = Math.max(1, Math.ceil(amendements.length / PAR_PAGE));
  const pageCourante = Math.min(page, pages);
  const amendementsPage = amendements.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);
  useEffect(() => setPage(1), [q, sortFiltre, groupeFiltre, natureFiltre, tri]);

  const colonnes: Column<Amdt>[] = [
    {
      key: "numero",
      label: "N°",
      width: "6em",
      render: (a) => (
        <a href={a.url} target="_blank" rel="noreferrer">
          {a.numero}
        </a>
      ),
    },
    {
      key: "auteur",
      label: "Auteur",
      render: (a) => {
        if (estInstitutionnel(a)) {
          return <span className="base-auteur">{a.auteur_libelle ?? (a.auteur_type === "commission" ? "Commission" : "Gouvernement")}</span>;
        }
        const p = deputeParId.get(a.auteur_id);
        const g = a.groupe_id ? groupeParId.get(a.groupe_id) : undefined;
        const nom = p ? formatNom(p.prenom, p.nom) : (a.auteur_libelle ?? "auteur inconnu");
        return (
          <span className="base-auteur">
            {a.groupe_id ? <GroupeTag sigle={g?.sigle ?? "?"} couleur={g?.couleur} title={g?.nom} /> : <GroupeTag sigle="NI" />}
            {p ? <Link to={`/dossier/${id}/depute/${a.auteur_id}`}>{nom}</Link> : <span className="text-2">{nom}</span>}
          </span>
        );
      },
    },
    { key: "resume", label: "Résumé", render: (a) => a.resume },
    {
      key: "nature",
      label: "Nature",
      width: "7em",
      render: (a) =>
        a.nature ? (
          <span className={a.nature_mode === "defaut" ? "text-2" : undefined} title={a.nature_mode === "llm" ? "classé par le modèle" : a.nature_mode === "regle" ? "classé par règle" : undefined}>
            {NATURE_LABEL[a.nature]}
          </span>
        ) : (
          <span className="text-2">non classé</span>
        ),
    },
    { key: "sort", label: "Sort", width: "8em", render: (a) => SORT_LABEL[a.sort] },
    { key: "date", label: "Dépôt", width: "8em", render: (a) => a.date_depot ? formatDate(a.date_depot) : <span className="text-2">inconnue</span> },
  ];
  const metaBase = (() => {
    const metas = [etat.data?.meta, texte.data?.meta].filter((m): m is NonNullable<typeof m> => Boolean(m));
    if (metas.length === 0) return null;
    const sources = metas.flatMap((m) => m.sources).filter((source, index, all) => all.findIndex((item) => item.url === source.url) === index);
    return { ...metas[0], sources };
  })();

  if (d.status === "inconnu") {
    return (
      <div className="view">
        <h1>Dossier inconnu</h1>
        <p className="text-2">« {id} » n'est pas dans config.json.</p>
      </div>
    );
  }

  return (
    <div className="view" data-view="base">
      <header className="base-head">
        <div><div className="base-kicker">Données parlementaires du dossier</div><h1>Base documentaire</h1>
        <p className="text-2">
          {d.client ?? "…"} · {d.label ?? id}
          {d.dateReference && ` · vu au ${formatDate(d.dateReference)}`}
        </p></div>
        <Link className="btn-secondary" to={`/dossier/${id}`}>Retour au tableau de bord</Link>
      </header>

      <Etat titre="Textes législatifs" state={texte} aside={texte.data?.texte.etape}>
        {(t) => (
          <div className="base-document-row">
            <div><span className="base-document-kind">Texte suivi</span><strong>{t.texte.titre}</strong></div>
            <span className="text-2">{t.texte.etape}</span>
            <a href={t.texte.url} target="_blank" rel="noreferrer">Voir le texte officiel</a>
          </div>
        )}
      </Etat>

      <Etat titre="Articles" state={etat} aside={etat.data ? `${etat.data.articles.length} documenté${etat.data.articles.length > 1 ? "s" : ""}` : undefined}>
        {(e) => (
          <>
            {e.articles.length === 0 ? (
              <div className="status">Aucun article structuré disponible.</div>
            ) : (
              <ul className="base-liste">
                {e.articles.map((a) => (
                  <li key={a.numero}>
                    <a href={a.url} target="_blank" rel="noreferrer">
                      article {a.numero}
                    </a>
                    <span>{a.titre}</span>
                    <span className={`base-statut base-statut-${a.statut}`}>{ARTICLE_LABEL[a.statut]}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Etat>

      <Etat
        titre="Amendements du dossier"
        state={texte}
        aside={texte.data ? `${amendements.length} sur ${texte.data.amendements.length}` : undefined}
      >
        {() => (
          <>
            <div className="base-toolbar" id="base-results">
            <input
              type="search"
              className="base-recherche"
              placeholder="Rechercher un numéro, un auteur ou un mot-clé"
              aria-label="Rechercher un amendement"
              value={q}
              onChange={(ev) => setQ(ev.target.value)}
            />
            <div className="base-selects">
              <label>Statut<select value={sortFiltre} onChange={(e) => setSortFiltre(e.target.value as Sort | "")}><option value="">Tous</option>{SORT_ORDRE.map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}</select></label>
              <label>Groupe<select value={groupeFiltre} onChange={(e) => setGroupeFiltre(e.target.value)}><option value="">Tous</option>{[...groupeParId.values()].sort((a,b) => a.sigle.localeCompare(b.sigle)).map((g) => <option key={g.id} value={g.id}>{g.sigle}</option>)}</select></label>
              <label>Nature<select value={natureFiltre} onChange={(e) => setNatureFiltre(e.target.value as Nature | "")}><option value="">Toutes</option>{(Object.keys(NATURE_LABEL) as Nature[]).map((n) => <option key={n} value={n}>{NATURE_LABEL[n]}</option>)}</select></label>
              <label>Trier par<select value={tri} onChange={(e) => setTri(e.target.value as Tri)}><option value="statut">Statut</option><option value="recent">Dépôt récent</option><option value="numero">Numéro</option></select></label>
            </div>
            </div>
            <Table columns={colonnes} rows={amendementsPage} rowKey={(a) => a.id} empty={q || sortFiltre || groupeFiltre || natureFiltre ? "Aucun amendement ne correspond à ces filtres" : "Aucun amendement"} />
            {amendements.length > PAR_PAGE && <nav className="base-pagination" aria-label="Pagination des amendements">
              <button type="button" disabled={pageCourante === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</button>
              <span>Page {pageCourante} sur {pages} · {amendements.length} amendements</span>
              <button type="button" disabled={pageCourante === pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Suivant</button>
              {pageCourante > 1 && <a href="#base-results">Retour en haut des résultats</a>}
            </nav>}
          </>
        )}
      </Etat>

      <Panel>
        <Meta meta={metaBase} />
      </Panel>
    </div>
  );
}
