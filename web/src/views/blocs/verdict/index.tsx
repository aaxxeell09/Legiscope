import type { RaisonVerdict, Verdict, VerdictObjectif } from "@contracts/index";
import { Badge, Etat, Meta, Pourquoi } from "../../../components";
import { useConfig } from "../../../lib/config";
import { useData } from "../../../lib/data";
import { formatProba } from "../../../lib/format";
import { Tendance } from "./Tendance";
import "./verdict.css";

const SITUATION: Record<VerdictObjectif["situation"], string> = {
  favorable: "Favorable",
  incertaine: "Incertaine",
  defavorable: "Défavorable",
  insuffisant: "Pas assez d'information",
};

const TENDANCE: Record<VerdictObjectif["tendance"], string> = {
  amelioration: "En amélioration",
  stable: "Stable",
  degradation: "En dégradation",
};

const TENDANCE_ICONE: Record<VerdictObjectif["tendance"], string> = {
  amelioration: "↗",
  stable: "→",
  degradation: "↘",
};

const SCORE_LIBELLE = "des sièges favorables à l'objectif";

const CONFIANCE: Record<VerdictObjectif["confiance"]["niveau"], string> = {
  elevee: "Élevée",
  moyenne: "Moyenne",
  faible: "Faible",
};

/** Bloc 1 : un verdict par objectif, le principal ouvert, les replis en onglets. */
export default function VerdictBloc({ dossier, objectifRang }: { dossier: string; objectifRang: number }) {
  const r = useData<Verdict>("verdict", dossier);
  return (
    <Etat titre="Verdict" state={r} className="bloc bloc-verdict">
      {(v) => <VerdictContenu verdict={v} dossier={dossier} objectifRang={objectifRang} />}
    </Etat>
  );
}

function VerdictContenu({ verdict, dossier, objectifRang }: { verdict: Verdict; dossier: string; objectifRang: number }) {
  const config = useConfig();
  const dossierCfg = config?.dossiers.find((d) => d.id === dossier) ?? null;
  const verdicts = [...verdict.verdicts].sort((a, b) => a.objectif_rang - b.objectif_rang);
  const courant = verdicts.find((v) => v.objectif_rang === objectifRang) ?? verdicts[0];

  return (
    <div className="verdict">
      <div className="verdict-panneau">
        <VerdictObjectifVue v={courant} />
      </div>

      <Tendance dossier={dossierCfg} />
      <Meta meta={verdict.meta} />
    </div>
  );
}

function VerdictObjectifVue({ v }: { v: VerdictObjectif }) {
  const phrases = v.lecture.texte.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  const lecturePrincipale = phrases.slice(0, 2).join(" ");
  const lectureSuite = phrases.slice(2).join(" ");
  const raisonGlobale = {
    sources: [...v.favorable, ...v.bloquant, ...(v.cause_du_changement ? [v.cause_du_changement] : [])]
      .flatMap((x) => x.preuve.sources)
      .filter((s, i, all) => all.findIndex((t) => t.url === s.url) === i),
    raisonnement: v.lecture.texte,
    nature: "deduction" as const,
  };

  return (
    <>
      <div className="verdict-bandeau">
        <div className="verdict-situation-bloc">
          <span className="verdict-dimension">Situation actuelle</span>
          <span className={`verdict-situation verdict-situation-${v.situation}`} data-situation={v.situation}>
            {SITUATION[v.situation]}
          </span>
          {v.score !== null && (
            <span className="verdict-score">
              <span className="verdict-score-valeur">{formatProba(v.score)}</span>
              <span className="verdict-score-libelle">{libelleScore(v)}</span>
              {raisonGlobale.sources.length > 0 && <Pourquoi {...raisonGlobale} label="Voir les sources et le raisonnement du score" />}
            </span>
          )}
        </div>
        <div className="verdict-indicateurs">
          <div className="verdict-indicateur verdict-tendance" data-tendance={v.tendance}>
            <span className="verdict-indicateur-label">Tendance</span>
            <span className="verdict-indicateur-valeur"><span className="verdict-tendance-icone" aria-hidden="true">{TENDANCE_ICONE[v.tendance]}</span>{TENDANCE[v.tendance]}</span>
          </div>
          <div className="verdict-indicateur verdict-confiance">
            <span className="verdict-indicateur-label">Confiance</span>
            <span className="verdict-indicateur-valeur">{CONFIANCE[v.confiance.niveau]}</span>
            {(v.confiance.etabli.length > 0 || v.confiance.inconnu.length > 0) && <details className="verdict-confiance-detail">
              <summary>Fondements</summary>
              {v.confiance.etabli.length > 0 && <div className="verdict-confiance-ligne"><strong>Ce qui est établi</strong>{v.confiance.etabli.join(" ; ")}</div>}
              {v.confiance.inconnu.length > 0 && <div className="verdict-confiance-ligne"><strong>Ce qui reste inconnu</strong>{v.confiance.inconnu.join(" ; ")}</div>}
            </details>}
          </div>
        </div>
      </div>

      {v.cause_du_changement && (
        <div className="verdict-cause">
          <span className="verdict-cause-label">{v.cause_du_changement.preuve.nature === "fait" ? "Événement significatif" : v.cause_du_changement.preuve.nature === "deduction" ? "Élément associé à l’évolution" : "Signal à confirmer"}</span>
          <span className={natureClass(v.cause_du_changement.preuve.nature)}>{v.cause_du_changement.titre}</span>
          <NatureMarque nature={v.cause_du_changement.preuve.nature} />{" "}
          <Pourquoi preuve={v.cause_du_changement.preuve} />
        </div>
      )}

      <div className="verdict-analyse">
        <span className="verdict-analyse-label">Lecture</span>
        <p className="verdict-lecture">{lecturePrincipale}</p>
        {lectureSuite && <details className="verdict-lecture-suite"><summary>Lire l’analyse complète</summary><p>{lectureSuite}</p></details>}
      </div>

      <div className="verdict-colonnes">
        <Colonne titre="Ce qui marche" vide="rien de favorable identifié" raisons={v.favorable} />
        <Colonne titre="Ce qui coince" vide="rien de bloquant identifié" raisons={v.bloquant} />
      </div>
    </>
  );
}

/** « 26 % des sièges favorables à l'objectif » : jamais un pourcentage seul. */
function libelleScore(v: VerdictObjectif): string {
  const l = (v as VerdictObjectif & { score_libelle?: string }).score_libelle?.trim();
  if (!l) return SCORE_LIBELLE;
  // score_libelle vaut « part des sièges favorables à l'objectif » : on garde « des sièges ... ».
  return l.replace(/^part\s+/i, "");
}

function Colonne({ titre, vide, raisons }: { titre: string; vide: string; raisons: RaisonVerdict[] }) {
  return (
    <div className="verdict-colonne">
      <h4>{titre}</h4>
      {raisons.length === 0 ? (
        <p className="text-2">{vide}</p>
      ) : (
        <ul className="verdict-raisons">
          {raisons.map((r, i) => {
            const detail = detailLisible(r.detail);
            return <li key={`${r.titre}-${i}`} className={natureClass(r.preuve.nature)} data-nature={r.preuve.nature}>
                <div className="verdict-raison-titre">
                  {r.titre} <NatureMarque nature={r.preuve.nature} />{" "}
                  <Pourquoi preuve={r.preuve} />
                </div>
                {detail && <div className="verdict-raison-detail">{detail}</div>}
              </li>;
          })}
        </ul>
      )}
    </div>
  );
}

/** Retire uniquement les clauses de calcul prédictif ; la donnée et les preuves restent intactes. */
function detailLisible(detail: string): string {
  return detail
    .replace(/\s*[;,.—–]\s*Orcet\s*:\s*.*$/i, "")
    .replace(/\s*[;,.—–]\s*(?:la\s+)?moyenne\s+des\s+probabilités\s+individuelles.*$/i, "")
    .trim();
}

/** « fait » sobre, « déduction » marqué, « inconnue » en texte secondaire. */
export function natureClass(n: "fait" | "deduction" | "inconnue"): string {
  return `nature-${n}`;
}

export function NatureMarque({ nature }: { nature: "fait" | "deduction" | "inconnue" }) {
  if (nature === "fait") return null;
  return <Badge kind={nature} />;
}
