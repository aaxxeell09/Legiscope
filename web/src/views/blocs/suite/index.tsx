import type { Echeance, Probable, Suite } from "@contracts/index";
import { Badge, Etat, Meta, Pourquoi } from "../../../components";
import { useData } from "../../../lib/data";
import { formatDate, formatProba } from "../../../lib/format";
import "../verdict/verdict.css";
import "./suite.css";

const LIEU: Record<Echeance["lieu"], string> = {
  seance: "en séance publique",
  commission: "en commission",
  senat: "au Sénat",
  cmp: "en commission mixte paritaire",
  autre: "autre lieu",
};

/** Bloc 3 : dernière occasion d'agir, prochaines échéances, ce qui a le plus de chances d'arriver. */
export default function SuiteBloc({ dossier }: { dossier: string }) {
  const r = useData<Suite>("suite", dossier);
  return (
    <Etat titre="Suite" state={r} className="bloc bloc-suite">
      {(s) => <SuiteContenu s={s} />}
    </Etat>
  );
}

function SuiteContenu({ s }: { s: Suite }) {
  const echeances = [...s.echeances].sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
  const premiere = echeances[0];
  const suivantes = echeances.slice(1);
  return (
    <div className="suite">
      {s.derniere_occasion && (
        <div className="suite-occasion">
          <span className="text-2">{s.derniere_occasion.preuve.nature === "fait" ? "Dernière occasion procédurale identifiée" : "Occasion procédurale signalée"}</span>
          <span className="suite-occasion-date">{s.derniere_occasion.date ? formatDate(s.derniere_occasion.date) : "date inconnue"}</span>
          <span className="suite-occasion-titre">
            {s.derniere_occasion.titre} <Nature n={s.derniere_occasion.preuve.nature} />{" "}
            <Pourquoi preuve={s.derniere_occasion.preuve} />
          </span>
        </div>
      )}

      <section>
        <h4 className="suite-titre">Prochaines échéances</h4>
        {echeances.length === 0 ? (
          <p className="text-2">
            aucune échéance connue{s.meta.limits ? ` ; ${s.meta.limits}` : ""}
          </p>
        ) : (
          <><EcheanceLigne e={premiere} prioritaire />{suivantes.length > 0 && <details className="suite-autres"><summary>Voir les autres échéances <span>{suivantes.length}</span></summary><div className="suite-liste">{suivantes.map((e, i) => <EcheanceLigne key={`${e.date}-${i}`} e={e} />)}</div></details>}</>
        )}
      </section>

      <details className="suite-scenarios">
        <summary>Scénarios documentés <span>{s.probables.length}</span></summary>
        {s.probables.length === 0 ? (
          <p className="text-2">Pas de prédiction disponible.</p>
        ) : (
          <><p className="suite-avertissement">Ces éléments décrivent les données fournies ; ils ne constituent pas une probabilité d’adoption de la mesure.</p><ul className="suite-liste">
            {s.probables.map((p, i) => (
              <ProbableLigne key={`${p.titre}-${i}`} p={p} />
            ))}
          </ul></>
        )}
      </details>

      <Meta meta={s.meta} />
    </div>
  );
}

function EcheanceLigne({ e, prioritaire = false }: { e: Echeance; prioritaire?: boolean }) {
  return <div className={`suite-echeance nature-${e.preuve.nature}${prioritaire ? " suite-echeance-prioritaire" : ""}`}>
    <span className="suite-date"><span className="suite-marker" aria-hidden="true" />{e.date ? formatDate(e.date) : "Date à confirmer"}</span>
    <span><a href={e.url} target="_blank" rel="noreferrer">{e.titre}</a>{" "}<span className="text-2">{LIEU[e.lieu]}</span> <Nature n={e.preuve.nature} />{" "}<Pourquoi preuve={e.preuve} /></span>
  </div>;
}

function ProbableLigne({ p }: { p: Probable }) {
  return (
    <li className={`suite-probable nature-${p.preuve.nature}`}>
      <span className="suite-proba">{p.proba === null ? <span className="text-2">Sans indicateur</span> : <><strong>{formatProba(p.proba)}</strong><small>indicateur fourni</small></>}</span>
      <span>
        <span className="suite-probable-titre">{p.titre}</span> <Nature n={p.preuve.nature} />{" "}
        <Pourquoi preuve={p.preuve} />
        <span className="suite-detail">{p.detail}</span>
      </span>
    </li>
  );
}

function Nature({ n }: { n: "fait" | "deduction" | "inconnue" }) {
  return n === "fait" ? null : <Badge kind={n} />;
}
