# Gabarit de secours : contre-argument (deux phrases)

Sert quand le modèle est indisponible ou après 3 rejets du vérificateur. Aucun appel au modèle. Sortie : `contre_arguments[]` avec `mode: "gabarit"`.

Chaque bloc ` ```gabarit id=... ` est lisible par programme : on remplace chaque `{{variable}}` par sa valeur, rien d'autre. C'est ce que fait `gabaritContreArgument` de `pipeline/fiches/lib/gabarits.ts` (A4) : mêmes identifiants de blocs, mêmes variables.

Le gabarit ne rédige pas : il renvoie le cabinet vers un argument de son camp déjà entendu dans les débats, avec sa citation exacte. Il ne nomme aucun orateur : pas d'attaque personnelle possible.

## Qui est « adverse », qui est « allié »

`position_cible` de l'objectif de rang 1 (`config.json` → `dossiers[].objectifs[0].position_cible`) est la position du client sur la mesure.

- `position_cible` = `contre` : arguments adverses = `arguments.pour`, arguments alliés = `arguments.contre`.
- `position_cible` = `pour` : arguments adverses = `arguments.contre`, arguments alliés = `arguments.pour`.

Un contre-argument par argument adverse. L'argument adverse d'indice `i` reçoit l'argument allié d'indice `i` modulo le nombre d'arguments alliés.

## Variables

| Variable | Source exacte | Mise en forme |
|---|---|---|
| `repond_a` | argument adverse → `argument` | tel quel (aussi recopié dans le champ `repond_a`) |
| `argument_allie` | argument allié → `argument` | `sans_point` |
| `citation_allie` | argument allié → `citation` | telle quelle, jamais modifiée ni coupée |
| `date_allie` | argument allié → `date` | `date_fr` |
| `lieu_mot` | argument allié → `lieu` | `seance` → `séance` ; `commission` → `commission` |

## Mise en forme

- `date_fr` : `2025-11-19` → `19 novembre 2025` ; le jour 1 s'écrit `1er` ; pas de zéro devant le jour.
- `sans_point` : espaces de bord retirés, point final retiré.
- Entre deux variables il y a toujours un mot ou une ponctuation, jamais une simple espace.

## Gabarits

| Condition | Gabarit |
|---|---|
| au moins un argument allié | `contre_argument.allie` |
| aucun argument allié | `contre_argument.vide` |

```gabarit id=contre_argument.allie
À l'argument « {{repond_a}} », opposer celui déjà entendu en {{lieu_mot}} le {{date_allie}} : « {{argument_allie}} ». Citation à reprendre : « {{citation_allie}} »
```

```gabarit id=contre_argument.vide
À l'argument « {{repond_a}} », aucun argument du camp du client n'a encore été entendu dans les débats. Réponse à construire avec les chiffres du dossier.
```

## Vocabulaire

- Le gabarit ne cite ni score ni valeur Orcet, et n'annonce aucune issue. S'il fallait citer le score du verdict, il se nomme « part des sièges favorables à l'objectif » : ce n'est pas une probabilité, et il ne s'écrit jamais seul à côté de la situation.
- S'il fallait citer une valeur Orcet : « moyenne des probabilités individuelles de voter pour » sur un amendement, jamais la probabilité d'adoption de l'amendement, de l'article ou de la loi.
- Le gabarit ne dit rien de l'état du texte : il renvoie à un argument entendu sur la mesure. Un vote à l'Assemblée n'est pas l'issue finale du dossier.

## Liste autorisée et champs de sortie

- Avec `redigerVerifie` de `pipeline/lib/llm.ts` : passer les deux phrases remplies en troisième argument (`gabarit`). `redigerVerifie` rend `chiffres_utilises`, `verifie`, `mode: "gabarit"` et `modele: null`. La liste autorisée de l'appel doit contenir les nombres des variables injectées, construits comme suit.
- `chiffres_utilises` : pour chaque variable injectée. Date : la date ISO telle quelle. Texte (`repond_a`, `argument_allie`, `citation_allie`) : chaque nombre renvoyé par `extraireJetons(normaliser(valeur))` et `extraireMotsNombres(normaliser(valeur))` de `pipeline/lib/verif.ts`, écrit `String(valeur)` (« 500 millions » donne `"500"` et `"1000000"`). Liste dédoublonnée.
- `verifie` : `verifierChiffres(texte, chiffres_utilises).ok`. Le texte fixe des gabarits ne contient aucun nombre.
- `mode` : `"gabarit"`.
- `preuve` pour `contre_argument.allie` : `sources` = `[{label: "<Séance ou Commission> du <date_allie>", url: <url de l'argument allié>}]`, `raisonnement` = `Gabarit de secours : reprend un argument du camp du client déjà entendu dans les débats, sans rédaction par le modèle.`, `nature` = `"deduction"`.
- `preuve` pour `contre_argument.vide` : `sources` = l'`url` de l'argument adverse, `raisonnement` = `Gabarit de secours : aucun argument du camp du client relevé dans les débats.`, `nature` = `"inconnue"`.

## Prompt associé (`contre-argument.md`)

- Format : texte brut, sans variable. Le fichier entier ouvre le message ; l'appelant ajoute `Champ demandé : texte`, puis `Entrée (JSON) :` et l'entrée. C'est ce que fait `rediger` de `pipeline/fiches/lib/redaction.ts`. Un appel par argument adverse.
- Entrée passée par A4 aujourd'hui : `argument` (`argument`, `citation`, `date`, `lieu`), `appuis` (même forme : les arguments du camp du client), `mesure`, `client`, `position_cible`, `chiffres_du_dossier` (lignes de texte : le libellé de la mesure, puis une ligne `n° <numero> : <resume>` par amendement de `texte.json`).
- Aucun nom d'orateur dans l'entrée. Ni score du verdict ni valeur Orcet dans `chiffres_du_dossier` : un contre-argument ne s'appuie ni sur l'un ni sur l'autre.
- Liste autorisée : les nombres de l'entrée JSON.

## Exemple rempli (fixture `petits-colis/action.json`, deuxième argument pour)

- `texte` : À l'argument « Financer les contrôles douaniers, environ 500 millions d'euros de recettes », opposer celui déjà entendu en séance le 19 novembre 2025 : « La taxe se contourne avec de plus gros colis ». Citation à reprendre : « Une taxe par colis pousse simplement à regrouper les envois : elle ne rapportera pas ce qu'on annonce. »
- `chiffres_utilises` : `["500", "1000000", "2025-11-19"]`
