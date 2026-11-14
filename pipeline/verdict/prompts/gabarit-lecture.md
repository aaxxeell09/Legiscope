# Gabarit de secours : lecture du verdict (une phrase par objectif)

Sert quand le modèle est indisponible ou après 3 rejets du vérificateur. Aucun appel au modèle. Sortie : `verdicts[].lecture` avec `mode: "gabarit"`, `modele: null`.

Chaque bloc ` ```gabarit id=... ` est lisible par programme : on remplace chaque `{{variable}}` par sa valeur, rien d'autre. C'est ce que fait `construireVerdict` de `pipeline/pivots/verdict.ts` (P3) : mêmes identifiants de blocs, mêmes variables.

La phrase parle toujours de « la mesure » et nomme l'étape (« À ce stade »). Elle ne dit jamais que la loi va passer, ne cite aucun score, n'annonce aucune issue, et ne présente pas un vote à l'Assemblée comme l'issue finale du dossier.

## Vocabulaire

- Le gabarit ne cite pas le score. S'il fallait le citer, il se nomme « part des sièges favorables à l'objectif » et s'écrit « X % des sièges favorables à l'objectif ». Ce n'est pas une probabilité, et il ne s'écrit jamais seul à côté de « favorable », « incertaine » ou « défavorable ».
- Une valeur Orcet citée dans un `detail` est la « moyenne des probabilités individuelles de voter pour » sur un amendement, jamais la probabilité d'adoption de l'amendement, de l'article ou de la loi. Le gabarit n'injecte que les `titre`, pas les `detail`.
- État de la mesure et état du texte : le gabarit décrit la mesure à l'étape de `etat.json`. Il n'injecte pas `texte_etat`.

## Variables

Ce sont les variables que P3 passe aujourd'hui.

| Variable | Source exacte | Mise en forme |
|---|---|---|
| `etape` | `etat.json` → `etape` | `sans_point` |
| `situation_mot` | `verdicts[i].situation` | `favorable` → `favorable` ; `incertaine` → `incertaine` ; `defavorable` → `défavorable` (`insuffisant` a ses propres gabarits) |
| `favorable_1` | `verdicts[i].favorable[0].titre` | `sans_point` |
| `bloquant_1` | `verdicts[i].bloquant[0].titre` | `sans_point` |
| `inconnu_1` | `verdicts[i].confiance.inconnu[0]` | `sans_point` |
| `n_pour` | `texte.json` → `positions[]` : nombre de groupes dont `position` = `pour` | entier |
| `n_contre` | `texte.json` → `positions[]` : nombre de groupes dont `position` = `contre` | entier |
| `n_autres` | `n_total` moins `n_pour` moins `n_contre` (groupes `divise`, `abstention` ou `null`) | entier |
| `n_total` | `texte.json` → `positions.length` | entier |
| position du gouvernement | `groupes-action.json` (ou `action.json`) → `decideurs[]` dont `role` = `gouvernement` → `position` | sert au choix du gabarit, n'est pas injectée |
| `position_cible` | `config.json` → `dossiers[].objectifs[]` de `rang` 1 → `position_cible` | sert au choix du gabarit, n'est pas injectée |

« pour » et « contre » qualifient la mesure, pas l'objectif du client.

## Mise en forme

- `sans_point` : espaces de bord retirés, point final retiré.
- Entre deux variables il y a toujours un mot ou une ponctuation, jamais une simple espace.

## Choix du gabarit

On prend le premier cas vrai.

| Ordre | Condition | Gabarit |
|---|---|---|
| 1 | `situation` = `insuffisant` et `confiance.inconnu` non vide | `lecture.insuffisant` |
| 2 | `situation` = `insuffisant` | `lecture.insuffisant.nu` |
| 3 | `objectif_rang` = 1, position du gouvernement = `pour`, `n_pour` > `n_total` / 2, et la situation est celle que ce rapport de forces explique (`defavorable` si `position_cible` = `contre`, `favorable` si `position_cible` = `pour`) | `lecture.portage.pour` |
| 4 | `objectif_rang` = 1, position du gouvernement = `contre`, `n_contre` > `n_total` / 2, et la situation est celle que ce rapport de forces explique (`favorable` si `position_cible` = `contre`, `defavorable` si `position_cible` = `pour`) | `lecture.portage.contre` |
| 5 | `situation` = `favorable`, `favorable` et `bloquant` non vides | `lecture.favorable.reserve` |
| 6 | `situation` = `favorable`, `favorable` non vide | `lecture.favorable` |
| 7 | `situation` = `defavorable`, `bloquant` et `favorable` non vides | `lecture.defavorable.appui` |
| 8 | `situation` = `defavorable`, `bloquant` non vide | `lecture.defavorable` |
| 9 | `situation` = `incertaine`, `favorable` et `bloquant` non vides | `lecture.incertaine` |
| 10 | sinon | `lecture.sans_raison` |

Les cas 3 et 4 ne valent que pour l'objectif principal : les positions des groupes portent sur la mesure, pas sur son montant ni sur sa date d'application. Ils ne valent que si le gouvernement et plus de la moitié des groupes vont dans le même sens : sinon ce sont les raisons du verdict (`favorable`, `bloquant`) qui expliquent la situation.

```gabarit id=lecture.insuffisant
À ce stade (« {{etape}} »), pas assez d'information pour conclure sur cet objectif : {{inconnu_1}}.
```

```gabarit id=lecture.insuffisant.nu
À ce stade (« {{etape}} »), pas assez d'information pour conclure sur cet objectif.
```

```gabarit id=lecture.portage.pour
À ce stade (« {{etape}} »), la mesure est portée par le gouvernement et soutenue par {{n_pour}} groupes sur {{n_total}} (contre : {{n_contre}}, divisés ou sans position : {{n_autres}}) : situation {{situation_mot}} pour cet objectif.
```

```gabarit id=lecture.portage.contre
À ce stade (« {{etape}} »), la mesure se heurte à l'opposition du gouvernement et de {{n_contre}} groupes sur {{n_total}} (pour : {{n_pour}}, divisés ou sans position : {{n_autres}}) : situation {{situation_mot}} pour cet objectif.
```

```gabarit id=lecture.favorable.reserve
À ce stade (« {{etape}} »), la situation de la mesure est favorable pour cet objectif : {{favorable_1}} ; point de blocage : {{bloquant_1}}.
```

```gabarit id=lecture.favorable
À ce stade (« {{etape}} »), la situation de la mesure est favorable pour cet objectif : {{favorable_1}}.
```

```gabarit id=lecture.defavorable.appui
À ce stade (« {{etape}} »), la situation de la mesure est défavorable pour cet objectif : {{bloquant_1}} ; point d'appui : {{favorable_1}}.
```

```gabarit id=lecture.defavorable
À ce stade (« {{etape}} »), la situation de la mesure est défavorable pour cet objectif : {{bloquant_1}}.
```

```gabarit id=lecture.incertaine
À ce stade (« {{etape}} »), la situation de la mesure reste incertaine pour cet objectif : {{favorable_1}} ; en face : {{bloquant_1}}.
```

```gabarit id=lecture.sans_raison
À ce stade (« {{etape}} »), la situation de la mesure est {{situation_mot}} pour cet objectif ; aucune raison détaillée n'est disponible à ce jour.
```

## Liste autorisée et champs de sortie

- Avec `redigerVerifie` de `pipeline/lib/llm.ts` : passer la phrase remplie en troisième argument (`gabarit`). `redigerVerifie` rend `chiffres_utilises`, `verifie`, `mode: "gabarit"` et `modele: null`. La liste autorisée de l'appel doit contenir les nombres des variables injectées, construits comme suit.
- `chiffres_utilises` : pour chaque variable injectée. Entier (`n_pour`, `n_contre`, `n_autres`, `n_total`) : `String(valeur)`. Texte (`etape`, `favorable_1`, `bloquant_1`, `inconnu_1`) : chaque nombre renvoyé par `extraireJetons(normaliser(valeur))` et `extraireMotsNombres(normaliser(valeur))` de `pipeline/lib/verif.ts`, écrit `String(valeur)`. Liste dédoublonnée.
- `verifie` : `verifierChiffres(texte, chiffres_utilises).ok`. Le texte fixe des gabarits ne contient aucun nombre.
- `mode` : `"gabarit"`. `modele` : `null`.

## Prompt associé (`lecture.md`)

- Format : texte brut, sans variable. Le fichier entier est le prompt système. Le message utilisateur est `Entrée (JSON) :` suivi de l'entrée de l'objectif lu. Un appel par objectif. C'est ce que fait P3.
- Entrée passée par P3 aujourd'hui : `date_jour`, `client`, `mesure` (`config.json` → `mesure.label`), `etape` (`etat.json` → `etape`), `objectif` (`texte`, `type` : `principal` ou `repli`, `position_cible`), `situation`, `tendance`, `confiance` (`niveau`, `etabli`, `inconnu`), `favorable` et `bloquant` (`titre`, `detail`), `cause_du_changement` (le titre de l'événement ou `null`), `rapport_de_forces` (`gouvernement` : `pour`, `contre` ou `inconnue` ; `groupes_pour`, `groupes_contre`, `groupes_divises_ou_sans_position`, `groupes_total` ; `null` pour un repli).
- Champs que le prompt sait lire si P3 les ajoute : `score` avec `score_libelle` (écrit « X % des sièges favorables à l'objectif », jamais seul), `texte_etat` (`statut`, `libelle`, `date` : état du texte, dit à part de l'état de la mesure).
- Une valeur Orcet peut figurer dans un `detail` : le prompt impose « moyenne des probabilités individuelles de voter pour ».
- Liste autorisée : les nombres de l'entrée et ceux de la phrase de gabarit (P3 fait l'union).

## Exemples remplis

Remplis mécaniquement le 14 novembre 2026, sans modèle.

- `data/petits-colis`, objectif 1 (`lecture.portage.pour`) : À ce stade (« Première lecture, Assemblée nationale, séance publique, première partie »), la mesure est portée par le gouvernement et soutenue par 7 groupes sur 11 (contre : 1, divisés ou sans position : 3) : situation défavorable pour cet objectif. `chiffres_utilises` : `["7", "11", "1", "3"]`
- `data/petits-colis`, objectif 3 (`lecture.incertaine`) : À ce stade (« Première lecture, Assemblée nationale, séance publique, première partie »), la situation de la mesure reste incertaine pour cet objectif : EPR, RN dans le sens de cet objectif ; en face : Mesure portée par le gouvernement. `chiffres_utilises` : `[]`
- `data/plf2027-holdings`, objectif 1 (`lecture.favorable.reserve`) : À ce stade (« Première lecture : rejeté par l'Assemblée le 2026-11-04 ; Sénat, première lecture »), la situation de la mesure est favorable pour cet objectif : La taxe ne figure pas dans le texte du gouvernement ; point de blocage : 4 groupe(s) pour la mesure : LFI-NFP, SOC, ECOS, GDR. `chiffres_utilises` : `["2026", "11", "4"]`
- fixture `petits-colis`, objectif 2 (`lecture.insuffisant`) : À ce stade (« Première lecture, Assemblée nationale, séance publique, première partie »), pas assez d'information pour conclure sur cet objectif : Aucun amendement de réduction du montant déposé. `chiffres_utilises` : `[]`
