# Gabarit de secours : compte rendu (bloc 5, `note.json`)

Sert quand le modèle est indisponible ou après 3 rejets du vérificateur. Aucun appel au modèle. Sortie : `note.texte` avec `mode: "gabarit"`, `modele: null`.

Chaque bloc ` ```gabarit id=... ` est lisible par programme : on remplace chaque `{{variable}}` par sa valeur, rien d'autre. Le texte final est la suite des blocs retenus, dans l'ordre ci-dessous, séparés par une espace. C'est ce que fait `gabaritX3` de `pipeline/note/run.ts` (P8) : mêmes identifiants de blocs, mêmes variables.

Le compte rendu suit la mesure, pas le texte entier. Il nomme l'étape. Il ne cite aucun score et n'annonce aucune issue : un vote à l'Assemblée n'est pas l'issue finale du dossier.

## Longueur : 150 mots au plus

Mots comptés comme P8 (`mots()` : découpe sur les espaces, les signes « : » et « ; » isolés comptent). Aucun titre n'est coupé : pour tenir, le gabarit n'injecte que les éléments courts.

- Gardé : le client, l'étape, le verdict de l'objectif principal (situation, tendance, confiance), la phrase de lecture, la situation de chaque repli, le premier fait nouveau, les deux dates, les trois comptes de députés, les limites.
- Laissé de côté (présent ailleurs dans le tableau de bord) : le libellé de la mesure, le texte de l'objectif principal, le deuxième fait nouveau, les titres de la prochaine échéance et de la dernière occasion (seules leurs dates sont écrites).
- Mesuré le 14 novembre 2026 avec `bun pipeline/note/run.ts` sans clé : 137 mots sur `data/petits-colis`, 137 sur `data/plf2027-holdings`, 125 et 136 sur les fixtures des mêmes dossiers.
- La longueur dépend encore de `lecture_1`, de `etape`, de `ev_1` et de `limites`. Marge mesurée : 13 mots au moins.

## Variables

| Variable | Source exacte | Mise en forme |
|---|---|---|
| `client` | `config.json` → `dossiers[].client` | telle quelle |
| `etape` | `etat.json` → `etape` | `sans_point` |
| `situation_mot` | `verdict.json` → `verdicts[]` → `situation` | `favorable` → `favorable` ; `incertaine` → `incertaine` ; `defavorable` → `défavorable` ; `insuffisant` → `indécidable (pas assez d'information)` |
| `tendance_mot` | `verdicts[]` de rang 1 → `tendance` | `amelioration` → `en amélioration` ; `stable` → `stable` ; `degradation` → `en dégradation` |
| `niveau_mot` | `verdicts[]` de rang 1 → `confiance.niveau` | `elevee` → `élevée` ; `moyenne` → `moyenne` ; `faible` → `faible` |
| `lecture_1` | `verdicts[]` de rang 1 → `lecture.texte` | `avec_point` |
| `objectif_n` | `config.json` → objectif de rang `n` > 1 → `texte` | `sans_point` |
| `ev_1` | `nouveautes.json` → `evenements[0].titre` (liste déjà triée par importance, événements postérieurs à `date_reference` écartés) | `sans_point` |
| `ev_1_date` | `evenements[0].date` | `date_fr` |
| `ev_1_effet` | `evenements[0].effet` | `renforce` → `favorable au client` ; `affaiblit` → `défavorable au client` ; `neutre` → `sans effet sur le verdict` |
| `echeance_1_date` | `suite.json` → `echeances[0].date` | `date_fr` ; `null` → `date non fixée` |
| `derniere_occasion_date` | `suite.json` → `derniere_occasion.date` | `date_fr` ; `null` → `date non fixée` |
| `n_actionnables`, `n_allies`, `n_perdus` | `action.json` → `groupes.actionnables.length`, `groupes.allies.length`, `groupes.perdus.length` | entiers |
| `limites` | la phrase de limites retenue pour `note.limites` | `avec_point` |

P8 passe aussi `mesure_label`, `objectif_1`, `ev_2`, `ev_2_date`, `ev_2_effet`, `echeance_1` et `derniere_occasion` : le gabarit ne les utilise pas, pour tenir en 150 mots.

Une variable utilisée et vide fait échouer le gabarit chez P8 (repli sur son gabarit intégré). Aucun bloc ne doit être vide.

## Mise en forme

- `date_fr` : `2025-11-19` → `19 novembre 2025` ; le jour 1 s'écrit `1er` ; pas de zéro devant le jour.
- `sans_point` : espaces de bord retirés, point final retiré.
- `avec_point` : espaces de bord retirés, un point final ajouté s'il manque.
- Entre deux variables il y a toujours un mot ou une ponctuation, jamais une simple espace.

## Blocs, dans l'ordre

| Ordre | Bloc | Condition |
|---|---|---|
| 1 | `note.entete` | toujours |
| 2 | `note.verdict` | toujours |
| 3 | `note.repli` | une fois par verdict de `objectif_rang` > 1, par rang croissant |
| 4 | `note.bouge.deux` | `evenements` a au moins 2 éléments |
| 4 | `note.bouge.un` | `evenements` a 1 élément |
| 4 | `note.bouge.rien` | `evenements` est vide |
| 5 | `note.dates.echeance` | `echeances` non vide, sauf si `derniere_occasion` est non nulle et porte la même `date` (non nulle) que `echeances[0]` |
| 6 | `note.dates.derniere` | `derniere_occasion` non nulle |
| 7 | `note.action` | toujours |
| 8 | `note.limites` | `limites` non vide |
| 8 | `note.limites.defaut` | `limites` vide |

```gabarit id=note.entete
Pour {{client}}. Étape : {{etape}}.
```

```gabarit id=note.verdict
Verdict proposé sur l'objectif principal : situation {{situation_mot}}, tendance {{tendance_mot}}, confiance {{niveau_mot}}. {{lecture_1}}
```

```gabarit id=note.repli
Repli « {{objectif_n}} » : {{situation_mot}}.
```

```gabarit id=note.bouge.deux
Ce qui a bougé : {{ev_1}} ({{ev_1_date}}, {{ev_1_effet}}).
```

```gabarit id=note.bouge.un
Ce qui a bougé : {{ev_1}} ({{ev_1_date}}, {{ev_1_effet}}).
```

```gabarit id=note.bouge.rien
Rien de nouveau sur la mesure depuis la dernière analyse.
```

```gabarit id=note.dates.echeance
Prochaine date : {{echeance_1_date}}.
```

```gabarit id=note.dates.derniere
Dernière occasion d'agir : {{derniere_occasion_date}}.
```

```gabarit id=note.action
Députés sur qui agir : {{n_actionnables}}, alliés à protéger : {{n_allies}}, perdus : {{n_perdus}}.
```

```gabarit id=note.limites
Limites : {{limites}}
```

```gabarit id=note.limites.defaut
Limites : compte rendu produit par gabarit, sans rédaction par le modèle, à relire avant envoi.
```

## Vocabulaire

- Le gabarit ne cite pas le score du verdict. S'il fallait le citer, il se nomme « part des sièges favorables à l'objectif » et s'écrit « X % des sièges favorables à l'objectif ». Ce n'est pas une probabilité, et il ne s'écrit jamais seul à côté de la situation.
- Le gabarit ne cite aucune valeur Orcet. S'il fallait en citer une : « moyenne des probabilités individuelles de voter pour » sur un amendement, jamais la probabilité d'adoption de l'amendement, de l'article ou de la loi.
- « Étape » est l'étape d'examen. La phrase de lecture parle de « la mesure ». Aucun bloc ne dit qu'un vote à l'Assemblée clôt le dossier.

## Liste autorisée et champs de sortie

- Avec `redigerVerifie` de `pipeline/lib/llm.ts` : passer le texte rempli en troisième argument (`gabarit`). `redigerVerifie` rend `chiffres_utilises`, `verifie`, `mode: "gabarit"` et `modele: null`. La liste autorisée de l'appel doit contenir les nombres des variables injectées, construits comme suit.
- `chiffres_utilises` : pour chaque variable injectée. Entier (`n_actionnables`, `n_allies`, `n_perdus`) : `String(valeur)`. Date : la date ISO telle quelle. Texte (toutes les autres, `lecture_1` et `limites` compris) : chaque nombre renvoyé par `extraireJetons(normaliser(valeur))` et `extraireMotsNombres(normaliser(valeur))` de `pipeline/lib/verif.ts`, écrit `String(valeur)`. Liste dédoublonnée.
- `verifie` : `verifierChiffres(texte, chiffres_utilises).ok`. Le texte fixe des gabarits ne contient aucun nombre.
- `mode` : `"gabarit"`. `modele` : `null`. `client` et `objectifs` : recopiés depuis `config.json`. `sources` : les `meta.sources` des fichiers lus.

## Prompt associé (`note.md`)

- Format : le prompt système, puis une ligne `--- user ---`, puis le message utilisateur à variables. C'est le format lu par `promptNote` de `pipeline/note/run.ts`.
- Variables du message utilisateur (celles de `promptNote`) : `client`, `mesure`, `objectif`, `replis`, `date_reference`, `faits` (une ligne `- ...` par fait vérifié), `limites`. `chiffres` existe aussi et n'est pas utilisée : `redigerVerifie` ajoute lui-même la liste « Chiffres autorisés ». Une variable vide donne une ligne vide : le prompt le prévoit pour `limites`.
- Liste autorisée : celle que construit `pipeline/note/run.ts` (nombres des faits, dates, nombres du gabarit).
- Le prompt demande 150 mots au plus et impose « X % des sièges favorables à l'objectif » pour le pourcentage du verdict, quel que soit le mot employé par le fait.

## Exemple rempli (`data/petits-colis`, 14 novembre 2026)

Texte rendu par `bun pipeline/note/run.ts --source data` sans clé (137 mots) :

Pour Alibaba France. Étape : Première lecture, Assemblée nationale, séance publique, première partie. Verdict proposé sur l'objectif principal : situation défavorable, tendance stable, confiance moyenne. À l'Assemblée nationale, en première lecture, la situation est défavorable car la mesure est portée par le gouvernement et soutenue par 7 groupes, face à un seul groupe contre. Repli « Réduire son montant » : favorable. Repli « Repousser son application » : incertaine. Ce qui a bougé : Amendement n° 806 (RN) déposé : Supprime l'article 22 (18 novembre 2025, favorable au client). Prochaine date : 18 novembre 2025. Dernière occasion d'agir : 19 novembre 2025. Députés sur qui agir : 15, alliés à protéger : 13, perdus : 15. Limites : Rejoué à la date de référence du 18 novembre 2025 ; amendements sans prédiction Orcet exclus des comptes.

`chiffres_utilises` (tel que rendu par P8) : `["7", "22", "2025-11-18", "18", "2025", "2025-11-19", "19", "806", "15", "13"]`
