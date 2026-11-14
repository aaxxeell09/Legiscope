# Session P6 : bloc Nouveautés et page Base (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `rendu-final.md` (bloc 2 et « En fond »), `PLAN.md` sections 5.5, 5.16, 5.20, 6 (ligne P6), le rapport design, `web/README.md`.

## Tu possèdes
`web/src/views/blocs/nouveautes/` et `web/src/views/base/`. Primitives de P4.

## Bloc Nouveautés (gauche, 50 %)
- Liste triée par importance décroissante puis date décroissante : importance 3 en gras avec `Badge`, effet sur le verdict en mot (« renforce », « affaiblit », « sans effet ») avec couleur, date, titre, détail en une ligne, lien, `Pourquoi`. Type en mot (dépôt d'amendement, sort, scrutin, rapport, audition, séance, commission, HATVP, agenda).
- Filtre par type (puces) et un bouton « tout » ; compteur « 12 événements, 3 qui comptent ».
- Vide : « rien de nouveau sur ce dossier ». Si `date_reference` : un rappel « vu au 19 nov. 2025 » en tête.
- Pied : `Meta`.

## Page Base (route `/dossier/:id/base`)
- En-tête du dossier (réutilise `useDossier`), retour vers le tableau de bord.
- « État de la mesure » en premier : libellé, article, « toujours dans le texte » ou « retirée du texte », rédaction actuelle, modifications datées (qui, quoi, lien, `Pourquoi`).
- « État du texte » : étape actuelle, étapes en liste (statut en mot, date, lien), articles du sujet (numéro, titre, statut voté / reste / supprimé, détail, lien).
- « Amendements du dossier » : `Table` : numéro (lien), auteur et `GroupeTag`, résumé, sort en mots, `Proba` Orcet avec le libellé « votes pour prédits » (jamais « chances d'adoption ») ou « pas de prédiction », avis rapporteur et gouvernement s'ils existent. Tri par sort puis numéro. Recherche texte simple.
- Pied : `Meta` de `etat.json` et `texte.json`.

## Données
`useData("nouveautes", dossier)`, `useData("etat", dossier)`, `useData("texte", dossier)`.

## Fini quand
Conforme sur fixtures puis live, zéro erreur console. Heure cible : 15 h 15.
