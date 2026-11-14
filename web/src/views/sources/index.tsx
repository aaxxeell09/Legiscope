import { Meta } from "../../components";
import { metaExemple } from "../../lib/meta-exemple";

/** Vue Sources : composant vide, remplacé par la session propriétaire de ce dossier. */
export default function SourcesView() {
  return (
    <div className="view" data-view="sources">
      <div className="view-title">
        <h1>Sources</h1>
      </div>
      <Meta meta={metaExemple} />
    </div>
  );
}
