# Session P2 : cohésion et Suite (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `rendu-final.md` (bloc Suite), `PLAN.md` sections 5.1, 5.4, 5.17, 5.20, 6 (ligne P2), 9.

## Tu possèdes
`pipeline/cohesion/`, `pipeline/suite/`, `data/cohesion.json`, `data/<dossier>/suite.json`.

## Tu lis
`data/raw/scrutins/*.json`, `data/raw/accord-groupes/*.json`, `data/raw/opendata/Agenda.json.zip` (P1), `data/<dossier>/etat.json` et `texte.json` (P3, 14 h 45), `config.json`. Avant, `contracts/fixtures/`.

## Livrables
1. **Cohésion** (comme en v2) : `pipeline/cohesion/run.ts` : pour chaque paire de groupes hors non-inscrits, mois par mois depuis juillet 2024, `accord` = part des scrutins du mois où les deux groupes ont une position majoritaire non nulle et identique (position majoritaire = la plus fréquente parmi les votants du groupe au moment du vote, null si moins de 5 votants), `n_scrutins` = dénominateur, `accord: null` si 0. `events` : censures (4 décembre 2024 Barnier ; vérifie la date de la censure Bayrou dans les scrutins), dissolution, nominations, vote petits colis du 20 novembre 2025 (`dossier_id: "petits-colis"`), rejet du PLF 2027 du 4 novembre 2026 (`dossier_id: "plf2027-holdings"`), chacun avec URL. `signals` : décrochages de plus de 0,15 d'un mois sur l'autre sur les paires de `config.cohesion.paires_demo`, `suivi_de_censure` si censure dans les 60 jours.
2. **13 h 35, dans `status/P2.md`** : « la courbe décroche-t-elle avant les censures ? », nombre de décrochages suivis et non suivis d'une censure, dates des préréglages vérifiées.
3. **Suite** (`pipeline/suite/run.ts`, 15 h 15) : pour chaque dossier, `suite.json` (section 5.17) : `echeances` = réunions de l'agenda open data liées au texte (commission, séance, Sénat si présent) postérieures à `date_reference` (ou à aujourd'hui), plus les étapes `a_venir` de `etat.json` ; `probables` = pour chaque amendement en attente avec prédiction Orcet, « adoption probable » ou « rejet probable » avec `proba_pour`, et une ligne de lecture de la cohésion (« le bloc central et le RN votent ensemble dans X % des scrutins du mois »), chaque élément avec `preuve` (source et raisonnement). Dossier rejoué petits colis : échéance = séance du 20 novembre 2025, probables depuis les positions des groupes (Orcet n'existe pas rétroactivement : `proba: null`, raisonnement explicite). Dossier vivant : échéances Sénat et nouvelle lecture (dates null si inconnues, le dire dans `meta.limits`).

## Fini quand
`cohesion.json` et les deux `suite.json` passent `bun run check`, réponse de 13 h 35 écrite. Heures cibles : 14 h 45 et 15 h 15.
