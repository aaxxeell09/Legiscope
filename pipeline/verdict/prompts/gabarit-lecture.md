# Gabarit de secours : lecture du verdict (une phrase par objectif)

Sert quand le modèle est indisponible ou après 3 rejets du vérificateur. Aucun appel au modèle. Sortie : `verdicts[].lecture` avec `mode: "gabarit"`, `modele: null`.

Chaque bloc ` ```gabarit id=... ` est lisible par programme : on remplace chaque `{{variable}}` par sa valeur, rien d'autre.

La phrase parle toujours de « la mesure » et nomme l'étape. Elle ne dit jamais que la loi va passer, ne donne aucune probabilité, et ne présente pas l'Assemblée comme l'issue finale.

## Variables

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
À l'étape « {{etape}} », pas assez d'information pour conclure sur cet objectif : {{inconnu_1}}.
```

```gabarit id=lecture.insuffisant.nu
À l'étape « {{etape}} », pas assez d'information pour conclure sur cet objectif.
```

```gabarit id=lecture.portage.pour
À l'étape « {{etape}} », la mesure est portée par le gouvernement et soutenue par {{n_pour}} groupes sur {{n_total}} (contre : {{n_contre}}, divisés ou sans position : {{n_autres}}) : situation {{situation_mot}} pour cet objectif.
```

```gabarit id=lecture.portage.contre
À l'étape « {{etape}} », la mesure se heurte à l'opposition du gouvernement et de {{n_contre}} groupes sur {{n_total}} (pour : {{n_pour}}, divisés ou sans position : {{n_autres}}) : situation {{situation_mot}} pour cet objectif.
```

```gabarit id=lecture.favorable.reserve
À l'étape « {{etape}} », la situation de la mesure est favorable pour cet objectif : {{favorable_1}} ; point de blocage : {{bloquant_1}}.
```

```gabarit id=lecture.favorable
À l'étape « {{etape}} », la situation de la mesure est favorable pour cet objectif : {{favorable_1}}.
```

```gabarit id=lecture.defavorable.appui
À l'étape « {{etape}} », la situation de la mesure est défavorable pour cet objectif : {{bloquant_1}} ; point d'appui : {{favorable_1}}.
```

```gabarit id=lecture.defavorable
À l'étape « {{etape}} », la situation de la mesure est défavorable pour cet objectif : {{bloquant_1}}.
```

```gabarit id=lecture.incertaine
À l'étape « {{etape}} », la situation de la mesure reste incertaine pour cet objectif : {{favorable_1}} ; en face : {{bloquant_1}}.
```

```gabarit id=lecture.sans_raison
À l'étape « {{etape}} », la situation de la mesure est {{situation_mot}} pour cet objectif ; aucune raison détaillée n'est disponible à ce jour.
```

## Liste autorisée et champs de sortie

- Cas normal, avec `redigerVerifie` de `pipeline/lib/llm.ts` : passer la phrase remplie en troisième argument (`gabarit`), avec la liste autorisée du prompt (`lecture.md`, section Branchement : les nombres du message utilisateur rempli). Cette liste contient déjà tous les nombres du gabarit. `redigerVerifie` rend `chiffres_utilises`, `verifie`, `mode: "gabarit"` et `modele: null`.
- Sans `redigerVerifie` (gabarit seul) : construire la liste variable par variable, comme suit.
- `chiffres_utilises` : pour chaque variable injectée. Entier (`n_pour`, `n_contre`, `n_autres`, `n_total`) : `String(valeur)`. Texte (`etape`, `favorable_1`, `bloquant_1`, `inconnu_1`) : chaque nombre renvoyé par `extraireJetons(normaliser(valeur))` et `extraireMotsNombres(normaliser(valeur))` de `pipeline/lib/verif.ts`, écrit `String(valeur)`. Liste dédoublonnée.
- `verifie` : `verifierChiffres(texte, chiffres_utilises).ok`. Le texte fixe des gabarits ne contient aucun nombre.
- `mode` : `"gabarit"`. `modele` : `null`.

## Exemples remplis sur les fixtures

- `petits-colis`, objectif 1 (`lecture.portage.pour`) : À l'étape « Première lecture, Assemblée nationale, séance publique, première partie », la mesure est portée par le gouvernement et soutenue par 8 groupes sur 11 (contre : 1, divisés ou sans position : 2) : situation défavorable pour cet objectif. `chiffres_utilises` : `["8", "11", "1", "2"]`
- `petits-colis`, objectif 2 (`lecture.insuffisant`) : À l'étape « Première lecture, Assemblée nationale, séance publique, première partie », pas assez d'information pour conclure sur cet objectif : Aucun amendement de réduction du montant déposé. `chiffres_utilises` : `[]`
