import { Link, useParams } from "react-router-dom";
import { useConfig } from "../../lib/config";
import { formatDate } from "../../lib/format";
import VerdictBloc from "../blocs/verdict";
import NouveautesBloc from "../blocs/nouveautes";
import SuiteBloc from "../blocs/suite";
import ActionBloc from "../blocs/action";
import CompteRenduBloc from "../blocs/compte-rendu";

/**
 * Tableau de bord d'un dossier (rendu-final.md) : en-tête sur trois lignes,
 * puis cinq blocs : Verdict (pleine largeur), Nouveautés et Suite (50 / 50),
 * Action (pleine largeur), Compte rendu (pleine largeur).
 */
export default function DossierView() {
  const { id = "" } = useParams<{ id: string }>();
  const config = useConfig();
  const d = config?.dossiers.find((x) => x.id === id);

  if (config && !d) {
    return (
      <div className="view">
        <h1>Dossier inconnu</h1>
        <p className="text-2">« {id} » n'est pas dans config.json.</p>
      </div>
    );
  }

  return (
    <div className="view dossier" data-view="dossier">
      <header className="dossier-head">
        <dl className="dossier-lignes">
          <div>
            <dt>Client</dt>
            <dd>{d?.client ?? "…"}</dd>
          </div>
          <div>
            <dt>Dossier</dt>
            <dd>{d?.label ?? "…"}</dd>
          </div>
          <div>
            <dt>Objectif</dt>
            <dd>{d?.objectif?.texte ?? d?.sujet.label ?? "…"}</dd>
          </div>
        </dl>
        <div className="dossier-head-meta">
          {d?.date_reference && <span className="text-2">vu au {formatDate(d.date_reference)}</span>}
          <Link to={`/dossier/${id}/base`}>Base complète</Link>
        </div>
      </header>

      <div className="dossier-grille">
        <div className="bloc-slot bloc-slot-verdict">
          <VerdictBloc dossier={id} />
        </div>
        <div className="bloc-slot bloc-slot-nouveautes">
          <NouveautesBloc dossier={id} />
        </div>
        <div className="bloc-slot bloc-slot-suite">
          <SuiteBloc dossier={id} />
        </div>
        <div className="bloc-slot bloc-slot-action">
          <ActionBloc dossier={id} />
        </div>
        <div className="bloc-slot bloc-slot-compte-rendu">
          <CompteRenduBloc dossier={id} />
        </div>
      </div>
    </div>
  );
}
