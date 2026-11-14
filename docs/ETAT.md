# État mesuré du dépôt

Fichier généré par `node docs/mesurer.mjs --commandes > docs/ETAT.md`, le 14 novembre 2026 à 17:39 (heure de Paris), à partir du commit `ae6b787`. Aucun chiffre n'est écrit à la main. Si `data/` change, relancer la commande.

Produit : LegiSpot. Dossiers déclarés dans `data/config.json` : 6.

## Dossiers

| Identifiant | Client d'exemple | État | Date de référence | Fichiers principaux présents | Manquants |
|---|---|---|---|---|---|
| `plf2027-holdings` | Afep | en_cours | aucune (dossier en cours) | 13 sur 13 | aucun |
| `petits-colis` | Alibaba France | clos | 2025-11-19 | 13 sur 13 | aucun |
| `plf2027-apprentissage` | U2P | en_cours | aucune (dossier en cours) | 13 sur 13 | aucun |
| `plf2027-agriculture` | FNSEA | en_cours | aucune (dossier en cours) | 13 sur 13 | aucun |
| `plf2027-logement` | Union sociale pour l'habitat | en_cours | aucune (dossier en cours) | 13 sur 13 | aucun |
| `plf2027-renovation` | CAPEB | en_cours | aucune (dossier en cours) | 13 sur 13 | aucun |

## Verdict de l'objectif principal

Règle du projet (`pipeline/pivots/verdict.ts`), pas une prédiction validée.

| Dossier | Situation | Score | Tendance | Confiance | Rédaction de la lecture |
|---|---|---|---|---|---|
| `plf2027-holdings` | favorable | 66 % | stable | elevee | llm |
| `petits-colis` | defavorable | 23 % | degradation | moyenne | llm |
| `plf2027-apprentissage` | incertaine | 51 % | stable | elevee | llm |
| `plf2027-agriculture` | incertaine | 47 % | stable | elevee | llm |
| `plf2027-logement` | incertaine | 53 % | stable | elevee | llm |
| `plf2027-renovation` | defavorable | 33 % | stable | elevee | llm |

## Amendements de la mesure et prédictions Orcet

Une prédiction Orcet est la moyenne des probabilités individuelles de voter pour un amendement. Ce n'est pas une probabilité d'adoption.

| Dossier | Amendements | En attente | Avec prédiction Orcet | Valeurs | Lignes Orcet dans le bloc Suite |
|---|---|---|---|---|---|
| `plf2027-holdings` | 37 | 0 | 0 | aucune | 0 |
| `petits-colis` | 77 | 31 | 0 | aucune | 0 |
| `plf2027-apprentissage` | 52 | 24 | 24 | 25 % à 57 % | 8 |
| `plf2027-agriculture` | 78 | 23 | 23 | 20 % à 89 % | 8 |
| `plf2027-logement` | 44 | 12 | 12 | 25 % à 44 % | 8 |
| `plf2027-renovation` | 24 | 3 | 3 | 26 % à 53 % | 3 |

## Nouveautés et positions des députés

| Dossier | Événements | Dont de plus haute importance | Sur qui agir | Alliés | Perdus | Position inconnue | Décideurs |
|---|---|---|---|---|---|---|---|
| `plf2027-holdings` | 117 | 1 | 15 | 15 | 15 | 24 | 12 |
| `petits-colis` | 107 | 6 | 15 | 12 | 15 | 343 | 12 |
| `plf2027-apprentissage` | 142 | 7 | 15 | 15 | 15 | 85 | 8 |
| `plf2027-agriculture` | 164 | 33 | 15 | 15 | 10 | 110 | 13 |
| `plf2027-logement` | 120 | 14 | 15 | 15 | 0 | 95 | 11 |
| `plf2027-renovation` | 92 | 1 | 15 | 15 | 15 | 197 | 10 |

## Qui a produit quoi : modèle de langage, gabarit ou règles

Champ `mode` de chaque texte (`llm` : rédigé par le modèle et vérifié ; `gabarit` : produit sans modèle). Méthode de classement des arguments lue dans `meta.limits` de `arguments.json`.

| Dossier | Compte rendu | Synthèses de fiche député | Réponses aux arguments | Arguments pour / contre | Classement des arguments |
|---|---|---|---|---|---|
| `plf2027-holdings` | llm, nombres vérifiés | gabarit 58 | gabarit 19 | 19 / 23 | modèle de langage |
| `petits-colis` | llm, nombres vérifiés | gabarit 46 | gabarit 9 | 9 / 8 | modèle de langage |
| `plf2027-apprentissage` | llm, nombres vérifiés | gabarit 56 | gabarit 1 | 1 / 8 | modèle de langage |
| `plf2027-agriculture` | llm, nombres vérifiés | gabarit 10, llm 44 | llm 2 | 2 / 32 | modèle de langage |
| `plf2027-logement` | llm, nombres vérifiés | gabarit 1, llm 41 | llm 2 | 11 / 19 | modèle de langage |
| `plf2027-renovation` | llm, nombres vérifiés | gabarit 2, llm 52 | llm 3 | 3 / 5 | modèle de langage |

## Fichiers par député et HATVP

| Dossier | Fiches | Auditions | Débats | Amendements par député | Organisations HATVP |
|---|---|---|---|---|---|
| `plf2027-holdings` | 58 | 58 | 58 | 58 | 23 |
| `petits-colis` | 46 | 52 | 57 | 48 | 34 |
| `plf2027-apprentissage` | 56 | 58 | 58 | 59 | 93 |
| `plf2027-agriculture` | 54 | 54 | 54 | 54 | 87 |
| `plf2027-logement` | 42 | 42 | 42 | 42 | 72 |
| `plf2027-renovation` | 54 | 57 | 57 | 57 | 120 |

## Nature des preuves

| Dossier | Preuves dans verdict, nouveautés, suite, action, état |
|---|---|
| `plf2027-holdings` | deduction 181, fait 76, inconnue 28 |
| `petits-colis` | deduction 182, fait 32, inconnue 346 |
| `plf2027-apprentissage` | deduction 141, fait 91, inconnue 89 |
| `plf2027-agriculture` | deduction 199, fait 97, inconnue 114 |
| `plf2027-logement` | deduction 141, fait 86, inconnue 99 |
| `plf2027-renovation` | deduction 112, fait 62, inconnue 201 |

## Sceau de publication

`pipeline/publication.mjs` enregistre l'empreinte SHA-256 des fichiers principaux dans `publication.json`. Le sceau est valide si aucun fichier n'a changé depuis.

| Dossier | Publié le | Fichiers scellés | État du sceau |
|---|---|---|---|
| `plf2027-holdings` | 2026-11-14T16:29:12.251Z | 10 | valide |
| `petits-colis` | 2026-11-14T16:29:12.324Z | 10 | valide |
| `plf2027-apprentissage` | 2026-11-14T16:29:12.395Z | 10 | valide |
| `plf2027-agriculture` | 2026-11-14T16:29:12.471Z | 10 | valide |
| `plf2027-logement` | 2026-11-14T16:29:12.559Z | 10 | valide |
| `plf2027-renovation` | 2026-11-14T16:29:12.637Z | 10 | valide |

## Commandes de vérification

Lancées par ce script. Versions : Node v22.23.4, Bun 1.4.4.

| Commande | Code de sortie | Dernière ligne utile |
|---|---|---|
| `npm run typecheck` | 0 | > tsc --noEmit |
| `bun qa/check.ts --root data` | 0 | OK : 436 fichiers valides, intégrité croisée vérifiée (data) |
| `bun qa/check.ts --root contracts/fixtures` | 0 | OK : 72 fichiers valides, intégrité croisée vérifiée (contracts/fixtures) |
| `node pipeline/publication.mjs --check` | 0 | OK plf2027-renovation 2026-11-14T16:29:12.637Z |
| `bun test` | 0 | Ran 19 tests across 2 files. [79.00ms] |
| `npm run build` | 0 | ✓ built in 705ms |
