import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { AmendementTexte, Deputes, Etat as EtatData, Groupes, Preuve, Sort, Texte } from "@contracts/index";
import { Etat, GroupeTag, Meta, Panel, Pourquoi, Proba, Table, type Column } from "../../components";
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
type TexteEtat = {
  statut: "en_discussion" | "adopte" | "rejete" | "retire";
  libelle: string;
  date?: string | null;
  url?: string;
  preuve?: Preuve;
};

const NATURE_LABEL: Record<Nature, string> = {
  supprime: "supprime",
  reduit: "réduit",
  reporte: "reporte",
  aggrave: "aggrave",
  autre: "autre",
};
const TEXTE_STATUT_LABEL: Record<TexteEtat["statut"], string> = {
  en_discussion: "en discussion",
  adopte: "adopté",
  rejete: "rejeté",
  retire: "retiré",
};

/** Amendement du gouvernement ou d'une commission (pas de groupe). */
function estInstitutionnel(a: Amdt): boolean {
  return a.auteur_type === "gouvernement" || a.auteur_type === "commission" || a.auteur_id === "GOUVERNEMENT";
}

const ETAPE_LABEL = { fait: "fait", en_cours: "en cours", a_venir: "à venir" } as const;
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
  const [instit, setInstit] = useState(false);

  const groupeParId = useMemo(() => new Map((groupes.data?.groupes ?? []).map((g) => [g.id, g])), [groupes.data]);
  const deputeParId = useMemo(() => new Map((deputes.data?.deputes ?? []).map((p) => [p.id, p])), [deputes.data]);

  const amendements = useMemo(() => {
    const all = [...((texte.data?.amendements ?? []) as Amdt[])].filter((a) => !instit || estInstitutionnel(a)).sort(
      (a, b) => SORT_ORDRE.indexOf(a.sort) - SORT_ORDRE.indexOf(b.sort) || numeroCle(a.numero) - numeroCle(b.numero),
    );
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter((a) => {
      const p = deputeParId.get(a.auteur_id);
      const g = a.groupe_id ? groupeParId.get(a.groupe_id) : undefined;
      return [a.numero, a.resume, SORT_LABEL[a.sort], a.auteur_libelle, a.nature && NATURE_LABEL[a.nature], p?.nom, p?.prenom, g?.sigle].some((x) => x && x.toLowerCase().includes(s));
    });
  }, [texte.data, q, instit, deputeParId, groupeParId]);
  const nInstit = useMemo(() => ((texte.data?.amendements ?? []) as Amdt[]).filter(estInstitutionnel).length, [texte.data]);

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
    {
      key: "proba",
      label: "Orcet",
      align: "right",
      width: "13em",
      render: (a) => <Proba value={a.prediction?.proba_pour ?? null} size="sm" label={a.prediction ? "votes pour prédits" : undefined} />,
    },
  ];

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
      <div className="view-title base-head">
        <h1>Base complète</h1>
        <span className="text-2">
          {d.client ?? "…"} · {d.label ?? id}
          {d.dateReference && ` · vu au ${formatDate(d.dateReference)}`}
        </span>
        <Link to={`/dossier/${id}`}>Tableau de bord</Link>
      </div>

      <Etat titre="État de la mesure" state={etat} aside={etat.data ? `article ${etat.data.mesure.article}` : undefined}>
        {(e) => (
          <>
            <div>
              <strong>{e.mesure.label}</strong>{" "}
              <span className={`base-mesure-statut ${e.mesure.dans_le_texte ? "dans" : "hors"}`}>
                {e.mesure.dans_le_texte ? "toujours dans le texte" : "retirée du texte"}
              </span>
            </div>
            <p className="base-redaction">{e.mesure.redaction_actuelle}</p>
            <h4 className="base-sous-titre">Modifications</h4>
            {e.mesure.modifications.length === 0 ? (
              <div className="status">aucune modification</div>
            ) : (
              <ul className="base-liste">
                {[...e.mesure.modifications]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((m, i) => (
                    <li key={`${m.date}-${i}`}>
                      <span className="base-date">{formatDate(m.date)}</span>
                      <a href={m.url} target="_blank" rel="noreferrer">
                        {m.par}
                      </a>
                      <span>{m.quoi}</span>
                      <Pourquoi preuve={m.preuve} />
                    </li>
                  ))}
              </ul>
            )}
          </>
        )}
      </Etat>

      <Etat titre="État du texte" state={etat} aside={texte.data?.texte.titre}>
        {(e) => (
          <>
            {(() => {
              const te = (e as EtatData & { texte_etat?: TexteEtat }).texte_etat;
              if (!te) return null;
              return (
                <div className="base-texte-etat" data-testid="texte-etat">
                  <span className={`base-statut base-texte-${te.statut}`}>{TEXTE_STATUT_LABEL[te.statut]}</span>
                  {te.url ? (
                    <a href={te.url} target="_blank" rel="noreferrer">
                      {te.libelle}
                    </a>
                  ) : (
                    <span>{te.libelle}</span>
                  )}
                  {te.date && <span className="base-date">{formatDate(te.date)}</span>}
                  {te.preuve && <Pourquoi preuve={te.preuve} />}
                </div>
              );
            })()}
            <div>
              Étape actuelle : <strong>{e.etape}</strong>
            </div>
            <h4 className="base-sous-titre">Étapes</h4>
            <ul className="base-liste">
              {e.etapes.map((s, i) => (
                <li key={`${s.nom}-${i}`}>
                  <span className={`base-statut base-statut-${s.statut}`}>{ETAPE_LABEL[s.statut]}</span>
                  <span className="base-date">{s.date ? formatDate(s.date) : "date inconnue"}</span>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.nom}
                  </a>
                </li>
              ))}
            </ul>
            <h4 className="base-sous-titre">Articles du sujet</h4>
            {e.articles.length === 0 ? (
              <div className="status">aucun article</div>
            ) : (
              <ul className="base-liste">
                {e.articles.map((a) => (
                  <li key={a.numero}>
                    <a href={a.url} target="_blank" rel="noreferrer">
                      article {a.numero}
                    </a>
                    <span>{a.titre}</span>
                    <span className={`base-statut base-statut-${a.statut}`}>{ARTICLE_LABEL[a.statut]}</span>
                    <span className="text-2">{a.sort_detail}</span>
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
            <div className="base-filtres" role="group" aria-label="Filtrer par auteur">
              <button type="button" className="base-puce" aria-pressed={!instit} onClick={() => setInstit(false)}>
                tous
              </button>
              <button type="button" className="base-puce" aria-pressed={instit} onClick={() => setInstit(true)}>
                Gouvernement et commission ({nInstit})
              </button>
            </div>
            <input
              type="search"
              className="base-recherche"
              placeholder="Rechercher : numéro, auteur, groupe, mot"
              aria-label="Rechercher un amendement"
              value={q}
              onChange={(ev) => setQ(ev.target.value)}
            />
            <Table columns={colonnes} rows={amendements} rowKey={(a) => a.id} empty={q || instit ? "aucun amendement ne correspond" : "aucun amendement"} />
          </>
        )}
      </Etat>

      <Panel>
        <Meta meta={etat.data?.meta} />
        <Meta meta={texte.data?.meta} />
      </Panel>
    </div>
  );
}
