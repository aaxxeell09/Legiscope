import { Link, useParams } from "react-router-dom";
import { Meta } from "../../components";
import { metaExemple } from "../../lib/meta-exemple";

/** Fiche d'un député sur un dossier : composant vide, remplacé par la session propriétaire. */
export default function DeputeView() {
  const { id = "", pa = "" } = useParams<{ id: string; pa: string }>();
  return (
    <div className="view" data-view="depute">
      <div className="view-title">
        <h1>Député</h1>
        <span className="text-2">
          dossier {id}, député {pa}
        </span>
        <Link to={`/dossier/${id}`}>Tableau de bord</Link>
      </div>
      <Meta meta={metaExemple} />
    </div>
  );
}
