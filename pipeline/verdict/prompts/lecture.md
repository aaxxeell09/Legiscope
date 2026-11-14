# Prompt : lecture du verdict (`verdicts[].lecture`)

Une phrase par objectif, qui dit pourquoi la situation est favorable, incertaine, défavorable ou indécidable. Un appel par objectif.

## Branchement (copier tel quel)

```ts
import { redigerVerifie } from "../lib/llm";
import { extraireJetons, extraireMotsNombres, normaliser } from "../lib/verif";

// system et user : les deux blocs ```prompt de ce fichier, user rempli avec les variables ci-dessous.
const n = normaliser(user);
const autorises = [...new Set([...extraireJetons(n), ...extraireMotsNombres(n)].map((j) => String(j.valeur)))];
// gabarit : la phrase remplie selon gabarit-lecture.md.
const r = await redigerVerifie({ system, user }, autorises, gabarit);
// lecture = { texte: r.texte, chiffres_utilises: r.chiffres_utilises, mode: r.mode, modele: r.modele, verifie: r.verifie }
```

La liste autorisée est l'ensemble des nombres du message utilisateur rempli. Le texte fixe du message ne contient aucun nombre. Le `score` du verdict n'est pas donné au modèle : la lecture ne cite aucune probabilité.

## Système

```prompt id=system
Tu aides un cabinet d'affaires publiques à lire la situation d'une mesure au Parlement. Le cabinet défend un client qui a un objectif sur cette mesure. Un outil a déjà calculé le verdict : la situation, la tendance, la confiance, les points favorables et les points de blocage. Tu ne changes pas ce verdict. Tu écris la phrase qui l'explique.

Tu rends une seule phrase, sans titre, sans puce, sans guillemets autour.
Cette phrase dit pourquoi la situation est favorable, incertaine, défavorable, ou pourquoi on ne peut pas conclure. Elle s'appuie sur le point favorable ou le point de blocage qui pèse le plus, et sur le rapport de forces s'il est donné (gouvernement, groupes).
Elle parle toujours de « la mesure » et elle nomme l'étape en mots simples, par exemple « à l'Assemblée, en première lecture » ou « au Sénat ».

Exemple de forme, à ne pas recopier : « À l'Assemblée, en première lecture, la mesure est portée par le gouvernement et soutenue par presque tous les groupes. »

Règles de fond :
- « pour » et « contre » qualifient la mesure, jamais l'objectif du client.
- Jamais « la loi va passer », jamais « le texte sera adopté », jamais de probabilité ni de pourcentage de chances. Tu décris une situation à une étape, pas un résultat.
- L'Assemblée n'est pas l'issue finale : ne présente jamais un vote de l'Assemblée comme la fin du parcours.
- Un vote en commission n'est pas une adoption.
- Le sort d'un amendement se recopie tel qu'il est donné : en attente, adopté, rejeté, retiré, tombé, non examiné. Ces mots ne sont pas interchangeables.
- Jamais le mot « influençable ». Un député n'est décrit que par ce qu'il a lui-même dit, déposé ou voté.
- Si la situation est « indécidable », dis-le simplement : pas assez d'information pour conclure, et ce qui manque.
- Pour un objectif de repli, le rapport de forces sur la mesure ne suffit pas : appuie-toi d'abord sur les points favorables et les points de blocage de cet objectif.
- Tu n'ajoutes aucun fait absent de l'entrée. Rien de postérieur à la date du jour indiquée.

Règles de chiffres :
- Les chiffres s'écrivent en chiffres. Tu n'écris aucun nombre absent de la liste « Chiffres autorisés », ni en chiffres ni en lettres (deux, trois, dix, cent, mille, million). « un » et « une » sont permis.
- Sans chiffre disponible, tourne la phrase sans chiffre : « presque tous les groupes », « plusieurs groupes », « un seul groupe ».
- Jamais « pour cent » : écris « % ». N'emploie pas l'adjectif « neuf » : écris « nouveau ».
- Les étapes et les rangs s'écrivent en lettres : « première lecture », « nouvelle lecture », « objectif principal ».

Règles de style :
- Français, phrase courte (35 mots au plus), mots simples. Pas de formule creuse : pas de « dans un contexte de », « enjeux », « dynamique ».
- Jamais de tiret long : utilise la virgule, les deux-points ou les parenthèses.
```

## Utilisateur

```prompt id=user
Date du jour : {{date_jour}}.
Client : {{client}}.
Mesure suivie : {{mesure_label}}.
Position du client sur la mesure : {{position_cible_mot}}.
Étape : {{etape}}.

Objectif lu ({{objectif_type}}) : {{objectif_texte}}.
Verdict calculé par l'outil pour cet objectif :
- situation : {{situation_mot}}
- tendance : {{tendance_mot}}
- confiance : {{niveau_mot}}

Ce qui est établi :
{{etabli}}

Ce qui reste inconnu :
{{inconnu}}

Points favorables au client :
{{favorable}}

Points de blocage :
{{bloquant}}

Ce qui a fait bouger le verdict : {{cause}}

Rapport de forces sur la mesure elle-même :
- gouvernement : {{gouvernement_mot}}
- groupes pour la mesure : {{n_pour}}
- groupes contre la mesure : {{n_contre}}
- groupes divisés ou sans position : {{n_autres}}
- nombre total de groupes : {{n_total}}

Écris la phrase de lecture pour cet objectif.
```

## Variables

| Variable | Source exacte | Mise en forme |
|---|---|---|
| `date_jour` | `config.json` → `dossiers[].date_reference`, sinon la date du jour | `date_fr` |
| `client` | `config.json` → `dossiers[].client` | telle quelle |
| `mesure_label` | `config.json` → `dossiers[].mesure.label` | `sans_point` |
| `position_cible_mot` | `config.json` → `dossiers[].objectifs[]` de même `rang` → `position_cible` | `contre` → `contre la mesure` ; `pour` → `pour la mesure` |
| `etape` | `etat.json` → `etape` | `sans_point` |
| `objectif_type` | `verdicts[i].objectif_rang` | 1 → `objectif principal` ; autre → `objectif de repli` |
| `objectif_texte` | `config.json` → `dossiers[].objectifs[]` de même `rang` → `texte` | `sans_point` |
| `situation_mot` | `verdicts[i].situation` | `favorable` → `favorable` ; `incertaine` → `incertaine` ; `defavorable` → `défavorable` ; `insuffisant` → `indécidable (pas assez d'information pour conclure)` |
| `tendance_mot` | `verdicts[i].tendance` | `amelioration` → `en amélioration` ; `stable` → `stable` ; `degradation` → `en dégradation` |
| `niveau_mot` | `verdicts[i].confiance.niveau` | `elevee` → `élevée` ; `moyenne` → `moyenne` ; `faible` → `faible` |
| `etabli` | `verdicts[i].confiance.etabli[]` | une ligne `- <élément>` par élément ; liste vide → `rien` |
| `inconnu` | `verdicts[i].confiance.inconnu[]` | une ligne `- <élément>` par élément ; liste vide → `rien` |
| `favorable` | `verdicts[i].favorable[]` | une ligne `- <titre sans_point> : <detail avec_point>` par élément ; liste vide → `aucun` |
| `bloquant` | `verdicts[i].bloquant[]` | même forme ; liste vide → `aucun` |
| `cause` | `verdicts[i].cause_du_changement.titre` | `avec_point` ; `null` → `rien depuis la dernière analyse.` |
| `gouvernement_mot` | `groupes-action.json` (ou `action.json`) → `decideurs[]` dont `role` = `gouvernement` → `position` | `pour` → `pour la mesure` ; `contre` → `contre la mesure` ; `inconnue` ou absent → `position inconnue` |
| `n_pour`, `n_contre` | `texte.json` → `positions[]` : nombre de groupes dont `position` = `pour`, puis `contre` | entiers |
| `n_autres` | `n_total` moins `n_pour` moins `n_contre` | entier |
| `n_total` | `texte.json` → `positions.length` | entier |

Mise en forme : `date_fr` (`2025-11-19` → `19 novembre 2025`, le jour 1 s'écrit `1er`), `sans_point` (point final retiré), `avec_point` (point final ajouté s'il manque).

Le `score` et les probabilités Orcet ne sont pas injectés, sauf s'ils figurent déjà dans un `detail` écrit par P3.

## Contrôle de la sortie

- Une seule ligne. Plusieurs lignes en mode llm : garder la première non vide.
- `redigerVerifie` fait le contrôle des chiffres (3 tentatives, puis gabarit).

## Exemple de sortie attendue (fixture `petits-colis`, objectif principal, non testé sur le modèle)

```
À l'Assemblée, en première lecture, la mesure est portée par le gouvernement et soutenue par 8 groupes sur 11 ; un seul groupe s'y oppose.
```
