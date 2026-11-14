import type { Meta as MetaType } from "../lib/data";

/** Accès discret aux seules sources originales ; les métadonnées techniques restent dans les JSON. */
export function Meta({ meta }: { meta: MetaType | null | undefined }) {
  if (!meta) return null;
  const sources = (meta.sources ?? []).filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index);
  if (sources.length === 0) return null;
  return (
    <footer className="meta" data-testid="meta">
      <details className="meta-details">
        <summary>Sources</summary>
        <ul className="meta-sources">{sources.map((s, i) => <li key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
      </details>
    </footer>
  );
}
