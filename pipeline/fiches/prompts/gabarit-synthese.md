# Gabarit de secours : synthèse d'une fiche député

Sert quand le modèle est indisponible ou après 3 rejets du vérificateur. Aucun appel au modèle. Le texte est rempli mécaniquement depuis les champs JSON. Sortie : `fiche.synthese` avec `mode: "gabarit"`, `modele: null`.

Chaque bloc ` ```gabarit id=... ` ci-dessous est lisible par programme : on remplace chaque `{{variable}}` par sa valeur, rien d'autre. C'est ce que fait `gabaritSynthese` de `pipeline/fiches/lib/gabarits.ts` (A4) : mêmes identifiants de blocs, mêmes variables.

## Variables

Ce sont les variables que A4 passe aujourd'hui.

| Variable | Source exacte | Mise en forme |
|---|---|---|
| `client` | `config.json` → `dossiers[].client` | telle quelle |
| `role_verbe` | `fiches/<PA>.json` → `amendements[k].role` | `auteur` → `déposé` ; `cosignataire` → `cosigné` |
| `numero` | `texte.json` → `amendements[]` dont `id` = `amendements[k].id` → `numero` ; à défaut les chiffres après le dernier `N` de `id`, sans zéros de tête | tel quel |
| `sort_mot` | `amendements[k].sort` | `en_attente` → `en attente` ; `adopte` → `adopté` ; `rejete` → `rejeté` ; `retire` → `retiré` ; `tombe` → `tombé` ; `non_examine` → `non examiné` ; `non_soutenu` → `non soutenu` ; `irrecevable` → `irrecevable` |
| `resume` | `amendements[k].resume` | `sans_point` |
| `date_debat` | `debats[j].date` | `date_fr` |
| `lieu_mot` | `debats[j].lieu` | `seance` → `séance` ; `commission` → `commission` |
| `citation` | `debats[j].citation` | telle quelle, jamais modifiée ni coupée |
| `organisations` | `auditions[].organisations[].nom`, pour les seules auditions dont `role` commence par `rapporteur` (`rapporteur`, `rapporteur_general`, `rapporteur_avis`) | les 3 premiers noms distincts, dans l'ordre du fichier, séparés par `, ` |
| `organisations_commission` | `auditions[].organisations[].nom`, pour les autres auditions (`membre`, `president`) | les 3 premiers noms distincts, dans l'ordre du fichier, séparés par `, ` |

Choix de `k` : le premier amendement de rôle `auteur`, sinon le premier de la liste. Choix de `j` : le débat à la `date` la plus récente, sinon le premier de la liste.

A4 passe aussi `n_ecarts`, `s` et `loyaute` (tirés de `pivots.json`). Aucun gabarit ne les écrit plus : ils ne figurent pas dans l'entrée donnée au modèle, et les écarts de `pivots.json` ne portent pas toujours sur la mesure (`base` peut valoir `general`).

## Mise en forme

- `date_fr` : `2025-11-19` → `19 novembre 2025` ; le jour 1 s'écrit `1er` ; pas de zéro devant le jour.
- `sans_point` : espaces de bord retirés, point final retiré.
- Entre deux variables il y a toujours un mot ou une ponctuation, jamais une simple espace.

## Gabarits de `position_probable` (une phrase)

On prend le premier cas vrai. Un député n'est décrit que par ce qu'il a lui-même déposé, dit ou voté, jamais par la position de son groupe. Une audition ne fonde jamais une position.

| Ordre | Condition | Gabarit |
|---|---|---|
| 1 | `amendements` non vide | `position.depose` |
| 2 | `debats` non vide | `position.dit` |
| 3 | le député est dans `pivots.json` avec au moins un écart | `position.vote` |
| 4 | sinon | `position.inconnue` |

```gabarit id=position.depose
A {{role_verbe}} l'amendement n° {{numero}}, {{sort_mot}} (« {{resume}} »).
```

```gabarit id=position.dit
A dit en {{lieu_mot}} le {{date_debat}} : « {{citation}} »
```

```gabarit id=position.vote
Position personnelle sur la mesure non connue : aucun amendement et aucune intervention relevés ; seul indice, il a déjà voté autrement que son groupe, ce qui ne dit pas son vote sur la mesure.
```

```gabarit id=position.inconnue
Position personnelle sur la mesure non connue : aucun amendement et aucune intervention relevés.
```

## Les auditions selon le rôle

Le rôle du député sur le rapport est le champ `role` de chaque audition (`auditions/<PA>.json` et `fiches/<PA>.json` → `auditions[].role`, type `RoleAudition` de `contracts/schemas/enums.ts`).

| `role` | Ce qu'on écrit | Force de l'indice |
|---|---|---|
| `rapporteur`, `rapporteur_general`, `rapporteur_avis`, `president` | le député « a entendu » l'organisation | forte |
| `membre` | l'organisation a été « entendue par les rapporteurs de sa commission » | plus faible : rien ne dit que le député était présent |

- Avec le rôle `membre`, on n'écrit jamais que le député a lui-même entendu, reçu ou rencontré l'organisation.
- Le mot « auditionné » ne s'écrit nulle part.
- `argument.auditions` (« il a entendu ») ne reçoit que `organisations` : les auditions où le député est rapporteur.
- `argument.auditions_commission` (« entendues par les rapporteurs de sa commission ») reçoit `organisations_commission`. Il ne sert que s'il n'y a ni amendement, ni déclaration, ni audition comme rapporteur : l'indice le plus faible passe en dernier.
- A4 range aujourd'hui le rôle `president` avec `membre` (`role.startsWith("rapporteur")`) : un président reçoit donc la formule faible, qui reste vraie. A1 ne produit pas ce rôle à ce jour.

## Gabarits de `argument` (une phrase adressée au lobbyiste)

On prend le premier cas vrai.

| Ordre | Condition | Gabarit |
|---|---|---|
| 1 | `amendements` et `debats` non vides | `argument.depose_dit` |
| 2 | `amendements` non vide | `argument.depose` |
| 3 | `debats` non vide | `argument.dit` |
| 4 | `organisations` non vide (au moins une organisation entendue comme rapporteur) | `argument.auditions` |
| 5 | `organisations_commission` non vide | `argument.auditions_commission` |
| 6 | sinon | `argument.contact` |

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
Présenter à ce député la position du client ({{client}}) : comme rapporteur, il a entendu {{organisations}} sur ce texte.
```

```gabarit id=argument.auditions_commission
Présenter à ce député la position du client ({{client}}) en citant des organisations entendues par les rapporteurs de sa commission sur ce texte ({{organisations_commission}}) : indice plus faible qu'un acte personnel.
```

```gabarit id=argument.contact
Présenter à ce député la position du client ({{client}}) sur la mesure : aucun acte personnel relevé, premier contact à établir.
```

## Vocabulaire

- La synthèse ne cite ni score ni valeur Orcet. S'il fallait citer le score du verdict, il se nomme « part des sièges favorables à l'objectif » : ce n'est pas une probabilité, et il ne s'écrit jamais seul à côté de la situation.
- S'il fallait citer une valeur Orcet : « moyenne des probabilités individuelles de voter pour » sur un amendement, jamais la probabilité d'adoption de l'amendement, de l'article ou de la loi.
- Les gabarits parlent de « la mesure ». Le sort d'un amendement est recopié tel quel : un amendement adopté n'est pas une mesure adoptée.

## Liste autorisée et champs de sortie

- Avec `redigerVerifie` de `pipeline/lib/llm.ts` : passer le gabarit du champ demandé en troisième argument (`gabarit`). `redigerVerifie` rend `chiffres_utilises`, `verifie`, `mode: "gabarit"` et `modele: null`. La liste autorisée de l'appel doit contenir les nombres des variables injectées, construits comme suit.
- `chiffres_utilises` : pour chaque variable injectée dans `position_probable` ou `argument`. Date : la date ISO telle quelle. Texte (`resume`, `citation`, `numero`, `client`, `organisations`, `organisations_commission`) : chaque nombre renvoyé par `extraireJetons(normaliser(valeur))` et `extraireMotsNombres(normaliser(valeur))` de `pipeline/lib/verif.ts`, écrit `String(valeur)`. Liste dédoublonnée.
- `verifie` : `verifierChiffres(position_probable + " " + argument, chiffres_utilises).ok`. Le texte fixe des gabarits ne contient aucun nombre : un rejet signale une erreur de mise en forme, à écrire dans `meta.limits`.
- `mode` : `"gabarit"`. `modele` : `null`. `date` : `date_reference` du dossier si elle est posée, sinon la date du jour.

## Prompt associé (`synthese.md`)

- Format : texte brut, sans variable. Le fichier entier ouvre le message ; l'appelant ajoute `Champ demandé : position_probable` (ou `argument`), puis `Entrée (JSON) :` et l'entrée. C'est ce que fait `rediger` de `pipeline/fiches/lib/redaction.ts`. Un appel par champ, une phrase par appel.
- Entrée passée par A4 aujourd'hui : `depute` (`id`, `nom`, `prenom`, `groupe_sigle`), `mesure`, `client`, `position_cible`, `position_groupe` (`position`, `confiance`, ou `null`), `amendements` (`numero`, `role`, `resume`, `sort`, `travaille_avec`), `debats` (`date`, `lieu`, `citation`), `auditions` (`date`, `role`, `entendu_par` : la règle du rôle redite en clair par A4, `organisations` : liste de noms), `classement_du_cabinet` (`liste`, `position_sur_la_mesure`, `raison`, `fondement`, ou `null` : le classement de P3, que la synthèse ne doit pas contredire).
- L'entrée ne contient aucun vote brut, ni `n_ecarts`, ni `loyaute_12m`. Le prompt interdit de citer `position_groupe.confiance`.
- Le prompt lit `auditions[].role` (et `entendu_par`) et applique la règle « a entendu » ou « entendues par les rapporteurs de sa commission ».
- Liste autorisée : les nombres de l'entrée JSON.

## Exemples remplis

Remplis mécaniquement le 14 novembre 2026, sans modèle, par `gabaritSynthese` de A4.

- `data/plf2027-holdings/fiches/PA721896.json`, `position_probable` (`position.depose`) : A cosigné l'amendement n° 1816, adopté (« Supprime l'article 3 »).
- Même fiche, `argument` (`argument.depose`) : Présenter à ce député la position du client (Afep) en partant de son amendement n° 1816 (« Supprime l'article 3 »). `chiffres_utilises` : `["1816", "3"]`
- `data/plf2027-holdings/fiches/PA720446.json`, auditions de rôle `membre`, `position_probable` (`position.inconnue`) : Position personnelle sur la mesure non connue : aucun amendement et aucune intervention relevés.
- Même fiche, `argument` (`argument.auditions_commission`) : Présenter à ce député la position du client (Afep) en citant des organisations entendues par les rapporteurs de sa commission sur ce texte (Conseil supérieur de la marine marchande, Brittany Ferries, Corsica Linea) : indice plus faible qu'un acte personnel. `chiffres_utilises` : `[]`
- `data/petits-colis/fiches/PA720446.json`, `position_probable` (`position.vote`) : Position personnelle sur la mesure non connue : aucun amendement et aucune intervention relevés ; seul indice, il a déjà voté autrement que son groupe, ce qui ne dit pas son vote sur la mesure.
- Fixture `petits-colis/fiches/PA725443.json`, audition de rôle `rapporteur_avis`, bloc `argument.auditions` rempli hors ordre de choix (cette fiche a aussi un amendement, A4 choisit donc un autre bloc) : Présenter à ce député la position du client (Alibaba France) : comme rapporteur, il a entendu Fédération du e-commerce et de la vente à distance (Fevad), Alibaba France, Direction générale des douanes et droits indirects sur ce texte.

