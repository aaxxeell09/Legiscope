# Gabarit de secours : compte rendu (bloc 5, `note.json`)

Sert quand le modèle est indisponible ou après 3 rejets du vérificateur. Aucun appel au modèle. Sortie : `note.texte` avec `mode: "gabarit"`, `modele: null`.

Chaque bloc ` ```gabarit id=... ` est lisible par programme : on remplace chaque `{{variable}}` par sa valeur, rien d'autre. Le texte final est la suite des blocs retenus, dans l'ordre ci-dessous, séparés par une espace.

Le compte rendu suit la mesure, pas le texte entier. Il ne donne aucune probabilité d'adoption et rappelle l'étape : l'Assemblée n'est pas l'issue finale.

## Variables

| Variable | Source exacte | Mise en forme |
|---|---|---|
| `client` | `config.json` → `dossiers[].client` | telle quelle |
| `mesure_label` | `config.json` → `dossiers[].mesure.label` | `sans_point` |
| `etape` | `etat.json` → `etape` | `sans_point` |
| `objectif_1` | `config.json` → `dossiers[].objectifs[]` de `rang` 1 → `texte` | `sans_point` |
| `situation_mot` | `verdict.json` → `verdicts[]` → `situation` | `favorable` → `favorable` ; `incertaine` → `incertaine` ; `defavorable` → `défavorable` ; `insuffisant` → `indécidable (pas assez d'information)` |
| `tendance_mot` | `verdicts[]` de rang 1 → `tendance` | `amelioration` → `en amélioration` ; `stable` → `stable` ; `degradation` → `en dégradation` |
| `niveau_mot` | `verdicts[]` de rang 1 → `confiance.niveau` | `elevee` → `élevée` ; `moyenne` → `moyenne` ; `faible` → `faible` |
| `lecture_1` | `verdicts[]` de rang 1 → `lecture.texte` | `avec_point` |
| `objectif_n` | `config.json` → objectif de rang `n` > 1 → `texte` | `sans_point` |
| `ev_1`, `ev_2` | `nouveautes.json` → `evenements[0].titre`, `evenements[1].titre` (la liste est déjà triée par importance) | `sans_point` |
| `ev_1_date`, `ev_2_date` | `evenements[0].date`, `evenements[1].date` | `date_fr` |
| `ev_1_effet`, `ev_2_effet` | `evenements[0].effet`, `evenements[1].effet` | `renforce` → `favorable au client` ; `affaiblit` → `défavorable au client` ; `neutre` → `sans effet sur le verdict` |
| `echeance_1` | `suite.json` → `echeances[0].titre` | `sans_point` |
| `echeance_1_date` | `suite.json` → `echeances[0].date` | `date_fr` ; `null` → `date non fixée` |
| `derniere_occasion` | `suite.json` → `derniere_occasion.titre` | `sans_point` |
| `derniere_occasion_date` | `suite.json` → `derniere_occasion.date` | `date_fr` ; `null` → `date non fixée` |
| `n_actionnables`, `n_allies`, `n_perdus` | `action.json` → `groupes.actionnables.length`, `groupes.allies.length`, `groupes.perdus.length` | entiers |
| `limites` | la phrase de limites retenue pour `note.limites` | `avec_point` |

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
{{client}}, mesure suivie : {{mesure_label}}. Étape : {{etape}}.
```

```gabarit id=note.verdict
Verdict proposé sur l'objectif principal (« {{objectif_1}} ») : situation {{situation_mot}}, tendance {{tendance_mot}}, confiance {{niveau_mot}}. {{lecture_1}}
```

```gabarit id=note.repli
Repli « {{objectif_n}} » : situation {{situation_mot}}.
```

```gabarit id=note.bouge.deux
Ce qui a bougé : {{ev_1}} ({{ev_1_date}}, {{ev_1_effet}}) ; {{ev_2}} ({{ev_2_date}}, {{ev_2_effet}}).
```

```gabarit id=note.bouge.un
Ce qui a bougé : {{ev_1}} ({{ev_1_date}}, {{ev_1_effet}}).
```

```gabarit id=note.bouge.rien
Rien de nouveau sur la mesure depuis la dernière analyse.
```

```gabarit id=note.dates.echeance
Prochaine date : {{echeance_1}} ({{echeance_1_date}}).
```

```gabarit id=note.dates.derniere
Dernière occasion d'agir : {{derniere_occasion}} ({{derniere_occasion_date}}).
```

```gabarit id=note.action
Députés sur qui agir : {{n_actionnables}} ; alliés à protéger : {{n_allies}} ; perdus : {{n_perdus}}.
```

```gabarit id=note.limites
Limites : {{limites}}
```

```gabarit id=note.limites.defaut
Limites : compte rendu produit par gabarit, sans rédaction par le modèle, à relire avant envoi.
```

## Liste autorisée et champs de sortie

- Avec `redigerVerifie` de `pipeline/lib/llm.ts` : passer le texte rempli en troisième argument (`gabarit`). `redigerVerifie` rend `chiffres_utilises`, `verifie`, `mode: "gabarit"` et `modele: null`. La liste autorisée de l'appel doit contenir les nombres des variables injectées, construits comme suit.
- `chiffres_utilises` : pour chaque variable injectée. Entier (`n_actionnables`, `n_allies`, `n_perdus`) : `String(valeur)`. Date : la date ISO telle quelle. Texte (toutes les autres, `lecture_1` et `limites` compris) : chaque nombre renvoyé par `extraireJetons(normaliser(valeur))` et `extraireMotsNombres(normaliser(valeur))` de `pipeline/lib/verif.ts`, écrit `String(valeur)`. Liste dédoublonnée.
- `verifie` : `verifierChiffres(texte, chiffres_utilises).ok`. Le texte fixe des gabarits ne contient aucun nombre.
- `mode` : `"gabarit"`. `modele` : `null`. `client` et `objectifs` : recopiés depuis `config.json`. `sources` : les `meta.sources` des fichiers lus.
- Longueur : 171 mots sur la fixture `petits-colis`, 197 sur `plf2027-holdings` (cible : 150). Le gabarit ne coupe aucun titre : la longueur suit celle des titres injectés.

## Prompt associé (`note.md`)

- Format : le prompt système, puis une ligne `--- user ---`, puis le message utilisateur à variables. C'est le format lu par `promptNote` de `pipeline/note/run.ts`.
- Variables du message utilisateur (celles de `promptNote`) : `client`, `mesure`, `objectif`, `replis`, `date_reference`, `faits` (une ligne `- ...` par fait vérifié), `limites`. Une variable vide donne une ligne vide : le prompt le prévoit pour `limites`.
- Liste autorisée : celle que construit `pipeline/note/run.ts` (nombres des faits, dates, nombres du gabarit).

## Exemple rempli (fixtures `petits-colis`)

Alibaba France, mesure suivie : Taxe de 2 euros par article sur les colis de moins de 150 euros venant de hors d'Europe. Étape : Première lecture, Assemblée nationale, séance publique, première partie. Verdict proposé sur l'objectif principal (« Empêcher que la taxe soit votée ») : situation défavorable, tendance en dégradation, confiance élevée. La mesure est portée par le gouvernement et soutenue par 9 groupes sur 11 ; seul le RN annonce un vote contre. Repli « Réduire son montant » : situation indécidable (pas assez d'information). Repli « Repousser son application » : situation défavorable. Ce qui a bougé : Amendement de compromis n° 2231 déposé (19 novembre 2025, défavorable au client) ; Amendement de suppression n° 806 déposé par le RN (17 novembre 2025, favorable au client). Dernière occasion d'agir : Séance publique du 20 novembre 2025 : dernier examen de l'article 22 à l'Assemblée en première lecture (20 novembre 2025). Députés sur qui agir : 3 ; alliés à protéger : 2 ; perdus : 3. Limites : Rejoué à la date de référence du 19 novembre 2025, veille du vote de l'article 22 ; prédictions Orcet du même jour.

`chiffres_utilises` : `["2", "150", "9", "11", "2231", "2025-11-19", "806", "2025-11-17", "20", "2025", "22", "2025-11-20", "3", "19"]`
