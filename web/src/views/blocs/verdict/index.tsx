import { useState } from "react";
import type { RaisonVerdict, Verdict, VerdictObjectif } from "@contracts/index";
import { Badge, Etat, Meta, Pourquoi } from "../../../components";
import { useConfig } from "../../../lib/config";
import { useData } from "../../../lib/data";
import { formatDateTime, formatProba } from "../../../lib/format";
import { Tendance } from "./Tendance";
import "./verdict.css";

const SITUATION: Record<VerdictObjectif["situation"], string> = {
  favorable: "Favorable",
  incertaine: "Incertaine",
  defavorable: "Défavorable",
  insuffisant: "Pas assez d'information",
};

const TENDANCE: Record<VerdictObjectif["tendance"], string> = {
  amelioration: "en amélioration depuis la dernière analyse",
  stable: "stable depuis la dernière analyse",
  degradation: "en dégradation depuis la dernière analyse",
};

const TENDANCE_ICONE: Record<VerdictObjectif["tendance"], string> = {
  amelioration: "↗",
  stable: "→",
  degradation: "↘",
};

const SCORE_LIBELLE = "des sièges favorables à l'objectif";

const CONFIANCE: Record<VerdictObjectif["confiance"]["niveau"], string> = {
  elevee: "élevée",
  moyenne: "moyenne",
  faible: "faible",
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
        <VerdictObjectifVue v={courant} genere={verdict.meta.generated_at} />
      </div>

      <Tendance dossier={dossierCfg} />
      <details className="verdict-fondements">
        <summary>Fondements techniques et sources</summary>
        <Meta meta={verdict.meta} />
      </details>
    </div>
  );
}

function VerdictObjectifVue({ v, genere }: { v: VerdictObjectif; genere: string }) {
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
            </span>
          )}
          {raisonGlobale.sources.length > 0 && <Pourquoi {...raisonGlobale} />}
        </div>
        <div className="verdict-tendance" data-tendance={v.tendance}>
          <span className="text-2">Tendance</span>
          <span className="verdict-tendance-valeur"><span aria-hidden="true">{TENDANCE_ICONE[v.tendance]}</span> {TENDANCE[v.tendance]}</span>
        </div>
        <div className="verdict-confiance">
          <span className="text-2">Confiance</span>
          <span className="verdict-confiance-valeur">{CONFIANCE[v.confiance.niveau]}</span>
          {(v.confiance.etabli.length > 0 || v.confiance.inconnu.length > 0) && <details className="verdict-confiance-detail">
            <summary>Voir les fondements</summary>
            {v.confiance.etabli.length > 0 && <div className="verdict-confiance-ligne"><strong>Ce qui est établi</strong>{v.confiance.etabli.join(" ; ")}</div>}
            {v.confiance.inconnu.length > 0 && <div className="verdict-confiance-ligne"><strong>Ce qui reste inconnu</strong>{v.confiance.inconnu.join(" ; ")}</div>}
          </details>}
        </div>
      </div>

      {v.cause_du_changement && (
        <div className="verdict-cause">
          <span className="text-2">{v.tendance === "stable" ? "Événement important" : "Élément associé à l’évolution"}</span>
          <span className={natureClass(v.cause_du_changement.preuve.nature)}>{v.cause_du_changement.titre}</span>
          <NatureMarque nature={v.cause_du_changement.preuve.nature} />{" "}
          <Pourquoi preuve={v.cause_du_changement.preuve} />
        </div>
      )}

      <p className="verdict-lecture">
        {v.lecture.texte} {v.lecture.mode === "gabarit" ? <Badge kind="gabarit" /> : <Badge kind={v.lecture.verifie ? "verifie" : "non-verifie"} />}
        <span className="text-2 verdict-lecture-modele">{v.lecture.modele ?? "sans modèle"}, {formatDateTime(genere)}</span>
      </p>

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
  const [developpe, setDeveloppe] = useState(false);
  const visibles = developpe ? raisons : raisons.slice(0, 3);
  return (
    <div className="verdict-colonne">
      <h4>{titre}</h4>
      {raisons.length === 0 ? (
        <p className="text-2">{vide}</p>
      ) : (
        <ul className="verdict-raisons">
          {visibles.map((r, i) => (
            <li key={`${r.titre}-${i}`} className={natureClass(r.preuve.nature)} data-nature={r.preuve.nature}>
              <div className="verdict-raison-titre">
                {r.titre} <NatureMarque nature={r.preuve.nature} />{" "}
                <Pourquoi preuve={r.preuve} />
              </div>
              <div className="verdict-raison-detail">{r.detail}</div>
            </li>
          ))}
        </ul>
      )}
      {raisons.length > 3 && <button type="button" className="verdict-voir-plus" onClick={() => setDeveloppe((v) => !v)}>{developpe ? "Réduire" : `Voir les ${raisons.length} éléments`}</button>}
    </div>
  );
}

/** « fait » sobre, « déduction » marqué, « inconnue » en texte secondaire. */
export function natureClass(n: "fait" | "deduction" | "inconnue"): string {
  return `nature-${n}`;
}

export function NatureMarque({ nature }: { nature: "fait" | "deduction" | "inconnue" }) {
  if (nature === "fait") return null;
  return <Badge kind={nature} />;
}
