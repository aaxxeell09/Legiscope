# Session A1 : auditions (MacBook Air Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 5.7, 6 (ligne A1), 9, annexe A (open data AN).

## Tu possèdes
`pipeline/auditions/`, `data/<dossier>/auditions/`.

## Tu lis
`data/config.json`, `data/<dossier>/groupes-action.json` (définitif 14 h 45 ; avant, `pivots.json` provisoire à 13 h 50 ; avant, `contracts/fixtures/`) : tu traites tous les députés des trois groupes (actionnables, alliés, perdus), `pipeline/lib/llm.ts` (P8, dès 13 h 15 ; avant, écris ton extraction avec un appel direct minimal au même modèle et remplace ensuite).

## Méthode
1. Télécharge `https://data.assemblee-nationale.fr/static/openData/repository/17/loi/dossiers_legislatifs/Dossiers_Legislatifs.json.zip` (11 Mo) dans `data/raw/opendata/` (non commité, dans `.gitignore`). Pour chaque dossier de `config.json`, trouve les rapports (commission des finances et autres) rattachés au texte, leurs rapporteurs (`acteurRef`) et leurs URL. Vérifie à 13 h si l'archive contient le texte des rapports ou seulement les métadonnées, écris-le dans `status/A1.md`.
2. Pour chaque rapport : lis la page HTML sur assemblee-nationale.fr, isole l'annexe « personnes entendues » (ou « liste des personnes auditionnées », « contributions écrites »), extrais les organisations avec `appelStructure` (schéma : nom, type parmi l'enum, personne, fonction) et conserve l'URL. Pas de liste : `rapports_avec_liste` n'augmente pas.
3. Rattachement : un pivot a une audition s'il est rapporteur ou rapporteur pour avis du rapport, OU s'il est membre de la commission qui a produit le rapport (`deputes.json`, champ `commissions`) : dans ce second cas `role: "membre"`.
4. Écris `data/<dossier>/auditions/<PA>.json` pour chaque pivot (même vide, avec couverture). **13 h 50** : nombre de pivots ayant au moins un rapport, écrit dans `status/A1.md`.

Script rejouable : `bun run auditions` régénère tout depuis la liste de pivots courante. Relance-le à 14 h 45 sur la liste définitive. Rien de postérieur à `date_reference` quand elle est posée.

## Fini quand
Un fichier par pivot et par dossier, `bun run check` passe, couverture chiffrée, chaque organisation a un type de l'enum, chaque audition a une URL. Heure cible : 15 h 30.
