import { useNavigate } from "react-router-dom";
import type { Action, Argument, DeputeAction, FichesIndex } from "@contracts/index";
import { Etat, Meta, Pourquoi } from "../../../components";
import { useData } from "../../../lib/data";
import { formatProba } from "../../../lib/format";
import {
  FONDEMENT,
  GROUPE_ACTION,
  POSITION_DECIDEUR,
  ROLE_DECIDEUR,
  Redaction,
  Tag,
  quandOu,
  useAnnuaire,
  type Annuaire,
  type CleGroupeAction,
} from "../../depute/commun";
import "../../depute/p7.css";

/** Bloc 4, Action : qui décide, sur qui agir, avec quels arguments. */
export default function ActionBloc({ dossier }: { dossier: string }) {
  const r = useData<Action>("action", dossier);
  const idx = useData<FichesIndex>("fiches_index", dossier);
  const annuaire = useAnnuaire();
  return (
    <Etat titre="Action" state={r} className="bloc bloc-action">
      {(a) => <ActionContenu a={a} dossier={dossier} annuaire={annuaire} disponibles={idx.data?.disponibles ?? null} />}
    </Etat>
  );
}

function ActionContenu({ a, dossier, annuaire, disponibles }: { a: Action; dossier: string; annuaire: Annuaire; disponibles: string[] | null }) {
  const cles: CleGroupeAction[] = ["actionnables", "allies", "perdus"];
  return (
    <>
      <section className="p7-section" style={{ marginTop: 0 }}>
        <h4>Ceux qui décident</h4>
        {a.decideurs.length === 0 ? (
          <div className="p7-vide">aucun · {a.meta.limits}</div>
        ) : (
          <ul className="p7-list p7-decideurs">
            {a.decideurs.map((d, i) => (
              <li key={`${d.role}-${d.depute_id ?? i}`} className="p7-item">
                <div className="text-2">{ROLE_DECIDEUR[d.role]}</div>
                <div className="p7-ligne">
                  <span className="p7-nom">{d.depute_id ? annuaire.nom(d.depute_id) || d.nom : d.nom}</span>
                  {d.groupe_id ? <Tag annuaire={annuaire} groupeId={d.groupe_id} /> : d.role === "gouvernement" && !/gouvernement/i.test(d.nom) && <span className="text-2">gouvernement</span>}
                </div>
                <div className="p7-ligne">
                  <span className={d.position === "inconnue" ? "text-2" : undefined}>{POSITION_DECIDEUR[d.position]}</span>
                  <span className="p7-droite">
                    <Pourquoi preuve={d.preuve} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="p7-cols">
        {cles.map((k) => (
          <ColonneGroupe
            key={k}
            titre={GROUPE_ACTION[k]}
            lignes={a.groupes[k]}
            raisonVide={a.meta.limits}
            dossier={dossier}
            annuaire={annuaire}
            disponibles={disponibles}
          />
        ))}
      </div>

      <div className="p7-cols p7-cols-2 p7-section">
        <ColonneArguments titre="Arguments entendus pour la mesure" args={a.arguments.pour} annuaire={annuaire} raisonVide={a.meta.limits} />
        <ColonneArguments titre="Arguments entendus contre la mesure" args={a.arguments.contre} annuaire={annuaire} raisonVide={a.meta.limits} />
      </div>

      <section className="p7-section">
        <h4>Contre-arguments à amener</h4>
        {a.contre_arguments.length === 0 ? (
          <div className="p7-vide">aucun · {a.meta.limits}</div>
        ) : (
          <ul className="p7-list">
            {a.contre_arguments.map((c, i) => (
              <li key={i} className="p7-item">
                <div>{c.texte}</div>
                <div className="p7-ligne">
                  <span className="text-2">répond à : {c.repond_a}</span>
                  <span className="p7-droite p7-ligne">
                    <Redaction mode={c.mode} verifie={c.verifie} />
                    <Pourquoi preuve={c.preuve} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Meta meta={a.meta} />
    </>
  );
}

function ColonneGroupe({
  titre,
  lignes,
  raisonVide,
  dossier,
  annuaire,
  disponibles,
}: {
  titre: string;
  lignes: DeputeAction[];
  raisonVide: string;
  dossier: string;
  annuaire: Annuaire;
  disponibles: string[] | null;
}) {
  const navigate = useNavigate();
  return (
    <div className="p7-col">
      <h4>
        {titre}
        <span className="text-2">{lignes.length}</span>
      </h4>
      {lignes.length === 0 ? (
        <div className="p7-vide">aucun · {raisonVide}</div>
      ) : (
        <ul className="p7-list">
          {lignes.map((d) => {
            // fiche: true dans action.json ; l'index des fiches, s'il est chargé, a le dernier mot.
            const fiche = d.fiche && (disponibles === null || disponibles.includes(d.depute_id));
            const ouvrir = () => navigate(`/dossier/${dossier}/depute/${d.depute_id}`);
            return (
              <li
                key={d.depute_id}
                className={`p7-item${fiche ? " p7-item-click" : " p7-item-muted"}`}
                onClick={fiche ? ouvrir : undefined}
                onKeyDown={
                  fiche
                    ? (e) => {
                        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          ouvrir();
                        }
                      }
                    : undefined
                }
                tabIndex={fiche ? 0 : undefined}
                role={fiche ? "link" : undefined}
                data-depute={d.depute_id}
              >
                <div className="p7-ligne">
                  <span className="p7-nom">{annuaire.nom(d.depute_id)}</span>
                  <Tag annuaire={annuaire} groupeId={d.groupe_id} />
                  <span className="p7-score p7-droite">{formatProba(d.score)}</span>
                </div>
                <div>{d.raison}</div>
                <div className="p7-ligne">
                  <span className="text-2">{d.position_connue ? d.fondement.map((f) => FONDEMENT[f]).join(", ") : "position inconnue"}</span>
                  {!fiche && <span className="text-2">fiche en cours</span>}
                  <span className="p7-droite" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <Pourquoi preuve={d.preuve} />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ColonneArguments({ titre, args, annuaire, raisonVide }: { titre: string; args: Argument[]; annuaire: Annuaire; raisonVide: string }) {
  return (
    <div className="p7-col">
      <h4>
        {titre}
        <span className="text-2">{args.length}</span>
      </h4>
      {args.length === 0 ? (
        <div className="p7-vide">aucun · {raisonVide}</div>
      ) : (
        <ul className="p7-list">
          {args.map((g, i) => (
            <li key={`${g.url}-${i}`} className="p7-item">
              <div className="p7-nom">{g.argument}</div>
              <p className="p7-citation">« {g.citation} »</p>
              <div className="p7-ligne">
                {g.orateur_id ? (
                  <>
                    <span>{annuaire.nom(g.orateur_id)}</span>
                    <Tag annuaire={annuaire} groupeId={g.groupe_id ?? annuaire.depute(g.orateur_id)?.groupe_id} />
                  </>
                ) : (
                  <span>ministre</span>
                )}
                <a href={g.url} target="_blank" rel="noreferrer" className="text-2">
                  {quandOu(g.date, g.lieu)}
                </a>
                <span className="p7-droite">
                  <Pourquoi preuve={g.preuve} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
