# Session A2 : débats par député et arguments entendus (MacBook Air Ilan)

Lis d'abord `prompts/_commun.md`, puis `rendu-final.md` (bloc Action : arguments entendus), `PLAN.md` sections 5.8, 5.18, 6 (ligne A2), 9, annexe A (open data AN).

## Tu possèdes
`pipeline/debats/`, `data/<dossier>/debats/`, `data/<dossier>/arguments.json`.

## Tu lis
`data/config.json`, `data/<dossier>/groupes-action.json` (14 h 45 ; avant, `pivots.json` provisoire 13 h 50 ; avant, fixtures), `pipeline/lib/llm.ts` (P8, 13 h 35).

## Méthode
1. Séance : `https://data.assemblee-nationale.fr/static/openData/repository/17/vp/syceronbrut/syseron.xml.zip` (62 Mo) dans `data/raw/opendata/` (non commité). Parse en flux, garde les séances contenant un mot-clé du sujet, puis les paragraphes avec un mot-clé (ou leur voisin immédiat). Commission : pas d'export en masse ; comptes rendus de la commission des finances liés au texte, lus en HTML sur assemblee-nationale.fr. Rien de postérieur à `date_reference`.
2. **Par député** (`debats/<PA>.json`, 5.8) : pour chaque député de `groupes-action.json` (les trois groupes), ses interventions avec `acteurRef`, citation exacte de 1 à 3 phrases, URL, date, lieu, `comptes_rendus_lus`.
3. **Arguments entendus** (`arguments.json`, 5.18) : toutes les interventions sur le sujet, de tout orateur (député avec `acteurRef`, ministre ou rapporteur avec `orateur_id: null` et son nom dans `preuve.raisonnement`), classées **pour ou contre la mesure** (pas l'objectif du client) par `appelStructure` avec un schéma strict (argument en une ligne, camp, citation exacte recopiée, confiance). Ne garde que confiance ≥ 0,7 et citation retrouvée mot pour mot dans le texte source. Dédoublonne les arguments identiques (garde la citation la plus claire). `preuve` = URL du compte rendu et « classé pour/contre parce que ... ».
4. Dossier rejoué petits colis : séances des 19 et 20 novembre 2025 avant tout ; les arguments attendus (ménages modestes, contournement par de plus gros colis ; protection du commerce, 500 M€ de recettes) doivent sortir avec leurs citations réelles.

Script rejouable : `bun run debats`. Relance à 14 h 45.

## Fini quand
Un fichier par député, `arguments.json` par dossier avec pour et contre non vides sur petits colis, chaque citation a une URL et une date, `bun run check` passe. Heure cible : 15 h 45.
