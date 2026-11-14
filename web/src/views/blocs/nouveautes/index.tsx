import { useMemo, useState } from "react";
import type { Evenement, Nouveautes } from "@contracts/index";
import { Badge, Etat, Meta, Pourquoi } from "../../../components";
import { useDossier } from "../../../lib/config";
import { useData } from "../../../lib/data";
import { formatDate } from "../../../lib/format";
import "./nouveautes.css";

export const TYPE_LABEL: Record<Evenement["type"], string> = {
  amendement_depose: "dépôt d'amendement",
  amendement_sort: "sort d'amendement",
  scrutin: "scrutin",
  rapport: "rapport",
  audition: "audition",
  seance: "séance",
  commission: "commission",
  hatvp: "HATVP",
  agenda: "agenda",
};

export const EFFET_LABEL: Record<Evenement["effet"], string> = {
  renforce: "renforce",
  affaiblit: "affaiblit",
  neutre: "sans effet",
};

/** Importance décroissante puis date décroissante (le fichier l'est déjà, on ne s'y fie pas). */
function trier(e: Evenement[]): Evenement[] {
  return [...e].sort((a, b) => b.importance - a.importance || b.date.localeCompare(a.date));
}

function chronologique(e: Evenement[]): Evenement[] {
  return [...e].sort((a, b) => b.date.localeCompare(a.date) || b.importance - a.importance);
}

function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

/** Bloc 2 : ce qui s'est passé, trié par importance, avec l'effet sur le verdict. */
export default function NouveautesBloc({ dossier }: { dossier: string }) {
  const r = useData<Nouveautes>("nouveautes", dossier);
  const { dateReference } = useDossier(dossier);
  const [filtre, setFiltre] = useState<Evenement["type"] | null>(null);
  const [toutVoir, setToutVoir] = useState(false);
  const [classement, setClassement] = useState<"importance" | "date">("importance");
  const [ouvert, setOuvert] = useState<string | null>(null);

  const evenements = useMemo(() => classement === "importance" ? trier(r.data?.evenements ?? []) : chronologique(r.data?.evenements ?? []), [r.data, classement]);
  const types = useMemo(() => Array.from(new Set(evenements.map((e) => e.type))), [evenements]);
  const filtres = filtre ? evenements.filter((e) => e.type === filtre) : evenements;
  const visibles = toutVoir ? filtres : filtres.slice(0, 5);
  const qui = evenements.filter((e) => e.importance === 3).length;

  return (
    <Etat
      titre="Nouveautés"
      state={r}
      className="bloc bloc-nouveautes"
      aside={r.status === "ok" && evenements.length > 0 ? `${pluriel(evenements.length, "événement")}, ${qui} qui compte${qui > 1 ? "nt" : ""}` : undefined}
    >
      {(n) => (
        <>
          {dateReference && <div className="nv-rappel">vu au {formatDate(dateReference)}</div>}
          {evenements.length === 0 ? (
            <div className="status">rien de nouveau sur ce dossier</div>
          ) : (
            <>
              {types.length > 1 && (
                <div className="nv-outils">
                <div className="nv-filtres" role="group" aria-label="Filtrer par type">
                  <button type="button" className="nv-puce" aria-pressed={filtre === null} onClick={() => setFiltre(null)}>
                    tout
                  </button>
                  {types.map((t) => (
                    <button key={t} type="button" className="nv-puce" aria-pressed={filtre === t} onClick={() => setFiltre(filtre === t ? null : t)}>
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
                <label className="nv-tri">Classer par
                  <select value={classement} onChange={(e) => { setClassement(e.target.value as "importance" | "date"); setToutVoir(false); }}>
                    <option value="importance">importance</option><option value="date">date</option>
                  </select>
                </label>
                </div>
              )}
              <ul className="nv-liste">
                {visibles.map((e) => (
                  <li key={e.id} className={`nv-item nv-imp-${e.importance}`} data-testid="evenement">
                    <div className="nv-ligne1">
                      {e.importance === 3 && <Badge kind="importance" value={3} />}
                      <span className={`nv-effet nv-effet-${e.effet}`}>{EFFET_LABEL[e.effet]}</span>
                      <span>{formatDate(e.date)}</span>
                      <span>{TYPE_LABEL[e.type]}</span>
                    </div>
                    <button type="button" className="nv-titre" aria-expanded={ouvert === e.id} onClick={() => setOuvert((id) => id === e.id ? null : e.id)}>{e.titre}</button>
                    {ouvert === e.id && <div className="nv-detail-ouvert">
                      <div><strong>Effet proposé sur l’objectif :</strong> {EFFET_LABEL[e.effet]}</div>
                      <p>{e.detail}</p>
                      <div className="nv-detail-actions"><Pourquoi preuve={e.preuve} label="Voir le raisonnement" /><a href={e.url} target="_blank" rel="noreferrer">Ouvrir la source officielle ↗</a></div>
                    </div>}
                  </li>
                ))}
              </ul>
              {filtres.length > 5 && (
                <button type="button" className="nv-voir-tout" onClick={() => setToutVoir((v) => !v)}>
                  {toutVoir ? "Réduire la liste" : `Voir tous les événements (${filtres.length})`}
                </button>
              )}
            </>
          )}
          <Meta meta={n.meta} />
        </>
      )}
    </Etat>
  );
}
