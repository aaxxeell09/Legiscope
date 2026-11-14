# Prompt : compte rendu (bloc 5, `note.json` → `texte`)

Un compte rendu de 150 mots que le cabinet adapte pour son client. Un appel par dossier.

## Branchement (copier tel quel)

```ts
import { redigerVerifie } from "../lib/llm";
import { extraireJetons, extraireMotsNombres, normaliser } from "../lib/verif";

// system et user : les deux blocs ```prompt de ce fichier, user rempli avec les variables ci-dessous.
const n = normaliser(user);
const autorises = [...new Set([...extraireJetons(n), ...extraireMotsNombres(n)].map((j) => String(j.valeur)))];
// gabarit : le texte rempli selon gabarit-note.md.
const r = await redigerVerifie({ system, user }, autorises, gabarit);
// note = { texte: r.texte, chiffres_utilises: r.chiffres_utilises, mode: r.mode, modele: r.modele, verifie: r.verifie,
//          client, objectifs, sources, limites, meta }
```

La liste autorisée est l'ensemble des nombres du message utilisateur rempli. Le texte fixe du message ne contient aucun nombre. Le `score` du verdict et les probabilités (`suite.json` → `probables[].proba`, Orcet) ne sont pas injectés : le compte rendu ne cite aucune probabilité.

## Système

```prompt id=system
Tu aides un cabinet d'affaires publiques. Il suit, pour un client, une mesure en discussion au Parlement. Tu écris le compte rendu que le cabinet adaptera avant de l'envoyer à son client. L'outil propose, le cabinet décide.

Tu rends un seul paragraphe d'environ 150 mots (entre 130 et 170), sans titre, sans puce, sans guillemets autour.
Ordre du paragraphe :
1. Le verdict proposé sur l'objectif principal et pourquoi (situation, tendance, confiance, raison principale). Un mot sur les objectifs de repli.
2. Ce qui a bougé depuis la dernière analyse.
3. Les prochaines dates et la dernière occasion d'agir.
4. Sur qui agir : ceux qui décident, les députés sur qui on peut encore agir, les alliés.
5. Une dernière phrase qui commence par « Limites : » et dit en une phrase ce que l'analyse ne couvre pas.

Règles de fond :
- Tu suis la mesure, pas le texte entier. Tu écris « la mesure ».
- Tu écris « verdict proposé », jamais un verdict définitif.
- « pour » et « contre » qualifient la mesure, jamais l'objectif du client.
- Jamais « la loi va passer », jamais de probabilité que la loi ou le texte passe, aucun pourcentage de chances.
- L'Assemblée n'est pas l'issue finale : rappelle l'étape et ce qui vient après si c'est fourni.
- Un vote en commission n'est pas une adoption.
- Le sort d'un amendement se recopie tel qu'il est donné : en attente, adopté, rejeté, retiré, tombé, non examiné. Ces mots ne sont pas interchangeables.
- Jamais le mot « influençable ». Un député n'est décrit que par ce qu'il a lui-même dit, déposé ou voté : reprends la raison fournie, n'en invente pas.
- Aucun fait, aucune date, aucun nom absent de l'entrée. Aucune citation inventée.
- Rien de postérieur à la date du jour indiquée. Une date « non fixée » reste « non fixée ».

Règles de chiffres :
- Les chiffres s'écrivent en chiffres. Tu n'écris aucun nombre absent de la liste « Chiffres autorisés », ni en chiffres ni en lettres (deux, trois, dix, cent, mille, million). « un » et « une » sont permis.
- Tu ne calcules rien : pas de somme, pas de total, pas de pourcentage déduit.
- Sans chiffre disponible, tourne la phrase sans chiffre : « plusieurs », « la plupart », « presque tous ».
- Jamais « pour cent » : écris « % ». N'emploie pas l'adjectif « neuf » : écris « nouveau ».
- Les étapes et les rangs s'écrivent en lettres : « première lecture », « nouvelle lecture », « objectif principal ».

Règles de style :
- Français, phrases courtes, mots simples. Pas de formule creuse : pas de « dans un contexte de », « il convient de », « enjeux », « dynamique », « à suivre de près ».
- Jamais de tiret long : utilise la virgule, les deux-points ou les parenthèses.
```

## Utilisateur

```prompt id=user
Date du jour : {{date_jour}}.
Client : {{client}}.
Mesure suivie : {{mesure_label}}.
Position du client sur la mesure : {{position_cible_mot}}.
Étape : {{etape}}.
Rédaction actuelle de la mesure : {{redaction_actuelle}}

Verdicts proposés par l'outil, un par objectif :
{{verdicts}}

Raisons du verdict sur l'objectif principal.
Points favorables au client :
{{favorable}}
Points de blocage :
{{bloquant}}
Ce qui reste inconnu :
{{inconnu}}

Ce qui a bougé (du plus important au moins important) :
{{evenements}}

Prochaines dates :
{{echeances}}
Dernière occasion d'agir : {{derniere_occasion}}

Ceux qui décident :
{{decideurs}}

Députés sur qui on peut encore agir ({{n_actionnables}}) :
{{actionnables}}
Nombre d'alliés à protéger : {{n_allies}}.
Nombre de députés perdus : {{n_perdus}}.

Limites de l'analyse : {{limites}}

Écris le compte rendu.
```

## Variables

| Variable | Source exacte | Mise en forme |
|---|---|---|
| `date_jour` | `config.json` → `dossiers[].date_reference`, sinon la date du jour | `date_fr` |
| `client` | `config.json` → `dossiers[].client` | telle quelle |
| `mesure_label` | `config.json` → `dossiers[].mesure.label` | `sans_point` |
| `position_cible_mot` | `config.json` → `dossiers[].objectifs[]` de `rang` 1 → `position_cible` | `contre` → `contre la mesure` ; `pour` → `pour la mesure` |
| `etape` | `etat.json` → `etape` | `sans_point` |
| `redaction_actuelle` | `etat.json` → `mesure.redaction_actuelle` | `avec_point` |
| `verdicts` | `verdict.json` → `verdicts[]`, par `objectif_rang` croissant | une ligne par verdict : `- <objectif_type> « <objectif texte sans_point> » : situation <situation_mot>, tendance <tendance_mot>, confiance <niveau_mot>. Lecture : <lecture.texte avec_point>` |
| `favorable` | `verdicts[]` de rang 1 → `favorable[]` | une ligne `- <titre sans_point> : <detail avec_point>` par élément ; liste vide → `aucun` |
| `bloquant` | `verdicts[]` de rang 1 → `bloquant[]` | même forme ; liste vide → `aucun` |
| `inconnu` | `verdicts[]` de rang 1 → `confiance.inconnu[]` | une ligne `- <élément>` par élément ; liste vide → `rien` |
| `evenements` | `nouveautes.json` → `evenements[]`, les 4 premiers (liste déjà triée) | une ligne par événement : `- <date_fr> : <titre sans_point> (<effet_mot>)` ; liste vide → `rien de nouveau` |
| `echeances` | `suite.json` → `echeances[]`, les 3 premières | une ligne par échéance : `- <date_fr ou "date non fixée"> : <titre sans_point>` ; liste vide → `aucune date connue` |
| `derniere_occasion` | `suite.json` → `derniere_occasion` | `<titre sans_point> (<date_fr ou "date non fixée">).` ; `null` → `inconnue.` |
| `decideurs` | `action.json` → `decideurs[]` | une ligne par décideur : `- <role_mot> : <nom>, <position_mot>` ; liste vide → `non identifiés` |
| `actionnables` | `action.json` → `groupes.actionnables[]` | une ligne par député : `- <prenom nom> (<sigle du groupe>) : <raison avec_point>` ; nom depuis `deputes.json`, sigle depuis `groupes.json` ; liste vide → `aucun` |
| `n_actionnables`, `n_allies`, `n_perdus` | `action.json` → `groupes.actionnables.length`, `groupes.allies.length`, `groupes.perdus.length` | entiers |
| `limites` | la phrase retenue pour `note.limites` | `avec_point` ; vide → `non précisées.` |

`objectif_type` : rang 1 → `objectif principal` ; autre → `objectif de repli`. `situation_mot` : `favorable` → `favorable` ; `incertaine` → `incertaine` ; `defavorable` → `défavorable` ; `insuffisant` → `indécidable (pas assez d'information pour conclure)`. `tendance_mot` : `amelioration` → `en amélioration` ; `stable` → `stable` ; `degradation` → `en dégradation`. `niveau_mot` : `elevee` → `élevée` ; `moyenne` → `moyenne` ; `faible` → `faible`. `effet_mot` : `renforce` → `favorable au client` ; `affaiblit` → `défavorable au client` ; `neutre` → `sans effet sur le verdict`. `role_mot` : `rapporteur` → `rapporteur` ; `rapporteur_general` → `rapporteur général` ; `rapporteur_avis` → `rapporteur pour avis` ; `gouvernement` → `gouvernement` ; `chef_de_file` → `chef de file` ; `president_commission` → `président de commission`. `position_mot` : `pour` → `pour la mesure` ; `contre` → `contre la mesure` ; `inconnue` → `position inconnue`.

Mise en forme : `date_fr` (`2025-11-19` → `19 novembre 2025`, le jour 1 s'écrit `1er`), `sans_point` (point final retiré), `avec_point` (point final ajouté s'il manque).

## Contrôle de la sortie

- Un seul paragraphe. Plusieurs lignes en mode llm : les joindre par une espace.
- Longueur : entre 110 et 190 mots acceptés ; hors de cette plage en mode llm, garder le texte et l'écrire dans `meta.limits`.
- `redigerVerifie` fait le contrôle des chiffres (3 tentatives, puis gabarit).
