# Gabarit de secours : synthèse d'une fiche député

Sert quand le modèle est indisponible ou après 3 rejets du vérificateur. Aucun appel au modèle. Le texte est rempli mécaniquement depuis les champs JSON. Sortie : `fiche.synthese` avec `mode: "gabarit"`, `modele: null`.

Chaque bloc ` ```gabarit id=... ` ci-dessous est lisible par programme : on remplace chaque `{{variable}}` par sa valeur, rien d'autre.

## Variables

| Variable | Source exacte | Mise en forme |
|---|---|---|
| `client` | `config.json` → `dossiers[].client` | telle quelle |
| `role_verbe` | `fiches/<PA>.json` → `amendements[k].role` | `auteur` → `déposé` ; `cosignataire` → `cosigné` |
| `numero` | `texte.json` → `amendements[]` dont `id` = `amendements[k].id` → `numero` ; à défaut les chiffres après le dernier `N` de `id`, sans zéros de tête | tel quel |
| `sort_mot` | `amendements[k].sort` | `en_attente` → `en attente` ; `adopte` → `adopté` ; `rejete` → `rejeté` ; `retire` → `retiré` ; `tombe` → `tombé` ; `non_examine` → `non examiné` |
| `resume` | `amendements[k].resume` | `sans_point` |
| `date_debat` | `debats[j].date` | `date_fr` |
| `lieu_mot` | `debats[j].lieu` | `seance` → `séance` ; `commission` → `commission` |
| `citation` | `debats[j].citation` | telle quelle, jamais modifiée ni coupée |
| `n_ecarts` | `pivots.json` → `deputes[]` dont `id` = `depute_id` → `ecarts.length` | entier |
| `s` | dérivé de `n_ecarts` | `s` si `n_ecarts` > 1, sinon vide |
| `loyaute` | `pivots.json` → `deputes[].loyaute_12m` | `dec` |
| `organisations` | `auditions[].organisations[].nom` | les 3 premiers noms distincts, dans l'ordre du fichier, séparés par `, ` |

Choix de `k` : le premier amendement de rôle `auteur`, sinon le premier de la liste. Choix de `j` : le débat à la `date` la plus récente, sinon le premier de la liste.

## Mise en forme

- `date_fr` : `2025-11-19` → `19 novembre 2025` ; le jour 1 s'écrit `1er` ; pas de zéro devant le jour.
- `dec` : nombre écrit avec une virgule, sans arrondi (`0.72` → `0,72`).
- `sans_point` : espaces de bord retirés, point final retiré.
- Entre deux variables il y a toujours un mot ou une ponctuation, jamais une simple espace.

## Gabarits de `position_probable` (une phrase)

On prend le premier cas vrai. Un député n'est décrit que par ce qu'il a lui-même déposé, dit ou voté, jamais par la position de son groupe.

| Ordre | Condition | Gabarit |
|---|---|---|
| 1 | `amendements` non vide | `position.depose` |
| 2 | `debats` non vide | `position.dit` |
| 3 | le député est dans `pivots.json` et `n_ecarts` ≥ 1 | `position.vote` |
| 4 | sinon | `position.inconnue` |

```gabarit id=position.depose
A {{role_verbe}} l'amendement n° {{numero}}, {{sort_mot}} (« {{resume}} »).
```

```gabarit id=position.dit
A dit en {{lieu_mot}} le {{date_debat}} : « {{citation}} »
```

```gabarit id=position.vote
A voté autrement que son groupe sur {{n_ecarts}} scrutin{{s}} lié{{s}} au sujet ; loyauté à son groupe sur un an : {{loyaute}}.
```

```gabarit id=position.inconnue
Position personnelle non connue : aucun amendement, aucune intervention et aucun écart de vote relevés sur la mesure.
```

## Gabarits de `argument` (une phrase adressée au lobbyiste)

On prend le premier cas vrai.

| Ordre | Condition | Gabarit |
|---|---|---|
| 1 | `amendements` et `debats` non vides | `argument.depose_dit` |
| 2 | `amendements` non vide | `argument.depose` |
| 3 | `debats` non vide | `argument.dit` |
| 4 | au moins une organisation dans `auditions` | `argument.auditions` |
| 5 | sinon | `argument.contact` |

```gabarit id=argument.depose_dit
Présenter à ce député la position du client ({{client}}) en partant de son amendement n° {{numero}} et de sa déclaration du {{date_debat}} en {{lieu_mot}} : « {{citation}} »
```

```gabarit id=argument.depose
Présenter à ce député la position du client ({{client}}) en partant de son amendement n° {{numero}} (« {{resume}} »).
```

```gabarit id=argument.dit
Présenter à ce député la position du client ({{client}}) en partant de sa déclaration du {{date_debat}} en {{lieu_mot}} : « {{citation}} »
```

```gabarit id=argument.auditions
Présenter à ce député la position du client ({{client}}) : il a déjà entendu {{organisations}} sur ce texte.
```

```gabarit id=argument.contact
Présenter à ce député la position du client ({{client}}) sur la mesure : aucun acte personnel relevé, premier contact à établir.
```

## Liste autorisée et champs de sortie

- Cas normal, avec `redigerVerifie` de `pipeline/lib/llm.ts` : passer `position_probable`, un saut de ligne, puis `argument` en troisième argument (`gabarit`), avec la liste autorisée du prompt (`synthese.md`, section Branchement : les nombres du message utilisateur rempli). Cette liste contient déjà tous les nombres du gabarit. `redigerVerifie` rend `chiffres_utilises`, `verifie`, `mode: "gabarit"` et `modele: null`.
- Sans `redigerVerifie` (gabarit seul) : construire la liste variable par variable, comme suit.
- `chiffres_utilises` : pour chaque variable injectée dans `position_probable` ou `argument`. Champ numérique : `String(valeur)` (`n_ecarts`, `loyaute_12m`). Date : la date ISO telle quelle. Texte (`resume`, `citation`, `numero`, `client`, `organisations`) : chaque nombre renvoyé par `extraireJetons(normaliser(valeur))` et `extraireMotsNombres(normaliser(valeur))` de `pipeline/lib/verif.ts`, écrit `String(valeur)`. Liste dédoublonnée.
- `verifie` : `verifierChiffres(position_probable + " " + argument, chiffres_utilises).ok`. Le texte fixe des gabarits ne contient aucun nombre : un rejet signale une erreur de mise en forme, à écrire dans `meta.limits`.
- `mode` : `"gabarit"`. `modele` : `null`. `date` : `date_reference` du dossier si elle est posée, sinon la date du jour.

## Exemple rempli (fixture `petits-colis/fiches/PA721578.json`)

- `position_probable` : A déposé l'amendement n° 806, en attente (« Supprime l'article 22 (taxe sur les petits colis) »).
- `argument` : Présenter à ce député la position du client (Alibaba France) en partant de son amendement n° 806 et de sa déclaration du 19 novembre 2025 en séance : « Cette taxe pèse d'abord sur les ménages modestes qui achètent en ligne faute de mieux. »
- `chiffres_utilises` : `["806", "22", "2025-11-19"]`
