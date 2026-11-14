import { Link } from "react-router-dom";
import { useDossier } from "../../lib/config";
import { formatDate } from "../../lib/format";
import { Chargement, Erreur, ErrorBoundary } from "../../components";
import VerdictBloc from "../blocs/verdict";
import NouveautesBloc from "../blocs/nouveautes";
import SuiteBloc from "../blocs/suite";
import ActionBloc from "../blocs/action";
import CompteRenduBloc from "../blocs/compte-rendu";

const BLOCS = [
  { slot: "verdict", nom: "Verdict", C: VerdictBloc },
  { slot: "nouveautes", nom: "Nouveautés", C: NouveautesBloc },
  { slot: "suite", nom: "Suite", C: SuiteBloc },
  { slot: "action", nom: "Action", C: ActionBloc },
  { slot: "compte-rendu", nom: "Compte rendu", C: CompteRenduBloc },
] as const;

/**
 * Tableau de bord d'un dossier (rendu-final.md) : en-tête (client, dossier,
 * mesure, objectif principal puis replis), puis cinq blocs : Verdict (pleine
 * largeur), Nouveautés et Suite (50 / 50), Action, Compte rendu.
 * Chaque bloc charge ses données ; un bloc qui plante n'emporte pas la page.
 */
export default function DossierView() {
  const d = useDossier();

  if (d.status === "loading") return <div className="view"><Chargement quoi="config.json" /></div>;
  if (d.status === "error") return <div className="view"><Erreur message={`config.json : ${d.error}`} /></div>;
  if (d.status === "inconnu") {
    return (
      <div className="view">
        <h1>Dossier inconnu</h1>
        <p className="text-2">« {d.id} » n'est pas dans config.json.</p>
        <p><Link to="/">Revenir au dossier de démonstration</Link></p>
      </div>
    );
  }

  return (
    <div className="view dossier" data-view="dossier">
      <header className="dossier-head">
        <dl className="dossier-lignes">
          <div>
            <dt>Client</dt>
            <dd>{d.client}</dd>
          </div>
          <div>
            <dt>Dossier</dt>
            <dd>{d.label}</dd>
          </div>
          {d.mesure && (
            <div>
              <dt>Mesure</dt>
              <dd className="dossier-mesure">
                {d.mesure.label}
                {d.mesure.article && <span className="text-2"> article {d.mesure.article}</span>}
              </dd>
            </div>
          )}
          <div>
            <dt>Objectif</dt>
            <dd>{d.principal?.texte}</dd>
          </div>
          {d.replis.map((o) => (
            <div key={o.rang}>
              <dt>À défaut</dt>
              <dd className="dossier-repli">{o.texte}</dd>
            </div>
          ))}
        </dl>
        <div className="dossier-head-meta">
          {d.dateReference && <span className="dossier-dateref">vu au {formatDate(d.dateReference)}</span>}
          <Link to={`/dossier/${d.id}/base`}>Base complète</Link>
        </div>
      </header>

      <div className="dossier-grille">
        {BLOCS.map(({ slot, nom, C }) => (
          <div key={slot} className={`bloc-slot bloc-slot-${slot}`}>
            <ErrorBoundary zone={nom} resetKey={d.id}>
              <C dossier={d.id} />
            </ErrorBoundary>
          </div>
        ))}
      </div>
    </div>
  );
}
