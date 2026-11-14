import { Link, useParams } from "react-router-dom";
import { Meta } from "../../components";
import { metaExemple } from "../../lib/meta-exemple";

/** Base complète : état du texte, articles, amendements. Composant vide, remplacé par la session propriétaire. */
export default function BaseView() {
  const { id = "" } = useParams<{ id: string }>();
  return (
    <div className="view" data-view="base">
      <div className="view-title">
        <h1>Base complète</h1>
        <span className="text-2">dossier {id}</span>
        <Link to={`/dossier/${id}`}>Tableau de bord</Link>
      </div>
      <Meta meta={metaExemple} />
    </div>
  );
}
