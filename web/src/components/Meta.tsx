import type { Meta as MetaType } from "../lib/data";
import { formatDateTime } from "../lib/format";

/** Métadonnées repliées par défaut : la preuve reste accessible sans alourdir le bloc. */
export function Meta({ meta }: { meta: MetaType | null | undefined }) {
  if (!meta) return null;
  const sources = meta.sources ?? [];
  return (
    <footer className="meta" data-testid="meta">
      <details className="meta-details">
        <summary>
          <span>Sources et limites</span>
          {meta.generated_at && <span className="meta-generated">Dernière génération : {formatDateTime(meta.generated_at)}</span>}
        </summary>
        <div className="meta-content">
          <div className="meta-section">
            <strong>Sources consultées</strong>
            {sources.length > 0 ? (
              <ul>{sources.map((s, i) => <li key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
            ) : <span className="text-2">Aucune source renseignée.</span>}
          </div>
          <div className="meta-section">
            <strong>Limites déclarées</strong>
            <p>{meta.limits || "Aucune limite renseignée dans ce fichier."}</p>
          </div>
          {(meta.producer || meta.dossier_id) && <div className="meta-technical">
            {meta.producer && <span>Producteur : {meta.producer}</span>}
            {meta.dossier_id && <span>Dossier : {meta.dossier_id}</span>}
          </div>}
        </div>
      </details>
    </footer>
  );
}
