import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Action, Argument, DeputeAction, FichesIndex } from "@contracts/index";
import { Etat, Meta, Pourquoi } from "../../../components";
import { useData } from "../../../lib/data";
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
import "./action.css";

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

/** Complément 5 : liste `position_inconnue` (champ optionnel, ajouté aux contrats par P0). */
type PositionInconnue = {
  depute_id: string;
  groupe_id: string | null;
  position_groupe?: string | null;
  preuve?: DeputeAction["preuve"];
};

const POSITION_GROUPE: Record<string, string> = {
  pour: "pour la mesure",
  contre: "contre la mesure",
  abstention: "abstention",
  divise: "divisé",
};

/** Les trois listes ne gardent que des députés avec un acte personnel ; le reste rejoint « Position inconnue ». */
function repartir(a: Action) {
  const brut = a as Action & { position_inconnue?: PositionInconnue[]; groupes: { position_inconnue?: PositionInconnue[] } };
  const inconnus: PositionInconnue[] = [...(brut.groupes.position_inconnue ?? brut.position_inconnue ?? [])];
  const garder = (l: DeputeAction[]) =>
    l.filter((d) => {
      if (d.fondement.length > 0) return true;
      if (!inconnus.some((x) => x.depute_id === d.depute_id)) inconnus.push({ depute_id: d.depute_id, groupe_id: d.groupe_id, position_groupe: null, preuve: d.preuve });
      return false;
    });
  return {
    groupes: { actionnables: garder(a.groupes.actionnables), allies: garder(a.groupes.allies), perdus: garder(a.groupes.perdus) },
    inconnus,
  };
}

function ActionContenu({ a, dossier, annuaire, disponibles }: { a: Action; dossier: string; annuaire: Annuaire; disponibles: string[] | null }) {
  const { groupes, inconnus } = repartir(a);
  const [tousDecideurs, setTousDecideurs] = useState(false);
  const [toutesReponses, setToutesReponses] = useState(false);
  const decideursVisibles = tousDecideurs ? a.decideurs : a.decideurs.slice(0, 4);
  const reponsesVisibles = toutesReponses ? a.contre_arguments : a.contre_arguments.slice(0, 4);
  return (
    <>
      <section className="action-section action-decideurs">
        <div className="action-section-head"><div><span className="action-kicker">Acteurs institutionnels</span><h4>Ceux qui décident</h4></div><span className="action-count">{a.decideurs.length}</span></div>
        {a.decideurs.length === 0 ? (
          <div className="p7-vide">aucun · {a.meta.limits}</div>
        ) : (
          <ul className="action-decideurs-list">
            {decideursVisibles.map((d, i) => (
              <li key={`${d.role}-${d.depute_id ?? i}`} className="action-decideur">
                <div className="action-role">{ROLE_DECIDEUR[d.role]}</div>
                <div className="p7-ligne action-personne">
                  <span className="p7-nom">{d.depute_id ? annuaire.nom(d.depute_id) || d.nom : d.nom}</span>
                  {d.groupe_id ? <Tag annuaire={annuaire} groupeId={d.groupe_id} /> : d.role === "gouvernement" && !/gouvernement/i.test(d.nom) && <span className="text-2">gouvernement</span>}
                </div>
                <div className="action-position">
                  <span className={`action-position-label action-position-${d.position}`}>{POSITION_DECIDEUR[d.position]}</span>
                  <Pourquoi preuve={d.preuve} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {a.decideurs.length > 4 && <button type="button" className="action-disclosure" onClick={() => setTousDecideurs((v) => !v)}>{tousDecideurs ? "Réduire" : `Voir tous les acteurs (${a.decideurs.length})`}</button>}
      </section>

      <CategoriesDeputes groupes={groupes} inconnus={inconnus} raisonVide={a.meta.limits} dossier={dossier} annuaire={annuaire} disponibles={disponibles} />

      <section className="action-section action-arguments">
        <div className="action-section-head"><div><span className="action-kicker">Débat public</span><h4>Arguments documentés</h4></div></div>
        <div className="p7-cols p7-cols-2 action-arguments-grid"><ColonneArguments titre="Arguments favorables à la mesure" args={a.arguments.pour} annuaire={annuaire} raisonVide={a.meta.limits} /><ColonneArguments titre="Arguments défavorables à la mesure" args={a.arguments.contre} annuaire={annuaire} raisonVide={a.meta.limits} /></div>
      </section>

      <section className="action-section action-reponses">
        <div className="action-section-head"><div><span className="action-kicker">Analyse générée</span><h4>Réponses analytiques proposées</h4></div><span className="action-count">{a.contre_arguments.length}</span></div>
        {a.contre_arguments.length === 0 ? (
          <div className="p7-vide">aucun · {a.meta.limits}</div>
        ) : (
          <ul className="action-reponses-list">
            {reponsesVisibles.map((c, i) => (
              <li key={i} className="action-reponse">
                <div className="action-reponse-cible"><span>Répond à</span>{c.repond_a}</div>
                <div className="action-reponse-texte">{c.texte}</div>
                <div className="action-reponse-meta">
                    <Redaction mode={c.mode} verifie={c.verifie} />
                    <Pourquoi preuve={c.preuve} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {a.contre_arguments.length > 4 && <button type="button" className="action-disclosure" onClick={() => setToutesReponses((v) => !v)}>{toutesReponses ? "Réduire" : `Voir toutes les réponses (${a.contre_arguments.length})`}</button>}
      </section>

      <Meta meta={a.meta} />
    </>
  );
}

type GroupesRepartis = ReturnType<typeof repartir>["groupes"];
type Categorie = CleGroupeAction | "inconnus";

function CategoriesDeputes({ groupes, inconnus, raisonVide, dossier, annuaire, disponibles }: { groupes: GroupesRepartis; inconnus: PositionInconnue[]; raisonVide: string; dossier: string; annuaire: Annuaire; disponibles: string[] | null }) {
  const [active, setActive] = useState<Categorie>("actionnables");
  const items: { key: Categorie; label: string; count: number }[] = [
    { key: "actionnables", label: "Positions à approfondir", count: groupes.actionnables.length },
    { key: "allies", label: "Positions convergentes", count: groupes.allies.length },
    { key: "perdus", label: "Positions opposées", count: groupes.perdus.length },
    { key: "inconnus", label: "Positions non établies", count: inconnus.length },
  ];
  return (
    <section className="action-section action-deputes">
      <div className="action-section-head"><div><span className="action-kicker">Parlementaires suivis</span><h4>Positions documentées</h4></div></div>
      <div className="action-tabs" role="tablist" aria-label="Catégories de parlementaires">
        {items.map((item) => <button key={item.key} type="button" role="tab" aria-selected={active === item.key} className="action-tab" onClick={() => setActive(item.key)}><span>{item.label}</span><strong>{item.count}</strong></button>)}
      </div>
      <div role="tabpanel" className="action-tabpanel">
        {active === "inconnus" ? <ColonneInconnus lignes={inconnus} raisonVide={raisonVide} annuaire={annuaire} /> : <ColonneGroupe titre={items.find((i) => i.key === active)?.label ?? GROUPE_ACTION[active]} lignes={groupes[active]} raisonVide={raisonVide} dossier={dossier} annuaire={annuaire} disponibles={disponibles} />}
      </div>
    </section>
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
  const [developpe, setDeveloppe] = useState(false);
  const visibles = developpe ? lignes : lignes.slice(0, 5);
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
          {visibles.map((d) => {
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
      {lignes.length > 5 && <button type="button" className="p7-voir-plus" onClick={() => setDeveloppe((v) => !v)}>{developpe ? "Réduire" : `Voir les ${lignes.length} positions`}</button>}
    </div>
  );
}

function ColonneInconnus({ lignes, raisonVide, annuaire }: { lignes: PositionInconnue[]; raisonVide: string; annuaire: Annuaire }) {
  const [developpe, setDeveloppe] = useState(false);
  const visibles = developpe ? lignes : lignes.slice(0, 5);
  return (
    <div className="p7-col">
      <h4>
        Position inconnue
        <span className="text-2">{lignes.length}</span>
      </h4>
      {lignes.length === 0 ? (
        <div className="p7-vide">aucun · {raisonVide}</div>
      ) : (
        <ul className="p7-list">
          {visibles.map((d) => (
            <li key={d.depute_id} className="p7-item p7-item-muted" data-depute={d.depute_id}>
              <div className="p7-ligne">
                <span className="p7-nom">{annuaire.nom(d.depute_id)}</span>
                <Tag annuaire={annuaire} groupeId={d.groupe_id ?? annuaire.depute(d.depute_id)?.groupe_id} />
              </div>
              <div className="p7-ligne">
                <span className="text-2">position de son groupe : {d.position_groupe ? (POSITION_GROUPE[d.position_groupe] ?? d.position_groupe) : "inconnue"}</span>
                {d.preuve && (
                  <span className="p7-droite">
                    <Pourquoi preuve={d.preuve} />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {lignes.length > 5 && <button type="button" className="p7-voir-plus" onClick={() => setDeveloppe((v) => !v)}>{developpe ? "Réduire" : `Voir les ${lignes.length} positions`}</button>}
    </div>
  );
}

function ColonneArguments({ titre, args, annuaire, raisonVide }: { titre: string; args: Argument[]; annuaire: Annuaire; raisonVide: string }) {
  const [developpe, setDeveloppe] = useState(false);
  const visibles = developpe ? args : args.slice(0, 4);
  return (
    <div className="p7-col action-argument-col">
      <h4>
        {titre}
        <span className="text-2">{args.length}</span>
      </h4>
      {args.length === 0 ? (
        <div className="p7-vide">aucun · {raisonVide}</div>
      ) : (
        <ul className="p7-list">
          {visibles.map((g, i) => (
            <li key={`${g.url}-${i}`} className="p7-item">
              <div className="p7-nom">{g.argument}</div>
              <details className="action-citation"><summary>Lire la citation originale</summary><p className="p7-citation">« {g.citation} »</p></details>
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
      {args.length > 4 && <button type="button" className="p7-voir-plus" onClick={() => setDeveloppe((v) => !v)}>{developpe ? "Réduire" : `Voir les ${args.length} arguments`}</button>}
    </div>
  );
}
