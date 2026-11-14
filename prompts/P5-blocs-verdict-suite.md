# Session P5 : blocs Verdict et Suite (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `rendu-final.md` (blocs 1 et 3, section 6), `PLAN.md` sections 5.4, 5.15, 5.17, 6 (ligne P5), 8, le rapport design, `web/README.md`.

## Tu possèdes
`web/src/views/blocs/verdict/` et `web/src/views/blocs/suite/`. Primitives de P4 ; manque = `status/P5.md` + composant local provisoire.

## Bloc Verdict (pleine largeur, en tête de page)
- Bandeau : le mot du verdict en gros (« Bonne voie », « Incertain », « Mal engagé »), couleur par valeur, score en % à côté (« 18 % de chances d'atteindre l'objectif »), tendance en mot avec signe (« moins bien qu'il y a 7 jours »), `Pourquoi` sur le score.
- Lecture : une phrase, `Badge` vérifié ou gabarit, modèle et date en texte secondaire.
- Deux colonnes : « Ce qui marche » (`favorable`) et « Ce qui coince » (`bloquant`) : titre, détail, `Pourquoi` sur chaque ligne. Colonne vide : « rien de favorable identifié ».
- Panneau repliable « Tendance » : courbe de cohésion Recharts (1 à 3 paires de `config.cohesion.paires_demo`, traits verticaux aux censures, curseur avec préréglages, axe y 0 à 100 %, mois à `null` vides) ; replié par défaut, ouvert d'un clic.
- Pied : `Meta`.

## Bloc Suite (droite, 50 %)
- « Prochaines échéances » : liste datée (date, titre, lieu en mots, lien, `Pourquoi`). Vide : « aucune échéance connue » et la limite du `meta`.
- « Ce qui a le plus de chances d'arriver » : titre, `Proba` (ou « sans prédiction »), détail, `Pourquoi`.
- Pied : `Meta`.

## Données
`useData("verdict", dossier)`, `useData("suite", dossier)`, `useData("cohesion")`. Sur fixtures d'abord, bascule live à 15 h 15 sans changer une ligne. Le dossier rejoué (petits colis) doit afficher « Mal engagé » avec l'amendement de suppression du RN en favorable.

## Fini quand
Conforme sur fixtures puis live, zéro erreur console, `Pourquoi` ouvre sur chaque ligne. Heure cible : 15 h 15.
