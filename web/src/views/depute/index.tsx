import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Action, DeputeAction, Fiche, FichesIndex } from "@contracts/index";
import { Chargement, Erreur, Meta, Pourquoi } from "../../components";
import { useData } from "../../lib/data";
import { formatDate } from "../../lib/format";
import { useDossier } from "../../lib/config";
import { FONDEMENT, GROUPE_ACTION, LIEU, ROLE_AUDITION, Redaction, SORT, TYPE_ORG, Tag, useAnnuaire, type CleGroupeAction } from "./commun";
import "./p7.css";

/** Fiche d'un député sur un dossier, ouverte depuis le bloc Action. */
export default function DeputeView() {
  const { id = "", pa = "" } = useParams<{ id: string; pa: string }>();
  const dossier = useDossier(id);
  // Aucune requête tant que le dossier n'est pas reconnu dans config.json.
  const connu = dossier.status === "ok" ? id : undefined;
  const idx = useData<FichesIndex>("fiches_index", connu);
  const action = useData<Action>("action", connu);
  const annuaire = useAnnuaire();
  const retour = (
    <Link to={`/dossier/${id}`} className="p7-droite">
      Retour au tableau de bord
    </Link>
  );

  if (dossier.status === "inconnu") {
    return (
      <div className="view" data-view="depute">
        <h1>Dossier inconnu</h1>
        <p className="text-2">« {id} » n'est pas dans config.json.</p>
        <Link to="/">Revenir au dossier de démonstration</Link>
      </div>
    );
  }

  // Fiche listée seulement si l'index la déclare disponible : jamais de requête vers un fichier absent.
  const disponible = idx.status === "ok" ? (idx.data?.disponibles.includes(pa) ?? false) : null;

  const dep = annuaire.depute(pa);
  const nom = annuaire.nom(pa);
  const classement = trouverClassement(action.data, pa);

  return (
    <div className="view" data-view="depute">
      <header className="p7-depute-head">
        <div className="p7-depute-title"><span>Analyse dans le contexte du dossier · {dossier.label}</span><h1>{nom || pa}</h1></div>
        <div className="p7-depute-meta">{dep?.groupe_id ? <Tag annuaire={annuaire} groupeId={dep.groupe_id} /> : dep && <span className="text-2">non-inscrit</span>}
        {dep && (
          <span className="text-2">
            département {dep.departement}, {dep.circonscription}
            {dep.circonscription === 1 ? "re" : "e"} circonscription
          </span>
        )}</div>{retour}
      </header>
      {classement && (
        <div className="p7-classement">
          <div><span className="p7-classement-label">Position documentée</span><strong>{GROUPE_ACTION[classement.cle]}</strong></div>
          <span className="text-2">{classement.d.raison}</span>
          <span className="text-2">{classement.d.position_connue ? classement.d.fondement.map((f) => FONDEMENT[f]).join(", ") : "Inconnue"}</span>
          <Pourquoi preuve={classement.d.preuve} />
        </div>
      )}

      {(idx.status === "loading" || !connu) && <Chargement quoi="index des fiches" />}
      {idx.status === "error" && connu && <Erreur message={idx.error ?? "index des fiches illisible"} />}
      {disponible === false && <FicheAbsente id={id} enCours={idx.data?.absents.includes(pa) ?? false} meta={idx.data?.meta} />}
      {disponible === true && <FicheContenu dossier={id} pa={pa} />}
    </div>
  );
}

function trouverClassement(a: Action | undefined, pa: string): { cle: CleGroupeAction; d: DeputeAction } | null {
  if (!a) return null;
  for (const cle of ["actionnables", "allies", "perdus"] as const) {
    const d = a.groupes[cle].find((x) => x.depute_id === pa);
    if (d) return { cle, d };
  }
  return null;
}

function FicheAbsente({ id, enCours, meta }: { id: string; enCours: boolean; meta: FichesIndex["meta"] | undefined }) {
  return (
    <section className="p7-section">
      <h2>{enCours ? "Fiche en cours" : "Pas de fiche pour ce député sur ce dossier"}</h2>
      <p>
        <Link to={`/dossier/${id}`}>Retour au tableau de bord</Link>
      </p>
      <Meta meta={meta} />
    </section>
  );
}

function FicheContenu({ dossier, pa }: { dossier: string; pa: string }) {
  const r = useData<Fiche>("fiche", dossier, pa);
  const [auditionsOuvertes, setAuditionsOuvertes] = useState(false);
  const [debatsOuverts, setDebatsOuverts] = useState(false);
  const [amendementsOuverts, setAmendementsOuverts] = useState(false);
  const [organisationsOuvertes, setOrganisationsOuvertes] = useState(false);
  if (r.status === "loading") return <Chargement quoi="fiche" />;
  if (r.status === "error") return <Erreur message={r.error ?? "fiche illisible"} />;
  const f = r.data!;
  const s = f.synthese;
  // Rapporteur : il a lui-même entendu ces organisations. Membre : ce sont les rapporteurs de sa commission, à part et moins fort.
  const estRapporteur = (r: string) => r === "rapporteur" || r === "rapporteur_general" || r === "rapporteur_avis";
  const rapporteur = f.auditions.filter((a) => estRapporteur(a.role));
  const membre = f.auditions.filter((a) => !estRapporteur(a.role));

  return (
    <>
      <nav className="p7-subnav" aria-label="Sections de la fiche"><a href="#synthese">Synthèse</a><a href="#amendements">Amendements</a><a href="#interventions">Interventions</a><a href="#auditions">Auditions</a><a href="#organisations">Organisations</a></nav>
      <section id="synthese" className="p7-synthese" aria-label="Synthèse">
        {s ? (
          <>
            <dl style={{ margin: 0 }}>
              <dt>Position probable</dt>
              <dd>{s.position_probable}</dd>
              <dt>Argument à présenter</dt>
              <dd>{s.argument}</dd>
            </dl>
            <Redaction mode={s.mode} verifie={s.verifie} modele={s.modele} date={s.date} />
          </>
        ) : (
          <span className="text-2">synthèse en cours</span>
        )}
      </section>

      <div className="p7-cols">
        <div className="p7-col" id="auditions">
          <h4>
            Auditions<span className="text-2">{f.auditions.length}</span>
          </h4>
          {f.auditions.length === 0 ? (
            <div className="p7-vide">Aucune audition documentée.</div>
          ) : (
            <>
              {rapporteur.length > 0 && <ListeAuditions auditions={auditionsOuvertes ? rapporteur : rapporteur.slice(0, 4)} verbe="a entendu" />}
              {membre.length > 0 && (
                <details className="p7-secondaire">
                  <summary>
                    Entendues par les rapporteurs de sa commission <span className="text-2">{membre.reduce((n, a) => n + a.organisations.length, 0)}</span>
                  </summary>
                  <ListeAuditions auditions={membre} />
                </details>
              )}
              {rapporteur.length > 4 && <button type="button" className="p7-voir-plus" onClick={() => setAuditionsOuvertes((v) => !v)}>{auditionsOuvertes ? "Réduire" : `Voir toutes les auditions (${rapporteur.length})`}</button>}
            </>
          )}
        </div>

        <div className="p7-col" id="interventions">
          <h4>
            Débats<span className="text-2">{f.debats.length}</span>
          </h4>
          {f.debats.length === 0 ? (
            <div className="p7-vide">Aucune intervention documentée.</div>
          ) : (
            <ul className="p7-list">
              {(debatsOuverts ? f.debats : f.debats.slice(0, 5)).map((d, i) => (
                <li key={`${d.url}-${i}`} className="p7-item">
                  <div className="p7-ligne">
                    <span>{formatDate(d.date)}</span>
                    <span className="text-2">{LIEU[d.lieu]}</span>
                    <a className="p7-droite" href={d.url} target="_blank" rel="noreferrer">
                      compte rendu
                    </a>
                  </div>
                  <p className="p7-citation">« {d.citation} »</p>
                </li>
              ))}
            </ul>
          )}
          {f.debats.length > 5 && <button type="button" className="p7-voir-plus" onClick={() => setDebatsOuverts((v) => !v)}>{debatsOuverts ? "Réduire" : `Voir toutes les interventions (${f.debats.length})`}</button>}
        </div>

        <div className="p7-col" id="amendements">
          <h4>
            Amendements<span className="text-2">{f.amendements.length}</span>
          </h4>
          {f.amendements.length === 0 ? (
            <div className="p7-vide">aucun amendement déposé ou cosigné sur ce texte</div>
          ) : (
            <ul className="p7-list">
              {(amendementsOuverts ? f.amendements : f.amendements.slice(0, 5)).map((a) => (
                <li key={a.id} className="p7-item">
                  <div className="p7-ligne">
                    <a href={a.url} target="_blank" rel="noreferrer">
                      n° {numeroAmendement(a.id)}
                    </a>
                    <span className="text-2">{a.role}</span>
                    <span className="p7-droite">{SORT[a.sort]}</span>
                  </div>
                  <div>{a.resume}</div>
                  {a.travaille_avec.length > 0 && (
                    <div className="p7-ligne">
                      <span className="text-2">travaillé avec</span>
                      <span className="p7-tags">
                        {a.travaille_avec.map((o) => (
                          <span key={o} className="p7-org">
                            {o}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {f.amendements.length > 5 && <button type="button" className="p7-voir-plus" onClick={() => setAmendementsOuverts((v) => !v)}>{amendementsOuverts ? "Réduire" : `Voir tous les amendements (${f.amendements.length})`}</button>}
        </div>
      </div>

      <section className="p7-section" id="organisations">
        <h4>
          HATVP<span className="text-2" style={{ marginLeft: 8 }}>{f.hatvp.length}</span>
        </h4>
        {f.hatvp.length === 0 ? (
          <div className="p7-vide">aucune organisation déclarée sur ce texte</div>
        ) : (
          <ul className="p7-list">
            {(organisationsOuvertes ? f.hatvp : f.hatvp.slice(0, 6)).map((o) => (
              <li key={o.hatvp_id} className="p7-item">
                <div className="p7-ligne">
                  <a href={o.fiche_url} target="_blank" rel="noreferrer" className="p7-nom">
                    {o.nom}
                  </a>
                  <span className="text-2">{TYPE_ORG[o.type]}</span>
                  <span className="text-2 p7-droite">{o.actions.join(", ")}</span>
                </div>
                <div className="text-2">{o.objet}</div>
              </li>
            ))}
          </ul>
        )}
        {f.hatvp.length > 6 && <button type="button" className="p7-voir-plus" onClick={() => setOrganisationsOuvertes((v) => !v)}>{organisationsOuvertes ? "Réduire" : `Voir toutes les organisations (${f.hatvp.length})`}</button>}
      </section>

      <Meta meta={f.meta} />
    </>
  );
}

function ListeAuditions({ auditions, verbe }: { auditions: Fiche["auditions"]; verbe?: string }) {
  return (
    <ul className="p7-list">
      {auditions.map((a, i) => (
        <li key={`${a.date}-${i}`} className="p7-item">
          <div className="p7-ligne">
            <span>{formatDate(a.date)}</span>
            {verbe && <span className="text-2">{ROLE_AUDITION[a.role]}, {verbe}</span>}
            {a.rapport_url && (
              <a className="p7-droite" href={a.rapport_url} target="_blank" rel="noreferrer">
                rapport
              </a>
            )}
          </div>
          <div className="p7-tags">
            {a.organisations.map((o) => (
              <span key={o.nom} className="p7-org">
                {o.nom}
                <span className="text-2">{TYPE_ORG[o.type]}</span>
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** « AMANR5L17PO838901B1906P1D1N000806 » → « 806 » ; un identifiant court reste tel quel. */
function numeroAmendement(id: string): string {
  const m = id.match(/N0*(\d+)$/);
  return m ? m[1] : id;
}
