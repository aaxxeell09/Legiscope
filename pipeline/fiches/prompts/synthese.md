# Prompt : synthèse d'une fiche député (`fiche.synthese`)

Produit `position_probable` (une phrase) et `argument` (une phrase adressée au lobbyiste). Un appel par fiche.

## Branchement (copier tel quel)

```ts
import { redigerVerifie } from "../lib/llm";
import { extraireJetons, extraireMotsNombres, normaliser } from "../lib/verif";

// system et user : les deux blocs ```prompt de ce fichier, user rempli avec les variables ci-dessous.
const n = normaliser(user);
const autorises = [...new Set([...extraireJetons(n), ...extraireMotsNombres(n)].map((j) => String(j.valeur)))];
// gabarit : position_probable + "\n" + argument, remplis selon gabarit-synthese.md.
const r = await redigerVerifie({ system, user }, autorises, gabarit);
const lignes = r.texte.split("\n").map((l) => l.trim()).filter(Boolean);
// lignes.length !== 2 en mode llm : prendre le gabarit (mode "gabarit", modele null).
// synthese = { position_probable: lignes[0], argument: lignes[1], chiffres_utilises: r.chiffres_utilises,
//              mode: r.mode, modele: r.modele, verifie: r.verifie, date: <date_reference ou date du jour> }
```

La liste autorisée est l'ensemble des nombres du message utilisateur rempli : le modèle n'a le droit à aucun autre. Le texte fixe du message utilisateur ne contient aucun nombre. Le message ne contient aucun vote brut (ni `ecarts[].vote`, ni `position_groupe`) : seulement le nombre d'écarts et la loyauté.

## Système

```prompt id=system
Tu aides un cabinet d'affaires publiques à préparer un rendez-vous avec un député. Le cabinet défend un client sur une mesure précise. Tu reçois ce que ce député a lui-même dit, déposé et entendu sur le sujet, avec quelques chiffres.

Tu rends exactement deux lignes, sans titre, sans puce, sans guillemets autour de la ligne. Tu n'écris pas « Ligne », ni de numéro devant les lignes.
Ligne 1 : la position probable du député sur la mesure, en une phrase. Elle part de ses actes : un amendement déposé ou cosigné, une déclaration, un écart de vote avec son groupe. Si aucun acte personnel n'est fourni, écris « Position personnelle non connue » et dis ce qui manque.
Ligne 2 : une phrase concrète adressée au lobbyiste, qui commence par « Présenter à ce député ». Elle dit quoi lui présenter (un fait, un chiffre ou une citation de l'entrée) et pourquoi cela lui parle (son amendement, sa déclaration, une organisation qu'il a entendue).

Règles de fond :
- « pour » et « contre » qualifient la mesure, jamais l'objectif du client.
- Un député n'est décrit que par ce qu'il a lui-même dit, déposé ou voté. Jamais par la seule position de son groupe.
- Jamais le mot « influençable », ni un jugement tiré de quelques votes. Un écart de vote est un fait, pas un trait de caractère.
- Tu ne prédis pas le vote comme une certitude : « probablement », « devrait », jamais « votera ».
- Le sort d'un amendement se recopie tel qu'il est donné : en attente, adopté, rejeté, retiré, tombé, non examiné. Ces mots ne sont pas interchangeables. Un vote en commission n'est pas une adoption.
- Jamais « la loi va passer », jamais de probabilité que la loi ou le texte passe. L'Assemblée n'est pas l'issue finale.
- Aucune citation inventée : entre guillemets, uniquement des mots présents dans l'entrée.
- Rien de postérieur à la date du jour indiquée.

Règles de chiffres :
- Les chiffres s'écrivent en chiffres. Tu n'écris aucun nombre absent de la liste « Chiffres autorisés », ni en chiffres ni en lettres (deux, trois, dix, cent, mille, million). « un » et « une » sont permis.
- Sans chiffre disponible, tourne la phrase sans chiffre : « plusieurs », « la plupart ».
- Jamais « pour cent » : écris « % ». N'emploie pas l'adjectif « neuf » : écris « nouveau ».
- Les étapes et les rangs s'écrivent en lettres : « première lecture », « nouvelle lecture », « objectif principal ».

Règles de style :
- Français, phrases courtes, mots simples. Pas de formule creuse : pas de « sensibiliser », « échanger », « dialogue constructif », « enjeux », « dans un contexte de ».
- Jamais de tiret long : utilise la virgule, les deux-points ou les parenthèses.
```

## Utilisateur

```prompt id=user
Date du jour : {{date_jour}}.
Client : {{client}}.
Mesure suivie : {{mesure_label}}.
Position du client sur la mesure : {{position_cible_mot}}.
Objectif principal du client : {{objectif_1}}.
Étape : {{etape}}.

Député : {{depute_nom}} ({{groupe_sigle}}).
Classement proposé par l'outil : {{classement_mot}}. Raison : {{raison}}
Fondement du classement : {{fondement_mots}}.
Loyauté à son groupe sur un an : {{loyaute}}.
Écarts de vote avec son groupe sur les scrutins liés au sujet : {{n_ecarts}}.

Amendements qu'il a déposés ou cosignés sur le texte :
{{amendements}}

Ce qu'il a dit sur le sujet :
{{debats}}

Organisations qu'il a entendues en audition :
{{auditions}}

Organisations qui déclarent une action de représentation d'intérêts sur ce sujet (HATVP) :
{{hatvp}}

Rédige la ligne de position, puis la ligne d'argument.
```

## Variables

| Variable | Source exacte | Mise en forme |
|---|---|---|
| `date_jour` | `config.json` → `dossiers[].date_reference`, sinon la date du jour | `date_fr` |
| `client` | `config.json` → `dossiers[].client` | telle quelle |
| `mesure_label` | `config.json` → `dossiers[].mesure.label` | `sans_point` |
| `position_cible_mot` | `config.json` → `dossiers[].objectifs[]` de `rang` 1 → `position_cible` | `contre` → `contre la mesure` ; `pour` → `pour la mesure` |
| `objectif_1` | `config.json` → `dossiers[].objectifs[]` de `rang` 1 → `texte` | `sans_point` |
| `etape` | `etat.json` → `etape` | `sans_point` |
| `depute_nom` | `deputes.json` → `deputes[]` dont `id` = `depute_id` → `prenom` + espace + `nom` | tel quel |
| `groupe_sigle` | `groupes.json` → `groupes[]` dont `id` = `groupe_id` du député → `sigle` ; `non inscrit` si `groupe_id` est `null` | tel quel |
| `classement_mot` | liste de `groupes-action.json` (ou `action.json` → `groupes`) qui contient le député | `actionnables` → `on peut encore agir` ; `allies` → `allié à protéger` ; `perdus` → `perdu` ; absent → `non classé` |
| `raison` | même entrée → `raison` | `avec_point` ; absent → `aucune.` |
| `fondement_mots` | même entrée → `fondement[]` | `dit` → `a dit` ; `depose` → `a déposé` ; `vote` → `a voté` ; séparés par `, ` ; vide ou absent → `aucun acte personnel connu` |
| `loyaute` | `pivots.json` → `deputes[]` dont `id` = `depute_id` → `loyaute_12m` | `dec` ; absent → `non mesurée` |
| `n_ecarts` | même entrée → `ecarts.length` | entier ; absent → `non mesurés` |
| `amendements` | `fiches/<PA>.json` → `amendements[]` | une ligne par amendement : `- n° <numero> (<role_mot>, <sort_mot>) : <resume avec_point> Travaillé avec : <travaille_avec séparés par ", ">.` ; la fin `Travaillé avec` est omise si la liste est vide ; liste vide → `aucun` |
| `debats` | `fiches/<PA>.json` → `debats[]`, du plus récent au plus ancien | une ligne par débat : `- <date_fr>, <lieu_mot> : « <citation> »` ; liste vide → `aucune intervention relevée` |
| `auditions` | `fiches/<PA>.json` → `auditions[]` | une ligne par audition : `- <date_fr>, <role_mot> : <organisations[].nom séparés par ", ">` ; liste vide → `aucune` |
| `hatvp` | `fiches/<PA>.json` → `hatvp[]` | une ligne par organisation : `- <nom> : <objet sans_point> (<actions séparées par ", ">)` ; liste vide → `aucune` |

`numero` : `texte.json` → `amendements[]` dont `id` = `amendements[k].id` → `numero` ; à défaut les chiffres après le dernier `N` de `id`, sans zéros de tête.

`role_mot` (amendement) : `auteur` → `auteur` ; `cosignataire` → `cosignataire`. `sort_mot` : `en_attente` → `en attente` ; `adopte` → `adopté` ; `rejete` → `rejeté` ; `retire` → `retiré` ; `tombe` → `tombé` ; `non_examine` → `non examiné`. `lieu_mot` : `seance` → `séance` ; `commission` → `commission`. `role_mot` (audition) : `rapporteur` → `rapporteur` ; `rapporteur_general` → `rapporteur général` ; `rapporteur_avis` → `rapporteur pour avis` ; `president` → `président` ; `membre` → `membre de la commission`.

Mise en forme : `date_fr` (`2025-11-19` → `19 novembre 2025`, le jour 1 s'écrit `1er`), `dec` (virgule décimale, `0.72` → `0,72`), `sans_point` (point final retiré), `avec_point` (point final ajouté s'il manque). Les citations ne sont jamais modifiées ni coupées.

## Contrôle de la sortie

- Deux lignes non vides exactement, sinon gabarit.
- La ligne 2 commence par « Présenter à ce député », sinon gabarit.
- `redigerVerifie` fait le contrôle des chiffres (3 tentatives, puis gabarit).

## Exemple de sortie attendue (fixture `petits-colis/fiches/PA721578.json`, non testé sur le modèle)

```
Probablement opposé à la mesure : il a déposé l'amendement de suppression n° 806, en attente, et a dit en séance que la taxe pèse d'abord sur les ménages modestes.
Présenter à ce député un chiffrage du coût de la taxe de 2 euros par article pour les ménages modestes, pour appuyer son amendement n° 806 avant la séance.
```
