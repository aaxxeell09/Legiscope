import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDossier } from "../../lib/config";
import { Chargement, Erreur, ErrorBoundary } from "../../components";
import VerdictBloc from "../blocs/verdict";
import NouveautesBloc from "../blocs/nouveautes";
import SuiteBloc from "../blocs/suite";
import ActionBloc from "../blocs/action";
import CompteRenduBloc from "../blocs/compte-rendu";
import "./dossier.css";

const BLOCS = [
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
  const [objectifRang, setObjectifRang] = useState(1);

  useEffect(() => {
    setObjectifRang(d.principal?.rang ?? 1);
  }, [d.id, d.principal?.rang]);

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

  const titreBrut = d.label?.replace(/^PLF\s+\d{4}\s*[,—–-]\s*/i, "") ?? d.label ?? "Dossier";
  const titre = titreBrut.charAt(0).toUpperCase() + titreBrut.slice(1);
  const mesureCourte = d.mesure?.label && d.mesure.label.length > 120 ? `${d.mesure.label.slice(0, 117).trimEnd()}…` : d.mesure?.label;

  return (
    <div className="view dossier" data-view="dossier">
      <header className="dossier-head">
        <div className="dossier-hero">
          <div className="dossier-heading">
            <div className="dossier-kicker">{d.client}</div>
            <h1>{titre}</h1>
            {d.mesure && <p className="dossier-mesure" title={d.mesure.label}>{mesureCourte}</p>}
          </div>
        </div>

        <div className="dossier-objectifs-wrap">
          <span className="dossier-objectifs-label">Objectif suivi</span>
          <div className="dossier-objectifs" role="tablist" aria-label="Objectif analysé">
            {d.objectifs.map((o, i) => (
              <button
                type="button"
                role="tab"
                key={o.rang}
                aria-selected={objectifRang === o.rang}
                title={o.texte}
                tabIndex={objectifRang === o.rang ? 0 : -1}
                className={`objectif${objectifRang === o.rang ? " actif" : ""}`}
                onClick={() => setObjectifRang(o.rang)}
                onKeyDown={(e) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
                  e.preventDefault();
                  const next = e.key === "Home" ? 0 : e.key === "End" ? d.objectifs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + d.objectifs.length) % d.objectifs.length;
                  setObjectifRang(d.objectifs[next].rang);
                  (e.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined)?.focus();
                }}
              >
                <span>{o.rang === 1 ? "Principal" : `Repli ${o.rang - 1}`}</span>
                <strong>{o.texte}</strong>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="dossier-grille">
        <div className="bloc-slot bloc-slot-verdict"><ErrorBoundary zone="Verdict" resetKey={d.id}><VerdictBloc dossier={d.id} objectifRang={objectifRang} /></ErrorBoundary></div>
        {BLOCS.map(({ slot, nom, C }) => <div key={slot} className={`bloc-slot bloc-slot-${slot}`}><ErrorBoundary zone={nom} resetKey={d.id}><C dossier={d.id} /></ErrorBoundary></div>)}
      </div>
    </div>
  );
}
