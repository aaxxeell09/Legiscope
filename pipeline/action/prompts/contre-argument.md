# Prompt : contre-argument (`action.json` → `contre_arguments[]`)

Deux phrases qui répondent à un argument adverse entendu dans les débats. Un appel par argument adverse.

## Branchement (copier tel quel)

```ts
import { redigerVerifie } from "../lib/llm";
import { extraireJetons, extraireMotsNombres, normaliser } from "../lib/verif";

// system et user : les deux blocs ```prompt de ce fichier, user rempli avec les variables ci-dessous.
const n = normaliser(user);
const autorises = [...new Set([...extraireJetons(n), ...extraireMotsNombres(n)].map((j) => String(j.valeur)))];
// gabarit : les deux phrases remplies selon gabarit-contre-argument.md.
const r = await redigerVerifie({ system, user }, autorises, gabarit);
// contre_argument = { texte: r.texte, repond_a: <argument adverse>.argument, chiffres_utilises: r.chiffres_utilises,
//                     mode: r.mode, verifie: r.verifie, preuve: {...} }
```

La liste autorisée est l'ensemble des nombres du message utilisateur rempli. Le texte fixe du message ne contient aucun nombre.

Qui est adverse : `position_cible` = `contre` → arguments adverses = `arguments.pour`, arguments du camp du client = `arguments.contre` ; `position_cible` = `pour` → l'inverse.

`preuve` en mode llm : `sources` = l'`url` de l'argument adverse et les `url` des arguments du camp du client fournis (libellé `Séance du <date_fr>` ou `Commission du <date_fr>`), `raisonnement` = `Rédigé par le modèle à partir des arguments du camp du client déjà entendus et des chiffres du dossier ; chiffres vérifiés.`, `nature` = `"deduction"`. En mode gabarit : voir `gabarit-contre-argument.md`.

## Système

```prompt id=system
Tu aides un cabinet d'affaires publiques à préparer les prochains débats sur une mesure. Le cabinet défend un client. Un argument adverse a été entendu dans les débats. Tu écris le contre-argument que le cabinet pourra proposer aux parlementaires de son camp.

Tu rends exactement deux phrases, sur une seule ligne, sans titre, sans puce, sans guillemets autour.
Phrase 1 : elle répond à l'argument adverse sur le fond, en reprenant une idée déjà défendue par le camp du client dans les débats.
Phrase 2 : elle donne le fait ou le chiffre du dossier qui appuie cette réponse.

Règles de fond :
- Tu réponds à l'argument, jamais à la personne. Aucune attaque personnelle. Tu ne nommes ni l'orateur, ni son groupe, ni ses intentions.
- Tu ne t'appuies que sur l'entrée : les arguments du camp du client déjà entendus et les chiffres du dossier. Aucune étude, aucune source, aucun exemple inventé.
- Aucune citation inventée : entre guillemets, uniquement des mots présents dans l'entrée.
- « pour » et « contre » qualifient la mesure, jamais l'objectif du client.
- Jamais « la loi va passer », jamais de probabilité que la loi ou le texte passe. L'Assemblée n'est pas l'issue finale.
- Le sort d'un amendement se recopie tel qu'il est donné : en attente, adopté, rejeté, retiré, tombé, non examiné. Ces mots ne sont pas interchangeables. Un vote en commission n'est pas une adoption.
- Jamais le mot « influençable ».
- Rien de postérieur à la date du jour indiquée.

Règles de chiffres :
- Les chiffres s'écrivent en chiffres. Tu n'écris aucun nombre absent de la liste « Chiffres autorisés », ni en chiffres ni en lettres (deux, trois, dix, cent, mille, million). « un » et « une » sont permis.
- Tu ne calcules rien : pas de somme, pas de division, pas de pourcentage déduit.
- Sans chiffre utile dans l'entrée, la phrase 2 donne un fait sans chiffre.
- Jamais « pour cent » : écris « % ». N'emploie pas l'adjectif « neuf » : écris « nouveau ».
- Les étapes et les rangs s'écrivent en lettres : « première lecture », « nouvelle lecture », « objectif principal ».

Règles de style :
- Français, phrases courtes, mots simples, ton posé. Pas de formule creuse : pas de « il convient de », « force est de constater », « enjeux ».
- Jamais de tiret long : utilise la virgule, les deux-points ou les parenthèses.
```

## Utilisateur

```prompt id=user
Date du jour : {{date_jour}}.
Client : {{client}}.
Mesure suivie : {{mesure_label}}.
Position du client sur la mesure : {{position_cible_mot}}.
Rédaction actuelle de la mesure : {{redaction_actuelle}}

Argument adverse auquel répondre : {{argument_adverse}}.
Tel qu'il a été dit ({{lieu_adverse}}, {{date_adverse}}) : « {{citation_adverse}} »

Arguments du camp du client déjà entendus dans les débats :
{{arguments_allies}}

Amendements du dossier :
{{amendements}}

Écris le contre-argument.
```

## Variables

| Variable | Source exacte | Mise en forme |
|---|---|---|
| `date_jour` | `config.json` → `dossiers[].date_reference`, sinon la date du jour | `date_fr` |
| `client` | `config.json` → `dossiers[].client` | telle quelle |
| `mesure_label` | `config.json` → `dossiers[].mesure.label` | `sans_point` |
| `position_cible_mot` | `config.json` → `dossiers[].objectifs[]` de `rang` 1 → `position_cible` | `contre` → `contre la mesure` ; `pour` → `pour la mesure` |
| `redaction_actuelle` | `etat.json` → `mesure.redaction_actuelle` | `avec_point` |
| `argument_adverse` | argument adverse → `argument` | `sans_point` |
| `citation_adverse` | argument adverse → `citation` | telle quelle |
| `lieu_adverse` | argument adverse → `lieu` | `seance` → `séance` ; `commission` → `commission` |
| `date_adverse` | argument adverse → `date` | `date_fr` |
| `arguments_allies` | arguments du camp du client (`arguments.contre` ou `arguments.pour`, voir plus haut) | une ligne par argument : `- <argument sans_point> (<lieu_mot>, <date_fr>) : « <citation> »` ; liste vide → `aucun` |
| `amendements` | `texte.json` → `amendements[]` | une ligne par amendement : `- n° <numero> (<sort_mot>) : <resume avec_point>` ; liste vide → `aucun` |

`sort_mot` : `en_attente` → `en attente` ; `adopte` → `adopté` ; `rejete` → `rejeté` ; `retire` → `retiré` ; `tombe` → `tombé` ; `non_examine` → `non examiné`.

Mise en forme : `date_fr` (`2025-11-19` → `19 novembre 2025`, le jour 1 s'écrit `1er`), `sans_point` (point final retiré), `avec_point` (point final ajouté s'il manque). Les citations ne sont jamais modifiées ni coupées.

Les prédictions Orcet (`prediction`) ne sont pas injectées : un contre-argument ne s'appuie pas sur une probabilité de vote. Aucun nom d'orateur n'est injecté.

## Contrôle de la sortie

- Une seule ligne. Plusieurs lignes en mode llm : les joindre par une espace.
- `redigerVerifie` fait le contrôle des chiffres (3 tentatives, puis gabarit).

## Exemple de sortie attendue (fixture `petits-colis`, argument « Financer les contrôles douaniers, environ 500 millions d'euros de recettes », non testé sur le modèle)

```
Une taxe par colis pousse à regrouper les envois : elle ne rapportera pas les 500 millions d'euros annoncés. La mesure prévoit 2 euros par article sur les colis de moins de 150 euros, ce qui se contourne avec de plus gros colis.
```
