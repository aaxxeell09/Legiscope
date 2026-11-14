# Session P7 : bloc Action, page Député, bloc Compte rendu (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `rendu-final.md` (blocs 4 et 5, section 6), `PLAN.md` sections 5.7 à 5.13, 5.19, 5.21, 6 (ligne P7), 8, le rapport design, `web/README.md`.

## Tu possèdes
`web/src/views/blocs/action/`, `web/src/views/blocs/compte-rendu/`, `web/src/views/depute/`. Primitives de P4.

## Bloc Action (pleine largeur)
- « Ceux qui décident » en tête : rôle en mots, nom, `GroupeTag` ou « gouvernement », position connue en mot ou « position inconnue », `Pourquoi`.
- Trois colonnes : « Sur qui agir encore », « Alliés à protéger », « Perdus » : nom, `GroupeTag`, score en %, raison en une ligne, fondement en mots (« a voté », « a déposé », « a dit »), « position inconnue » si `position_connue` est faux, `Pourquoi` ; ligne cliquable vers `/dossier/:id/depute/:pa` si `fiche: true`, grisée avec « fiche en cours » sinon. Colonne vide : « aucun » et la raison du `meta`.
- Dessous, deux colonnes « Arguments entendus pour la mesure » et « contre la mesure » : argument en une ligne, citation entre guillemets, orateur (nom et `GroupeTag`, ou « ministre » si `orateur_id` null), date et lieu en mots, lien, `Pourquoi`.
- Puis « Contre-arguments à amener » : texte, « répond à : ... », `Badge` vérifié ou gabarit, `Pourquoi`.
- Pied : `Meta`.

## Page Député (route `/dossier/:id/depute/:pa`)
- En-tête : prénom nom, `GroupeTag`, département et circonscription, score, dans quel groupe d'action il est et pourquoi, retour.
- Bandeau synthèse : position probable, argument à présenter, `Badge` vérifié ou gabarit, modèle, date ; `synthese: null` = « synthèse en cours ».
- Trois colonnes : Auditions (date, rôle, organisations en tags avec type, lien), Débats (date, lieu, citation, lien), Amendements (numéro lien, rôle, résumé, sort, « travaillé avec » en tags). Bloc vide = sa couverture en une ligne.
- Bloc HATVP : organisations déclarées sur ce texte.
- Pied : couverture complète, `Meta`. Fiche absente : message et retour, jamais d'écran blanc.

## Bloc Compte rendu (pleine largeur)
- Rappel client et objectif en une ligne ; texte avec chaque nombre de `chiffres_utilises` souligné (regex avec la normalisation de la règle 5.13) ; sources numérotées cliquables ; limites ; bouton « Copier » (texte puis sources) ; `Badge` vérifié ou gabarit, modèle, date.
- Pied : `Meta`.

## Données
`useData("action", dossier)`, `useData("fiche", dossier, pa)`, `useData("fiches-index", dossier)`, `useData("note", dossier)`, `deputes`, `groupes`.

## Fini quand
Chaque lien s'ouvre, états vides rendus, fiche absente = message, sur fixtures puis live. Heure cible : 15 h 15.
