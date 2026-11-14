# Session P3 : texte et pivots (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 5.1, 5.5, 5.6, 6 (ligne P3), 9.

## Tu possèdes
`pipeline/pivots/`, `data/<dossier>/texte.json`, `data/<dossier>/pivots.json`.

## Tu lis
`data/raw/` (P1), `data/config.json`, `data/groupes.json`, `data/deputes.json`.

## Livrables
1. **13 h 30, pivots provisoires** pour chaque dossier de `config.json` : `data/<dossier>/pivots.json` avec `base: "general"` (score = 1 moins la loyauté sur 12 mois, depuis `data/raw/loyaute/`), 5 à 15 députés des groupes dont la position sur le sujet est `divise` ou inconnue, avec au moins un écart récent chacun (un écart = un scrutin où le député a voté autrement que la majorité de son groupe ; `groupe_id_au_vote` = le groupe au moment du vote). A1, A2, A3 tournent sur cette liste dès qu'elle existe : commit immédiat. Écris dans `status/P3.md` le **nombre de scrutins nominatifs liés au sujet** pour chaque dossier.
2. **14 h 30, définitif** : `data/<dossier>/texte.json` (section 5.5) : texte, positions de chaque groupe (`position` depuis les scrutins liés au sujet s'il y en a, sinon depuis les amendements déposés par le groupe : `n_scrutins_sujet: 0` et `base` l'explique), amendements du sujet avec `sort` unifié et `prediction` depuis `data/raw/<dossier>/orcet/` (`proba_pour` = `moyenne_probabilites_pour`, `confiance`, `modele`, `date`), `null` sinon. Puis `pivots.json` définitif : `base: "sujet"` si des scrutins nominatifs liés existent (score pondéré sur ces scrutins), sinon on garde `general`.
3. Pour le dossier `petits-colis` (clos) : les mêmes fichiers, le vote du 20 novembre 2025 (208 contre 87) est le scrutin principal, les amendements ont leur sort final.

## Règles
Non-inscrits exclus. `position_groupe: null` quand le groupe n'a pas de majorité. Les identifiants d'amendement sont ceux que l'API renvoie, tels quels.

## Fini quand
Les quatre fichiers passent `bun run check`, chaque pivot a au moins un écart, `status/P3.md` donne le nombre de scrutins liés par dossier. Heure cible : 14 h 30.
