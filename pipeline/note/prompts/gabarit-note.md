# Gabarit de secours : compte rendu (bloc 5, `note.json`)

Sert quand le modèle est indisponible ou après 3 rejets du vérificateur. Aucun appel au modèle. Sortie : `note.texte` avec `mode: "gabarit"`, `modele: null`.

Chaque bloc ` ```gabarit id=... ` est lisible par programme : on remplace chaque `{{variable}}` par sa valeur, rien d'autre. Le texte final est la suite des blocs retenus, dans l'ordre ci-dessous, séparés par une espace. C'est ce que fait `gabaritX3` de `pipeline/note/run.ts` (P8) : mêmes identifiants de blocs, mêmes variables.

Le compte rendu suit la mesure, pas le texte entier. L'étape est dite par la phrase de lecture (`lecture_1`) : le prompt `lecture.md` et les gabarits de lecture la nomment toujours. Le score est écrit avec son nom entier, « X % des sièges favorables à l'objectif », à distance du mot de situation. Le compte rendu n'annonce aucune issue : un vote à l'Assemblée ne clôt pas le dossier.

## Longueur : 150 mots au plus

Mots comptés comme P8 (`mots()` : découpe sur les espaces, les signes « : » et « ; » isolés comptent). Aucun titre n'est coupé : pour tenir, le gabarit n'injecte que les éléments courts.

- Gardé : le client, le verdict de l'objectif principal (situation, tendance, confiance, score avec son nom), la phrase de lecture (qui porte l'étape), la situation de chaque repli, la première nouveauté, les deux dates, le nombre de députés sur qui agir, les limites.
- Laissé de côté (présent ailleurs dans le tableau de bord) : le libellé de la mesure, le texte de l'objectif principal, la ligne « Étape » (déjà dans la lecture), la deuxième nouveauté, les comptes d'alliés et de perdus, les titres de la prochaine échéance et de la dernière occasion (seules leurs dates sont écrites).
- Mesures du 14 novembre 2026 : voir « Exemple rempli » en bas de fichier.
- La longueur dépend encore de `lecture_1`, de `ev_1` et de `limites`.

## Variables

| Variable | Source exacte | Mise en forme |
|---|---|---|
| `client` | `config.json` → `dossiers[].client` | telle quelle |
| `situation_mot` | `verdict.json` → `verdicts[]` → `situation` | `favorable` → `favorable` ; `incertaine` → `incertaine` ; `defavorable` → `défavorable` ; `insuffisant` → `indécidable (pas assez d'information)` |
| `score_1` | `verdict.json` → `verdicts[]` de rang 1 → `score` | pourcentage entier suivi de ` %` (`0.26` → `26 %`), comme `pct()` de P8 ; **variable à ajouter par P8**, voir plus bas |
| `tendance_mot` | `verdicts[]` de rang 1 → `tendance` | `amelioration` → `en amélioration` ; `stable` → `stable` ; `degradation` → `en dégradation` |
| `niveau_mot` | `verdicts[]` de rang 1 → `confiance.niveau` | `elevee` → `élevée` ; `moyenne` → `moyenne` ; `faible` → `faible` |
| `lecture_1` | `verdicts[]` de rang 1 → `lecture.texte` | `avec_point` |
| `objectif_n` | `config.json` → objectif de rang `n` > 1 → `texte` | `sans_point` |
| `ev_1` | `nouveautes.json` → `evenements[0].titre` (liste déjà triée par importance, événements postérieurs à `date_reference` écartés) | `sans_point` |
| `ev_1_date` | `evenements[0].date` | `date_fr` |
| `ev_1_effet` | `evenements[0].effet` | `renforce` → `favorable au client` ; `affaiblit` → `défavorable au client` ; `neutre` → `sans effet sur le verdict` |
| `echeance_1_date` | `suite.json` → `echeances[0].date` | `date_fr` ; `null` → `date non fixée` |
| `derniere_occasion_date` | `suite.json` → `derniere_occasion.date` | `date_fr` ; `null` → `date non fixée` |
| `n_actionnables` | `action.json` → `groupes.actionnables.length` | entier |
| `limites` | la phrase de limites retenue pour `note.limites` | `avec_point` |

P8 passe aussi `mesure_label`, `etape`, `objectif_1`, `ev_2`, `ev_2_date`, `ev_2_effet`, `echeance_1`, `derniere_occasion`, `n_allies` et `n_perdus` : le gabarit ne les utilise pas, pour tenir en 150 mots.

`score_1` n'est pas encore passée par `gabaritX3` (P8). Elle est nécessaire : `qa/croise.ts` exige que le compte rendu contienne le score de l'objectif principal. Tant que P8 ne la passe pas, `gabaritX3` signale « variable score_1 vide » et rend son gabarit intégré, qui contient le score : rien ne casse. Ligne à ajouter par P8 dans `vars` : `score_1: v1.score !== null ? pct(v1.score) : ""`. Quand le score est nul (situation `insuffisant`), P8 peut appeler le bloc `note.verdict.sans_score` à la place de `note.verdict`.

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
| 2 | `note.verdict` | toujours chez P8 aujourd'hui ; demande `score_1` |
| 2 | `note.verdict.sans_score` | à appeler quand le score est nul (situation `insuffisant`) ; P8 ne l'appelle pas encore |
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
Pour {{client}}.
```

```gabarit id=note.verdict
Verdict proposé : situation {{situation_mot}}, tendance {{tendance_mot}}, confiance {{niveau_mot}} ; {{score_1}} des sièges favorables à l'objectif principal. {{lecture_1}}
```

```gabarit id=note.verdict.sans_score
Verdict proposé sur l'objectif principal : situation {{situation_mot}}, tendance {{tendance_mot}}, confiance {{niveau_mot}}. {{lecture_1}}
```

```gabarit id=note.repli
Repli « {{objectif_n}} » : {{situation_mot}}.
```

```gabarit id=note.bouge.deux
Nouveauté : {{ev_1}} ({{ev_1_date}}, {{ev_1_effet}}).
```

```gabarit id=note.bouge.un
Nouveauté : {{ev_1}} ({{ev_1_date}}, {{ev_1_effet}}).
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
Députés sur qui agir : {{n_actionnables}}.
```

```gabarit id=note.limites
Limites : {{limites}}
```

```gabarit id=note.limites.defaut
Limites : compte rendu produit par gabarit, sans rédaction par le modèle, à relire avant envoi.
```

## Vocabulaire

- Le score du verdict se nomme « part des sièges favorables à l'objectif ». Le gabarit l'écrit « X % des sièges favorables à l'objectif principal », après la tendance et la confiance, jamais seul et jamais collé au mot de situation. Ce n'est pas une probabilité.
- Le gabarit ne cite aucune valeur Orcet. S'il fallait en citer une : « moyenne des probabilités individuelles de voter pour » sur un amendement, jamais la probabilité d'adoption de l'amendement, de l'article ou de la loi.
- La phrase de lecture parle de « la mesure » et nomme l'étape. Aucun bloc ne dit qu'un vote à l'Assemblée clôt le dossier.
- Contrôles de P8 sur le compte rendu (`interdits` de `pipeline/note/run.ts`) : pas de « probabilité », pas de « chances », tout pourcentage suivi de « des sièges favorables » ou de « de votes pour ». Le texte fixe du gabarit les respecte.

## Liste autorisée et champs de sortie

- Avec `redigerVerifie` de `pipeline/lib/llm.ts` : passer le texte rempli en troisième argument (`gabarit`). `redigerVerifie` rend `chiffres_utilises`, `verifie`, `mode: "gabarit"` et `modele: null`. La liste autorisée de l'appel doit contenir les nombres des variables injectées, construits comme suit.
- `chiffres_utilises` : pour chaque variable injectée. Entier (`n_actionnables`) : `String(valeur)`. Score (`score_1`) : `String(score)` (`"0.26"` autorise « 26 % »). Date : la date ISO telle quelle. Texte (toutes les autres, `lecture_1` et `limites` compris) : chaque nombre renvoyé par `extraireJetons(normaliser(valeur))` et `extraireMotsNombres(normaliser(valeur))` de `pipeline/lib/verif.ts`, écrit `String(valeur)`. Liste dédoublonnée.
- `verifie` : `verifierChiffres(texte, chiffres_utilises).ok`. Le texte fixe des gabarits ne contient aucun nombre.
- `mode` : `"gabarit"`. `modele` : `null`. `client` et `objectifs` : recopiés depuis `config.json`. `sources` : les `meta.sources` des fichiers lus.

## Prompt associé (`note.md`)

- Format : le prompt système, puis une ligne `--- user ---`, puis le message utilisateur à variables. C'est le format lu par `promptNote` de `pipeline/note/run.ts`.
- Variables du message utilisateur (celles de `promptNote`) : `client`, `mesure`, `objectif`, `replis`, `date_reference`, `faits` (une ligne `- ...` par fait vérifié), `limites`. `chiffres` existe aussi et n'est pas utilisée : `redigerVerifie` ajoute lui-même la liste « Chiffres autorisés ». Une variable vide donne une ligne vide : le prompt le prévoit pour `limites`.
- Liste autorisée : celle que construit `pipeline/note/run.ts` (nombres des faits, dates, nombres du gabarit).
- Le prompt demande 150 mots au plus, impose « X % des sièges favorables à l'objectif » pour le pourcentage du verdict et « X % de votes pour » pour une valeur Orcet, et interdit les mots refusés par les contrôles de P8.

## Exemple rempli

Rempli mécaniquement le 14 novembre 2026, sans modèle, par un script qui suit `gabaritX3` de P8 et lui ajoute `score_1`.

`data/petits-colis`, 136 mots :

Pour Alibaba France. Verdict proposé : situation défavorable, tendance stable, confiance moyenne ; 26 % des sièges favorables à l'objectif principal. À l'Assemblée nationale, en première lecture, la situation est défavorable car la mesure est portée par le gouvernement et soutenue par 7 groupes (338 sièges), face à un seul groupe RN (121 sièges) qui a déposé l'amendement n° 806 pour supprimer l'article 22. Repli « Réduire son montant » : incertaine. Repli « Repousser son application » : défavorable. Nouveauté : Amendement n° 974 (RN) rejeté : Supprime l'article 22 (18 novembre 2025, défavorable au client). Prochaine date : 18 novembre 2025. Dernière occasion d'agir : 19 novembre 2025. Députés sur qui agir : 15. Limites : Rejoué à la date de référence du 18 novembre 2025 ; amendements sans prédiction Orcet exclus des comptes.

`chiffres_utilises` : `["7", "338", "121", "806", "22", "974", "0.26", "2025-11-18", "2025-11-19", "15", "18", "2025"]`

Longueurs mesurées (mots comptés comme P8) :

| Dossier | Avec la lecture de `verdict.json` | Avec la lecture en gabarit (aucun modèle) |
|---|---|---|
| `data/petits-colis` | 136 | 137 |
| `data/plf2027-holdings` | 125 | 147 |
| fixture `petits-colis` | 110 | 132 |
| fixture `plf2027-holdings` | 116 | 141 |

Tant que P8 ne passe pas `score_1`, `bun pipeline/note/run.ts` sans clé rend son gabarit intégré : 153 mots sur `data/petits-colis`, 146 sur `data/plf2027-holdings`.

