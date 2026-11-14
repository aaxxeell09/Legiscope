import "./sources.css";

const SOURCES_OFFICIELLES = [
  { institution: "Assemblée nationale", label: "Dossiers législatifs", url: "https://www.assemblee-nationale.fr/dyn/17/dossiers" },
  { institution: "Assemblée nationale", label: "Données publiques", url: "https://data.assemblee-nationale.fr" },
  { institution: "Sénat", label: "Dossiers législatifs", url: "https://www.senat.fr/dossiers-legislatifs/index.html" },
  { institution: "HATVP", label: "Répertoire des représentants d’intérêts", url: "https://www.hatvp.fr/le-repertoire/" },
] as const;

/** Page globale de provenance : uniquement des accès lisibles aux sources officielles. */
export default function SourcesView() {
  return (
    <div className="view sources-clean" data-view="sources">
      <header className="sources-head">
        <div>
          <div className="sources-kicker">Provenance</div>
          <h1>Sources</h1>
          <p>Les références institutionnelles utilisées par LegiSpot.</p>
        </div>
      </header>

      <section className="sources-directory" aria-labelledby="sources-officielles">
        <div className="sources-directory-head">
          <h2 id="sources-officielles">Sources officielles</h2>
          <p>Les liens propres à chaque information restent accessibles depuis les boutons Sources et les icônes ⓘ.</p>
        </div>
        <ul className="sources-official-list">
          {SOURCES_OFFICIELLES.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                <span>{source.institution}</span>
                <strong>{source.label}</strong>
                <span className="sources-external" aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
