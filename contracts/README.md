# Contrats : la seule dépendance entre sessions

Un schéma zod par fichier JSON, un jeu de fixtures complet, des types inférés. Rien d'autre ne relie les sessions. Propriétaire : P0. Figé : on ne change pas un contrat, on écrit dans `status/<session>.md` (voir « Règle » en bas).

- Schémas : `contracts/schemas/*.ts` ; enums partagés dans `enums.ts`, bloc `meta` dans `meta.ts`, bloc `preuve` dans `preuve.ts`.
- Point d'entrée : `contracts/index.ts` exporte tous les schémas, les types (`Cohesion`, `Verdict`, `Action`...), la map `SCHEMAS` (nom logique → schéma) et `dataPath(dossierId, kind, pa?, root?)`.
- Fixtures : `contracts/fixtures/` (générées par `bun contracts/generer-fixtures.ts`, voir `contracts/fixtures/README.md`).
- Dépendance : `zod` (v3), installée à la racine.

```ts
import { VerdictSchema, dataPath, type Verdict } from "../contracts";
const v: Verdict = VerdictSchema.parse(await (await fetch("/" + dataPath("petits-colis", "verdict"))).json());
```

## Arborescence de `data/`

Le front lit `data/` ou `contracts/fixtures/` selon `config.dataset` (`live` | `fixtures`), même arborescence :

```
config.json                 produit, dataset, dossiers (client, objectifs, mesure, date_reference, pivot_demo), presets cohésion
groupes.json                11 groupes, id PO, sigle, couleur, effectif
deputes.json                députés, groupe_id nullable (non-inscrit), commissions
cohesion.json               accord mensuel par paire de groupes, events (censures...), signals
<dossier>/
  verdict.json              Bloc 1 : un verdict par objectif (situation, score, tendance, confiance, lecture, favorable, bloquant, cause_du_changement)
  nouveautes.json           Bloc 2 : événements triés par importance puis date, effet sur le verdict
  suite.json                Bloc 3 : échéances, dernière occasion d'agir, probables
  action.json               Bloc 4 : décideurs, députés actionnables / alliés / perdus, arguments pour et contre la mesure, contre-arguments
  note.json                 Bloc 5 : compte rendu (client et objectifs recopiés, texte vérifié)
  etat.json                 En fond : état de la mesure (dans le texte ? rédaction, modifications), étapes, articles
  texte.json                Base : texte, positions des groupes, amendements avec prédiction Orcet (nullable)
  pivots.json               5 à 15 députés les moins prévisibles, entrée de P3 pour action.groupes
  hatvp.json                organisations ayant déclaré une action sur le texte
  auditions/<PA>.json       organisations entendues (A1), couverture
  debats/<PA>.json          interventions avec citation et URL (A2), couverture
  amendements/<PA>.json     amendements déposés ou cosignés, « travaillé avec » (A3)
  fiches/<PA>.json          fusion pure des trois précédents + hatvp + synthèse (A4)
  fiches/index.json         disponibles / absents : le front grise un pivot absent, ne plante jamais
raw/                        réponses brutes de l'API (P1 seul), ignoré par la validation
```

Chaque fichier porte `meta` (`generated_at`, `sources`, `limits`, `producer`, `dossier_id` : null à la racine, l'identifiant du dossier sinon). Le front refuse un fichier dont `meta.dossier_id` diffère du dossier demandé.

Règles tenues par les schémas : identifiants = chaînes libres ; dates ISO (`AAAA-MM-JJ`, mois `AAAA-MM`) ; probabilités entre 0 et 1 ; `proba_pour` d'Orcet = moyenne des probabilités individuelles de voter pour, jamais une probabilité d'adoption ; `accord` null si et seulement si `n_scrutins` vaut 0 ; `mode: "gabarit"` implique `modele: null` ; `position_connue` vaut true si et seulement si `fondement` est non vide ; « pour » et « contre » dans `action.arguments` qualifient la mesure, pas l'objectif du client ; `preuve.nature` sépare fait publié, déduction de l'outil et inconnue.

## Routes du front

| Route | Fichiers lus |
|---|---|
| `/dossier/:id` | tableau de bord en cinq blocs : `verdict`, `nouveautes`, `suite`, `action`, `note` ; en fond `etat` |
| `/dossier/:id/depute/:pa` | fiche d'un député ouverte depuis le bloc Action : `fiches/<pa>.json` (après `fiches/index.json`) |
| `/dossier/:id/base` | articles et amendements : `etat.json` (articles), `texte.json` (amendements), `pivots.json` |
| `/sources` | sources et limites : les `meta` de tous les fichiers |

Les anciennes routes (`/texte`, `/fiche`, `/cohesion`, `/note`) n'existent plus ; `cohesion.json` reste produit et sert les blocs Verdict et Suite.

## Valider

```
bun run check                                  # = bun qa/check.ts, data/ et contracts/fixtures (data/ absent = avertissement)
bun qa/check.ts --root contracts/fixtures      # fixtures seules
bun qa/check.ts --root data                    # données réelles, requis
bun test qa/                                   # 10 tests du vérificateur de chiffres (règle 5.13)
```

`qa/check.ts` valide chaque fichier contre son schéma puis l'intégrité croisée : tout `groupe_id` existe dans `groupes.json` ; tout `auteur_id`, `cosignataires_ids`, pivot, `depute_id`, `orateur_id`, `decideurs[].depute_id` existe dans `deputes.json` ; chaque pivot a ses fichiers auditions, debats, amendements et une fiche sauf s'il est listé dans `absents` ; la fiche est bien la fusion des trois producteurs et de `hatvp.json` ; `meta.dossier_id` égale le dossier du chemin ; les sous-dossiers présents sont exactement `config.dossiers[].id` ; `note.client` et `note.objectifs` égalent `config.json` ; un verdict par objectif, un seul de rang 1, `cause_du_changement.evenement_id` existe dans `nouveautes.json` ; `fiche: true` implique une fiche dans `index.json` ; `date_reference` posée implique aucun événement postérieur et aucune échéance déjà passée ; `chiffres_utilises` couvre tous les nombres de chaque synthèse, lecture de verdict, contre-argument et note (`qa/verif.ts`). Chaque erreur : `fichier | champ | valeur | message`. Code de sortie 1 si une erreur.

## Règle : on ne change pas un contrat, on écrit dans `status/`

Un champ manque, un enum ne couvre pas un cas, une nullabilité gêne : la session écrit le besoin dans `status/<session>.md` (fichier, champ, exemple de valeur, pourquoi) et continue avec le contrat actuel (valeur `null`, enum `autre`, ou le champ laissé vide). P0 lit `status/`, modifie le schéma, les fixtures et `qa/check.ts` ensemble, et commite. Personne d'autre ne touche `contracts/` ni `qa/`. Un pipeline qui produit un fichier invalide est en faute, pas le schéma : `bun run check` le dit avec le fichier, le champ et la valeur.
