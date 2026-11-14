# Session P3 : état du texte, base, pivots, groupes d'action, verdict (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `rendu-final.md` (blocs Verdict et Action, section 6 illustration), `PLAN.md` sections 5.1, 5.5, 5.6, 5.15, 5.18, 5.20, 6 (ligne P3), 9.

## Tu possèdes
`pipeline/pivots/`, `data/<dossier>/etat.json`, `texte.json`, `pivots.json`, `groupes-action.json`, `verdict.json`.

## Tu lis
`data/raw/` (P1), `config.json`, `groupes.json`, `deputes.json`, `pipeline/lib/llm.ts` (P8, 13 h 35), `pipeline/verdict/prompts/` (X3).

## Livrables
1. **13 h 50, pivots provisoires** par dossier (`pivots.json`, `base: "general"`, score = 1 moins la loyauté 12 mois, 5 à 15 députés des groupes divisés ou opposés peu loyaux, au moins un écart chacun, `groupe_id_au_vote`). Commit immédiat : A1, A2, A3 tournent dessus. Écris dans `status/P3.md` le nombre de scrutins nominatifs liés au sujet par dossier.
2. **14 h 45, définitif** :
   - `etat.json` (5.20) : étape actuelle, étapes avec statut, articles du sujet avec statut (`vote`, `reste`, `supprime`). PLF 2027 : première lecture rejetée le 4 novembre 2026 (V9759), Sénat en cours, CMP et nouvelle lecture à venir. Petits colis vu au 19 novembre 2025 : article 22 `reste`, séance du 20 à venir.
   - `texte.json` (5.5) : positions des groupes (scrutins liés d'abord, amendements sinon, `n_scrutins_sujet`), amendements du sujet avec sort unifié (postérieur à `date_reference` = `en_attente`), `prediction` depuis `data/raw/<dossier>/orcet/` (`proba_pour` = `moyenne_probabilites_pour`), avis rapporteur et gouvernement si P1 les a trouvés (champs `avis_rapporteur`, `avis_gouvernement`, valeurs `favorable | defavorable | sagesse | null`, à ajouter dans `status/` pour que P0 étende le schéma).
   - `pivots.json` définitif (`base: "sujet"` si scrutins liés).
   - `groupes-action.json` (5.18) : `allies` = députés des groupes dont la position dominante va dans le sens de `config.dossiers[].objectif.position_cible` ; `perdus` = groupes opposés avec loyauté ≥ 0,85 ; `actionnables` = pivots des groupes divisés ou opposés peu loyaux ; chaque entrée avec `score`, `raison` en une phrase et `preuve`.
3. **15 h 15, `verdict.json`** (5.15) : `score` = part pondérée des sièges dont la position dominante va dans le sens de `position_cible`, corrigée par la moyenne Orcet des amendements qui portent la position du client ; `verdict` par seuils (≥ 0,55 bonne voie, < 0,4 mal engagé) ; `tendance` = score à la date de référence contre sept jours plus tôt ; `favorable` et `bloquant` = amendements et positions alignés ou opposés, avis rapporteur et gouvernement, chacun avec `preuve` ; `lecture` = une phrase via `redigerVerifie` (prompt X3 `pipeline/verdict/prompts/lecture.md`, gabarit à côté), chiffres vérifiés. **Cas de référence** : petits colis au 19 novembre 2025 doit donner `mal_engage` avec en favorable l'amendement de suppression du RN (n° 806, URL dans `rendu-final.md`) et en bloquant le compromis du gouvernement ; si la mécanique dit autre chose, ajuste les pondérations et écris-le.

## Fini quand
Les cinq fichiers des deux dossiers passent `bun run check`, le cas de référence est juste, `status/P3.md` donne les scrutins liés et les pondérations retenues.
