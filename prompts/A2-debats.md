# Session A2 : débats (MacBook Air Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 5.8, 6 (ligne A2), 9, annexe A (open data AN).

## Tu possèdes
`pipeline/debats/`, `data/<dossier>/debats/`.

## Tu lis
`data/config.json`, `data/<dossier>/pivots.json` (provisoire 13 h 30, définitif 14 h 30 ; avant, fixtures).

## Méthode
1. Séance publique : télécharge `https://data.assemblee-nationale.fr/static/openData/repository/17/vp/syceronbrut/syseron.xml.zip` (62 Mo) dans `data/raw/opendata/` (non commité). Parse en flux (`fast-xml-parser` ou lecture par séance), ne garde que les séances dont le texte contient au moins un mot-clé du sujet, puis les paragraphes dont l'orateur porte un `acteurRef` égal à un pivot et dont le paragraphe ou son voisin immédiat contient un mot-clé.
2. Commission : pas d'export en masse. Pour la commission des finances, liste les comptes rendus liés au texte sur assemblee-nationale.fr (page du dossier législatif) et lis-les en HTML ; mêmes règles d'attribution (orateur identifié, mot-clé).
3. Citation : la phrase exacte, 1 à 3 phrases, sans reformulation, avec l'URL du compte rendu (ancre si possible). `lieu` ∈ `seance | commission`. `comptes_rendus_lus` = nombre de comptes rendus réellement parcourus.
4. Écris `data/<dossier>/debats/<PA>.json` pour chaque pivot, même vide.

Script rejouable : `bun run debats`. Relance à 14 h 30.

## Fini quand
Un fichier par pivot, chaque citation a une URL et une date, `bun run check` passe. Heure cible : 15 h 30.
