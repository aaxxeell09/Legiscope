import type { Meta as MetaType } from "../lib/data";
import { formatDateTime } from "../lib/format";

/** Une ligne en pied de vue : sources en liens, date de génération, limites. */
export function Meta({ meta }: { meta: MetaType | null | undefined }) {
  if (!meta) return null;
  const sources = meta.sources ?? [];
  return (
    <footer className="meta" data-testid="meta">
      {sources.length > 0 && (
        <span>
          Sources :{" "}
          {sources.map((s, i) => (
            <span key={`${s.url}-${i}`}>
              {i > 0 && ", "}
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </span>
          ))}
        </span>
      )}
      {meta.generated_at && <span className="meta-sep">généré le {formatDateTime(meta.generated_at)}</span>}
      {meta.limits && <span className="meta-sep">{meta.limits}</span>}
    </footer>
  );
}
