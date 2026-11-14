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

function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

/** Bloc 2 : ce qui s'est passé, trié par importance, avec l'effet sur le verdict. */
export default function NouveautesBloc({ dossier }: { dossier: string }) {
  const r = useData<Nouveautes>("nouveautes", dossier);
  const { dateReference } = useDossier(dossier);
  const [filtre, setFiltre] = useState<Evenement["type"] | null>(null);
  const [toutVoir, setToutVoir] = useState(false);

  const evenements = useMemo(() => trier(r.data?.evenements ?? []), [r.data]);
  const types = useMemo(() => Array.from(new Set(evenements.map((e) => e.type))), [evenements]);
  const filtres = filtre ? evenements.filter((e) => e.type === filtre) : evenements;
  const visibles = toutVoir ? filtres : filtres.slice(0, 8);
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
                    <div className="nv-titre">
                      <a href={e.url} target="_blank" rel="noreferrer">
                        {e.titre}
                      </a>
                    </div>
                    <div className="nv-detail-ligne">
                      <span className="nv-detail" title={e.detail}>
                        {e.detail}
                      </span>
                      <Pourquoi preuve={e.preuve} />
                    </div>
                  </li>
                ))}
              </ul>
              {filtres.length > 8 && (
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
