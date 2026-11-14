# Session P7 : vues Fiche d'approche et Note (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 5.7 à 5.12, 6 (ligne P7), 8, le rapport design, `contracts/README.md`, `web/README.md`.

## Tu possèdes
`web/src/views/fiche/` et `web/src/views/note/` uniquement. Primitives de P4 ; manque = `status/P7.md` + composant local provisoire.

## Fiche (route `/fiche/:dossier/:id`)
- En-tête : prénom nom, `GroupeTag`, département et circonscription, score d'imprévisibilité, bouton « Retour au texte ».
- Bandeau synthèse en tête : position probable, argument à présenter, badge « vérifié » si `verifie` et `mode: llm`, badge « gabarit » si `mode: gabarit`, modèle et date en texte secondaire. `synthese: null` : « synthèse en cours ».
- Dessous, trois colonnes égales : Auditions (date, rôle en mots, organisations en tags avec type, lien rapport), Débats (date, lieu en mots, citation entre guillemets, lien), Amendements (numéro lien, rôle, résumé, sort en mots, « travaillé avec » en tags). Chaque bloc vide affiche sa couverture en une ligne (« 0 audition, 4 rapports lus, 2 avec liste »).
- Bloc HATVP : organisations ayant déclaré une action sur ce texte (nom, type, objet, lien fiche).
- Pied : couverture complète sur une ligne, puis `Meta`.
- Fiche absente (404 ou identifiant hors `index.json`) : message « fiche non disponible pour ce député », lien retour. Jamais d'écran blanc.

## Note (route `/note/:dossier`)
- Colonne centrale 60 % : le texte, chaque nombre présent dans `chiffres_utilises` souligné (marquage par regex sur les nombres, voir la règle 5.13 pour la normalisation).
- Droite : sources numérotées cliquables, puis limites.
- Haut à droite : bouton « Copier » (texte puis sources en liste), badge vérifié ou gabarit, modèle, date.
- Pied : `Meta`.

## Fini quand
Chaque citation et chaque source a un lien qui s'ouvre, les états vides et la fiche absente sont rendus, sur fixtures puis live. Heure cible : 15 h.
