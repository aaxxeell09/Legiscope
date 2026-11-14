# Session P6 : vue Texte (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 5.1, 5.5, 5.6, 5.11, 6 (ligne P6), 8, le rapport design, `contracts/README.md`, `web/README.md`.

## Tu possèdes
`web/src/views/texte/` uniquement. Primitives de P4 ; manque = `status/P6.md` + composant local provisoire.

## Mise en page (route `/texte/:dossier`)
- En-tête : titre du texte, étape, sujet, état du dossier (`en_cours` ou `clos`, affiché en mots), lien vers le texte.
- Gauche 30 % : positions, une ligne par groupe : `GroupeTag`, position en mots, barre de confiance, `base` en texte secondaire ; `divise` en orange ; `null` = « pas de position ».
- Centre 40 % : amendements triés par `prediction.proba_pour` décroissante, ceux sans prédiction en bas : numéro (lien), résumé une ligne, auteur et `GroupeTag`, sort en mots, `Proba` avec le libellé « votes pour prédits » (jamais « chances d'adoption ») et la mention « adoption probable » si > 50 %. Dossier clos : la colonne affiche le sort final, pas de prédiction.
- Droite 30 % : pivots : rang, nom, `GroupeTag`, score d'imprévisibilité en %, `base` (« sur le sujet » ou « général, 12 mois »), dernier écart (date, « a voté pour, groupe contre »). Ligne cliquable vers `/fiche/:dossier/:id` si l'identifiant est dans `fiches/index.json`, grisée sinon avec « fiche en cours ».
- Pied : `Meta` de `texte.json` (et de `pivots.json` sur la colonne de droite).

## Données
`useData("texte", dossier)`, `useData("pivots", dossier)`, `useData("fiches-index", dossier)`.

## Fini quand
Clic sur un pivot ouvre sa fiche ; pivot sans fiche grisé ; amendement sans prédiction en bas avec « Orcet : pas de prédiction » ; sur fixtures puis live. Heure cible : 15 h.
