import { useState } from "react";
import type { Etat as EtatDossier, RaisonVerdict, Verdict, VerdictObjectif } from "@contracts/index";
import { Badge, Etat, Meta, Pourquoi, Proba } from "../../../components";
import { useConfig } from "../../../lib/config";
import { useData } from "../../../lib/data";
import { formatDate, formatDateTime } from "../../../lib/format";
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

const SCORE_LIBELLE = "des sièges favorables à l'objectif";

const STATUT_TEXTE: Record<string, string> = {
  en_discussion: "en discussion",
  adopte: "adopté",
  rejete: "rejeté",
  retire: "retiré",
};

type TexteEtat = {
  statut: string;
  libelle: string;
  date: string | null;
  url: string;
  preuve: { sources: { label: string; url: string }[]; raisonnement: string; nature: "fait" | "deduction" | "inconnue" };
};

const CONFIANCE: Record<VerdictObjectif["confiance"]["niveau"], string> = {
  elevee: "élevée",
  moyenne: "moyenne",
  faible: "faible",
};

/** Bloc 1 : un verdict par objectif, le principal ouvert, les replis en onglets. */
export default function VerdictBloc({ dossier }: { dossier: string }) {
  const r = useData<Verdict>("verdict", dossier);
  return (
    <Etat titre="Verdict" state={r} className="bloc bloc-verdict">
      {(v) => <VerdictContenu verdict={v} dossier={dossier} />}
    </Etat>
  );
}

function VerdictContenu({ verdict, dossier }: { verdict: Verdict; dossier: string }) {
  const config = useConfig();
  const dossierCfg = config?.dossiers.find((d) => d.id === dossier) ?? null;
  const objectifs = dossierCfg?.objectifs ?? [];
  const verdicts = [...verdict.verdicts].sort((a, b) => a.objectif_rang - b.objectif_rang);
  const [rang, setRang] = useState(verdicts[0]?.objectif_rang ?? 1);
  const courant = verdicts.find((v) => v.objectif_rang === rang) ?? verdicts[0];

  const libelle = (r: number) => {
    const o = objectifs.find((x) => x.rang === r);
    const texte = o?.texte ?? `Objectif ${r}`;
    return r === 1 ? texte : `À défaut : ${texte}`;
  };

  return (
    <div className="verdict">
      <EtatLigne dossier={dossier} />
      {verdicts.length > 1 && (
        <div className="verdict-onglets" role="tablist" aria-label="Objectifs">
          {verdicts.map((v) => (
            <button
              key={v.objectif_rang}
              type="button"
              role="tab"
              id={`verdict-tab-${v.objectif_rang}`}
              aria-selected={v.objectif_rang === courant.objectif_rang}
              aria-controls="verdict-panneau"
              className={v.objectif_rang === courant.objectif_rang ? "verdict-onglet actif" : "verdict-onglet"}
              onClick={() => setRang(v.objectif_rang)}
            >
              {libelle(v.objectif_rang)}
            </button>
          ))}
        </div>
      )}

      <div id="verdict-panneau" role="tabpanel" aria-labelledby={`verdict-tab-${courant.objectif_rang}`}>
        <VerdictObjectifVue v={courant} genere={verdict.meta.generated_at} />
      </div>

      <Tendance dossier={dossierCfg} />

      <Meta meta={verdict.meta} />
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
          <span className={`verdict-situation verdict-situation-${v.situation}`} data-situation={v.situation}>
            {SITUATION[v.situation]}
          </span>
          {v.score !== null && (
            <span className="verdict-score">
              <Proba value={v.score} size="md" />
              <span className="verdict-score-libelle">{libelleScore(v)}</span>
            </span>
          )}
          {raisonGlobale.sources.length > 0 && <Pourquoi {...raisonGlobale} />}
        </div>
        <div className="verdict-tendance" data-tendance={v.tendance}>
          <span className="text-2">Tendance</span>
          <span>{TENDANCE[v.tendance]}</span>
        </div>
        <div className="verdict-confiance">
          <span className="text-2">Confiance</span>
          <span>{CONFIANCE[v.confiance.niveau]}</span>
          {v.confiance.etabli.length > 0 && (
            <span className="verdict-confiance-ligne">
              <span className="text-2">établi : </span>
              {v.confiance.etabli.join(" ; ")}
            </span>
          )}
          {v.confiance.inconnu.length > 0 && (
            <span className="verdict-confiance-ligne">
              <span className="text-2">inconnu : </span>
              {v.confiance.inconnu.join(" ; ")}
            </span>
          )}
        </div>
      </div>

      {v.cause_du_changement && (
        <div className="verdict-cause">
          <span className="text-2">Ce qui a fait bouger le verdict</span>
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

/** État de la mesure et, à part, état du texte (etat.json). */
function EtatLigne({ dossier }: { dossier: string }) {
  const r = useData<EtatDossier>("etat", dossier);
  if (r.status !== "ok" || !r.data) return null;
  const e = r.data;
  const texte = (e as EtatDossier & { texte_etat?: TexteEtat | null }).texte_etat ?? null;
  return (
    <div className="verdict-etat">
      <span>
        <span className="text-2">Mesure : </span>
        {e.mesure.dans_le_texte ? "dans le texte" : "absente du texte"}{" "}
        <Pourquoi sources={e.meta.sources} raisonnement={e.mesure.redaction_actuelle} nature="fait" />
      </span>
      {texte && (
        <span>
          <span className="text-2">Texte : </span>
          {texte.libelle || STATUT_TEXTE[texte.statut] || texte.statut}
          {texte.date && <span className="text-2"> le {formatDate(texte.date)}</span>}{" "}
          <Pourquoi preuve={texte.preuve} />
        </span>
      )}
    </div>
  );
}

function Colonne({ titre, vide, raisons }: { titre: string; vide: string; raisons: RaisonVerdict[] }) {
  return (
    <div className="verdict-colonne">
      <h4>{titre}</h4>
      {raisons.length === 0 ? (
        <p className="text-2">{vide}</p>
      ) : (
        <ul className="verdict-raisons">
          {raisons.map((r, i) => (
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
