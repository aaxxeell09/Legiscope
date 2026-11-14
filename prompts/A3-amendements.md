# Session A3 : amendements par député (MacBook Air Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 5.9, 6 (ligne A3), annexe A.

## Tu possèdes
`pipeline/amendements/`, `data/<dossier>/amendements/`.

## Tu lis
`data/config.json`, `data/<dossier>/pivots.json` (provisoire 13 h 30, définitif 14 h 30), `data/raw/<dossier>/amendements.json` (P1, les amendements du sujet avec `expose`, `auteur`, `signataires`, `sort`). Tu n'appelles pas l'API Hémicycle. Si P1 n'a pas encore écrit le fichier, utilise l'open data Amendements de l'Assemblée (vérifie la taille avant téléchargement) ou la page `https://www.assemblee-nationale.fr/dyn/17/amendements/3210A`.

## Méthode
1. Pour chaque pivot : les amendements du sujet où il est `auteur` ou dans `signataires` (`role` ∈ `auteur | cosignataire`), résumé en une ligne (le `dispositif` résumé par toi, pas par un modèle, ou les 160 premiers caractères de l'objet), `sort` unifié (enum de la section 5), URL.
2. `travaille_avec` : dans l'exposé des motifs, repère les formules « cet amendement a été travaillé avec », « proposé par », « en lien avec », « issu des travaux de » suivies d'une organisation ; extrais le nom tel quel. Rien = tableau vide. Pas d'inférence.
3. Écris `data/<dossier>/amendements/<PA>.json` pour chaque pivot, même vide.

Script rejouable : `bun run amendements`. Relance à 14 h 30.

## Fini quand
Un fichier par pivot, `bun run check` passe, chaque amendement a une URL. Heure cible : 15 h.
