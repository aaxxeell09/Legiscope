# Données, règles de calcul et rôle des modèles

Ce document décrit ce que LegiSpot (dépôt : « Legiscope ») collecte, calcule et fait rédiger. Il ne contient que des règles, des chemins et des mécanismes, lus dans le code.
Il ne contient aucun chiffre mesuré dans `data/` : comptes d'amendements, de prédictions, d'événements ou de fiches, scores et situations de verdict, mode de rédaction par dossier, résultats des commandes de vérification. Ces valeurs changent à chaque régénération. Elles sont dans [docs/ETAT.md](ETAT.md), fichier généré par `node docs/mesurer.mjs` à partir de `data/`.
Les organisations affichées comme clients (Alibaba France, Afep, U2P, FNSEA, Union sociale pour l'habitat, CAPEB) sont des exemples : aucune n'est cliente du projet.

Trois précautions de lecture :

- `data/raw/` et `pipeline/*/.cache/` sont exclus du dépôt (`.gitignore`). Les réponses brutes des API, les archives téléchargées et les caches du modèle ne sont donc pas vérifiables depuis le dépôt : seuls les fichiers dérivés de `data/<dossier>/` le sont.
- Chaque fichier JSON porte un bloc `meta` (`contracts/schemas/meta.ts`) avec ses sources et ses limites en clair (`meta.limits`). C'est la description la plus précise de chaque fichier.
- Le bloc `preuve` (`contracts/schemas/preuve.ts`), de nature `fait` (publié par une source), `deduction` (produit par l'outil) ou `inconnue`, n'existe que dans cinq schémas : `contracts/schemas/action.ts`, `contracts/schemas/etat.ts`, `contracts/schemas/suite.ts`, `contracts/schemas/verdict.ts` et `contracts/schemas/nouveautes.ts`. Les amendements de la Base (`texte.json`), le compte rendu (`note.json`) et `hatvp.json` ne portent qu'une adresse ou une liste de sources, sans nature de preuve.

## 1. Sources

Point d'entrée : `pipeline/collecte/run.ts`. Il télécharge les archives dans `data/raw/opendata/`, puis lance dans l'ordre `groupes-deputes.ts`, `scrutins-opendata.ts`, `amendements-opendata.ts`, `dossiers-opendata.ts`, `hatvp.ts`, `api.ts`.

| Source | Ce qui est collecté | Script | Fichiers produits |
|---|---|---|---|
| Open data Assemblée, députés et organes (AMO10) | Députés en exercice, groupes, effectifs, commissions | `pipeline/collecte/groupes-deputes.ts` | `data/groupes.json`, `data/deputes.json` |
| Open data Assemblée, scrutins | Votes nominatifs et position majoritaire de chaque groupe depuis juillet 2024 | `pipeline/collecte/scrutins-opendata.ts`, `pipeline/pivots/lib/opendata.ts`, `pipeline/cohesion/lib.ts` | `pivots.json`, positions de `texte.json`, `groupes-action.json`, `verdict.json`, `data/cohesion.json` |
| Open data Assemblée, amendements | Dispositif, exposé, auteur, cosignataires, article visé, dates, sort | `pipeline/collecte/amendements-opendata.ts`, `pipeline/pivots/lib/opendata.ts`, `pipeline/amendements/lib/opendata.ts` | `texte.json`, `etat.json`, `amendements/<PA>.json` |
| Open data Assemblée, dossiers législatifs | Étapes du texte, rapporteurs, métadonnées des rapports | `pipeline/collecte/dossiers-opendata.ts`, `pipeline/auditions/lib/opendata.ts` | `etat.json`, `auditions/<PA>.json` |
| Open data Assemblée, agenda | Réunions liées au dossier législatif | `pipeline/suite/run.ts`, `pipeline/fiches/lib/nouveautes.ts` | `suite.json`, `nouveautes.json` |
| Comptes rendus de séance (archive `syseron.xml.zip`) | Prises de parole citant le sujet | `pipeline/debats/seance.ts` | `debats/<PA>.json`, `arguments.json` |
| Pages du site de l'Assemblée (pas des archives open data) | Comptes rendus de commission, annexes « personnes entendues » des rapports | `pipeline/debats/commission.ts`, `pipeline/auditions/lib/rapports.ts` | `debats/<PA>.json`, `arguments.json`, `auditions/<PA>.json` |
| HATVP, répertoire des représentants d'intérêts | Fiches d'activité filtrées par mots-clés | `pipeline/collecte/hatvp.ts` | `hatvp.json`, recopié dans `fiches/<PA>.json` |
| API Hémicycle | Prédictions Orcet, accord entre groupes, loyauté, flux d'événements | `pipeline/collecte/api.ts`, `pipeline/fiches/lib/evenements-api.ts` | `prediction` dans `texte.json`, puis `suite.json` et `verdict.json` ; dépôts par jour dans `nouveautes.json` |
| Featherless | Appels à un modèle de langage | `pipeline/lib/llm.ts` | Voir section 6 |

Précisions sur l'API Hémicycle, lues dans le code :

- Le client unique est `pipeline/collecte/lib/hemicycle.ts` (compteur de crédits, arrêt sous 150 crédits restants, journal dans `data/raw/`).
- `pipeline/collecte/api.ts` fait trois types d'appel : `POST /orcet/predictions`, `POST /agregats/accord-groupes`, `POST /agregats/loyaute-deputes`. Seules les prédictions Orcet sont relues par la suite du pipeline. Aucun script hors de `pipeline/collecte/` ne lit les réponses d'accord entre groupes ni de loyauté : la cohésion et la loyauté affichées sont recalculées à partir des scrutins open data (`pipeline/cohesion/`, `pipeline/pivots/lib/loyaute.ts`).
- Les scrutins, votes, amendements, députés et groupes de `data/` viennent de l'open data de l'Assemblée, pas de l'API. `data/groupes.json` et `data/deputes.json` l'écrivent dans leur `meta.limits`.
- `pipeline/fiches/lib/evenements-api.ts` interroge le jeu `evenements_parlementaires` (30 derniers jours), seulement avec l'option `--api`. Le nombre de lignes obtenues par dossier est écrit dans `meta.limits` de `nouveautes.json`.
- `pipeline/collecte/mesure.ts` n'est pas un traitement des données : c'est un script de mesure du coût de l'API. Il n'est pas appelé par `run.ts`.

Étape finale : `pipeline/publication.mjs` (`bun run publish:data`) valide chaque dossier puis le scelle dans `data/<dossier>/publication.json`. Ce sceau est décrit en section 10.

## 2. Rattachement d'un amendement à la mesure suivie

La mesure est déclarée à la main dans `data/config.json` : pour chaque dossier, `mesure.article`, `mesure.texte_id` et `sujet.mots_cles` (schéma : `contracts/schemas/config.ts`). Rien n'est appris ni détecté automatiquement.

Trois filtres coexistent, avec des règles voisines mais pas identiques :

| Où | Règle |
|---|---|
| `pipeline/collecte/amendements-opendata.ts` (brut, hors dépôt) | Gardé si un mot-clé apparaît dans le dispositif, l'exposé ou le titre d'article, ou si l'amendement porte sur l'article déclaré. Filtre : `filtreMotsCles` dans `pipeline/collecte/lib/config.ts` (sans accents, mots entiers, sigles courts sensibles à la casse) |
| `pipeline/pivots/lib/sujet.ts`, `amendementsDuSujet` (verdict, `texte.json`) | Gardé si l'amendement porte sur l'article déclaré ou cite un mot-clé. Il n'est « pertinent » que s'il porte sur l'article ou cite un mot-clé dans son dispositif. Les amendements qui ne citent le sujet que dans l'exposé sont écartés de `texte.json` et comptés dans `meta.limits` |
| `pipeline/amendements/lib/normaliser.ts`, `estDuSujet` (fichiers par député) | Gardé si l'amendement porte sur un article de la mesure, ou cite un mot-clé dans le dispositif, ou un mot-clé de plusieurs mots dans l'exposé, ou un mot-clé d'un seul mot au moins deux fois dans l'exposé |

Règles complémentaires de `pipeline/pivots/lib/sujet.ts` :

- Contrôle de l'article déclaré : si moins de 15 % des amendements de cet article citent le sujet, l'article est considéré comme ne portant pas la mesure et n'est plus utilisé (`COHERENCE_ARTICLE`).
- Textes parcourus (`textesDuDossier`) : celui de la mesure et, pour le budget 2027 (`PRJLANR5L17B3210`), le budget 2026 (`PRJLANR5L17B1906`), par une règle écrite en dur.
- Sens d'un amendement sur la mesure (`sensAmendement`) : +1 s'il la crée ou la renforce, -1 s'il la supprime, la réduit ou la reporte, 0 si le sens n'est pas lu. Il est lu par expressions régulières sur le dispositif et l'exposé.
- Scrutin lié (`scrutinsLies`) : son titre cite le projet de loi de finances et le numéro d'un amendement pertinent, avec le même article. Les sous-amendements sont ignorés.
- Nature de l'amendement (`pipeline/pivots/lib/nature.ts`) : `supprime`, `reduit`, `reporte`, `aggrave` ou `autre`. Règle d'abord, sinon modèle de langage avec contrôle de citation, sinon `autre`. Le champ `nature_mode` de chaque amendement de `texte.json` dit lequel des trois cas s'est appliqué.

Le nombre d'amendements retenus par dossier est dans [docs/ETAT.md](ETAT.md).

Limites :

- La mesure est déclarée à la main et suivie par mots-clés. Des mots-clés généraux (« colis », « holding », « agricult ») peuvent retenir un amendement à tort ou en manquer un.
- Le sens et la nature d'un amendement sont une lecture de l'outil, pas un fait publié. `texte.json` l'écrit dans ses limites.
- Les trois filtres peuvent diverger sur un même amendement, et un même amendement peut entrer dans deux dossiers dont les mots-clés se recoupent.
- Dossier `plf2027-holdings` : le contrôle des 15 % écarte l'article déclaré, et `etat.json` indique donc `dans_le_texte: false`. Le dossier rassemble par mots-clés des propositions fiscales voisines (taxe sur les holdings, fortune improductive, propositions dites « Zucman », débats du budget 2026). Ces rapprochements n'ont pas été relus un par un et rien dans le dépôt n'en documente la validation. `status/A2.md` (14 h 10) note que le classement d'un orateur « par rapport à la mesure » y reste ambigu.

## 3. Position des groupes et des députés

**Groupes** (`pipeline/pivots/lib/sujet.ts`, appelé par `pipeline/pivots/run.ts`) :

- `positionsDepuisScrutins` : pour chaque scrutin lié de sens connu, la position majoritaire du groupe est traduite en position sur la mesure. Le groupe est `pour`, `contre` ou `abstention` si au moins 60 % de ses positions vont dans le même sens, sinon `divise`.
- Si moins de 3 groupes ont une position par les scrutins, le code se replie sur `positionsDepuisAmendements` : sens des amendements déposés par des membres du groupe.
- Un groupe sans scrutin lié ni amendement de sens lisible a la position `null`.

La source retenue pour un dossier (scrutins ou amendements) et le nombre de scrutins liés sont écrits dans `meta.limits` de `pivots.json` et dans `confiance.etabli` de `verdict.json`.

**Députés** (`actesPropres` et `construireGroupesAction` dans `pipeline/pivots/definitif.ts`, schémas dans `contracts/schemas/action.ts`). Un député n'est classé que sur ses propres actes, de trois types (champ `fondement`) : `vote` (son vote sur un scrutin lié, traduit en position sur la mesure), `depose` (un amendement de sens connu qu'il a déposé ou cosigné), `dit` (une prise de parole classée pour ou contre dans `arguments.json`, section 6).

| Catégorie | Règle |
|---|---|
| Alliés | La majorité de ses actes va dans le sens du client |
| Perdus | Ses actes vont contre le client, sa loyauté sur 12 mois est d'au moins 0,85 et son groupe est lui-même opposé |
| Sur qui agir (`actionnables`) | Actes opposés mais au moins un vote contraire à son groupe, ou loyauté sous 0,85, ou actes dans les deux sens |
| Position inconnue | Aucun acte personnel lié à la mesure. La position du groupe est donnée en contexte, pas comme classement (`preuve.nature: "inconnue"`) |

Chaque liste est coupée à 15 députés, sauf `position_inconnue`, gardée en entier. La taille de chaque liste par dossier est dans [docs/ETAT.md](ETAT.md).
Le schéma impose `position_connue` vrai si et seulement si `fondement` est non vide. `qa/croise.ts` refuse un député sans acte dans les trois autres listes. `pipeline/fiches/lib/action.ts` recopie ces listes dans `action.json` et y applique le même tri.

**Députés moins prévisibles** (`pipeline/pivots/pivots.ts`, `contracts/schemas/pivots.ts`) : 5 à 15 députés de groupes dont la position diffère de celle du client, au plus 4 par groupe, au moins 30 votes exprimés. La loyauté (`pipeline/pivots/lib/loyaute.ts`) est la part des votes exprimés identiques à la position majoritaire du groupe, sur 12 mois. Le score vaut 1 moins la loyauté. Si le dossier a au moins 3 scrutins liés et que le député a voté sur au moins 3 d'entre eux, il vaut pour moitié la part de ses votes contraires à son groupe sur le sujet. Ce score n'est pas une probabilité.

**Décideurs** (`construireDecideurs`) : le gouvernement est noté `pour` quand la mesure est un article de son projet de loi. Le « chef de file » d'un groupe est une déduction (auteur du plus grand nombre d'amendements du sujet), pas une désignation publiée.

## 4. Le Verdict

Le verdict est calculé par `construireVerdict` dans `pipeline/pivots/verdict.ts`, pour chaque objectif du dossier.

**C'est un indicateur descriptif construit par des règles du projet. Ce n'est pas une prédiction statistiquement validée.** Les seuils et le poids ci-dessous sont des constantes choisies dans le code. Le dépôt ne contient aucun calage sur des données ni aucune mesure de leur justesse sur des cas passés.

Règle du score (`scoreSieges`) :

1. On prend les groupes de position connue. Les groupes de position inconnue sortent du calcul.
2. Chaque groupe compte pour son nombre de sièges (`effectif` dans `data/groupes.json`).
3. Un groupe dont la position est celle du client compte en entier. Un groupe `divise` ou `abstention` compte pour moitié. Un groupe opposé compte pour zéro.
4. Score = sièges ainsi comptés, divisés par les sièges des groupes de position connue.
5. Si des amendements en attente qui portent la position du client ont une prédiction Orcet, le score devient 0,7 × score + 0,3 × moyenne de ces prédictions (`POIDS_ORCET = 0.3`, section 5).

| Élément | Règle dans le code |
|---|---|
| Situation | `insuffisant` si moins de 3 groupes de position connue, `favorable` à partir de 0,55 (`SEUIL_FAVORABLE`), `defavorable` sous 0,40 (`SEUIL_DEFAVORABLE`), `incertaine` entre les deux |
| Tendance | Même calcul avec les données connues sept jours plus tôt. Écart de plus de 0,03 : `amelioration` ou `degradation`, sinon `stable` |
| Confiance, objectif principal | `elevee` si les positions viennent de scrutins, `moyenne` si elles viennent d'amendements, `faible` sans position |
| Confiance, objectifs de repli | `moyenne` si au moins un amendement de repli est déposé à la date de référence, sinon `faible` |
| Objectifs de repli | Comptent pour le client : les groupes auteurs d'amendements de nature `reduit` ou `reporte` (selon l'objectif) et les groupes opposés à la mesure. Contre : les groupes auteurs d'amendements `aggrave` |
| Cause du changement | L'événement non neutre le plus important de `nouveautes.json` sur les sept derniers jours, s'il passe les contrôles de `causeValide` |

Le fichier écrit le score arrondi à deux décimales, avec `score_libelle` : « part des sièges favorables à l'objectif », et `null` quand la situation est `insuffisant`. Les valeurs intermédiaires du calcul sont recopiées dans `meta.limits` de `verdict.json`.
La situation et le score de chaque dossier ne sont pas recopiés ici : ils sont dans `verdict.json` et, pour l'état mesuré, dans [docs/ETAT.md](ETAT.md).

Limites à connaître :

- Le niveau `elevee` dépend de l'origine des positions (scrutins), pas de leur nombre. Un dossier peut avoir ce niveau avec très peu de scrutins liés : leur nombre se lit dans `confiance.etabli`.
- Objectifs de repli : quand aucun amendement de nature `reduit` ou `reporte` n'est classé pour un dossier, le calcul ne compte que les groupes déjà opposés à la mesure. Le score peut alors valoir 1 avec une confiance `faible` : il ne mesure pas le soutien réel à un repli.
- Le score décrit un rapport de forces à l'Assemblée nationale. Le Sénat n'est pas analysé.
- Le commentaire du champ `score` dans `contracts/schemas/verdict.ts` parle encore de « probabilité que l'objectif soit atteint ». Il est en retard sur le code : le score n'est pas une probabilité.

## 5. Orcet

Orcet est le modèle de prédiction de vote d'Hémicycle. LegiSpot ne l'entraîne pas et ne le modifie pas. Le parcours d'une prédiction dans le code :

1. **Appel** : `pipeline/collecte/api.ts`, `POST /orcet/predictions` avec l'identifiant d'un amendement en attente, au plus 25 amendements par dossier (plafond `ORCET_MAX`, valeur par défaut), en commençant par ceux déjà retenus dans `texte.json`. La réponse brute est écrite dans `data/raw/`, hors dépôt. Un test manuel existe : `pipeline/collecte/orcet-test.ts`.
2. **Recopie dans `texte.json`** : le champ `moyenne_probabilites_pour` est lu par `predictionOrcet` (`pipeline/pivots/definitif.ts`) et recopié sous `amendements[].prediction.proba_pour`, avec `confiance`, `modele` et `date` (`contracts/schemas/texte.ts`). Seul un amendement en attente porte une prédiction.
3. **Lignes de `suite.json`** : `probablesOrcet` (`pipeline/suite/run.ts`) en tire au plus 8 lignes, sous `probables[].proba`. La lecture « adoption probable » à partir de 0,5 et « rejet probable » en dessous est une règle du projet, marquée `deduction`. Elle ne vient pas d'Orcet.
4. **Entrée dans le score du verdict** : `orcetMoyen` (`pipeline/pivots/verdict.ts`) fait la moyenne des prédictions des amendements en attente qui portent la position du client. Quand il y en a, cette moyenne entre pour 30 % dans le score (étape 5 de la section 4). Cela vaut pour l'objectif principal ; le code applique la même correction aux objectifs de repli quand leurs amendements en attente ont une prédiction.
5. **Affichage** : les prédictions ne sont affichées qu'à deux endroits. Dans le bloc Suite, sous la section repliée « Scénarios documentés » (`web/src/views/blocs/suite/index.tsx`). Dans le Verdict, sous « Fondements », qui reprend `confiance.etabli` (`web/src/views/blocs/verdict/index.tsx`). La vue du Verdict retire la clause Orcet du détail des raisons (`detailLisible`). Le composant `web/src/components/Proba.tsx` n'est importé par aucune vue.

Deux précisions :

- **Sens du nombre** : c'est la moyenne des probabilités individuelles de voter pour cet amendement. Ce n'est pas une probabilité d'adoption de l'amendement, et jamais une probabilité d'adoption de la mesure ou de la loi. Le schéma, `texte.json` et `verdict.json` l'écrivent.
- **Sans prédiction** : le champ vaut `null` et rien n'est affiché. Une prédiction datée après la date de référence d'un dossier est écartée.

Le nombre de prédictions par dossier, et les dossiers dont le score les utilise, sont dans [docs/ETAT.md](ETAT.md). Dans les données, ils se lisent dans `texte.json` (`prediction` non nul) et dans `confiance.etabli` de `verdict.json`.
Non vérifiable depuis le dépôt : les réponses brutes d'Orcet. La phrase de `suite.json` sur des prédictions « hors sujet », écrite quand un dossier n'a aucune ligne Orcet, est une chaîne fixe de `pipeline/suite/run.ts` : le nombre qu'elle cite n'est pas recalculé.

## 6. Featherless : ce que fait le modèle de langage

Client : `pipeline/lib/llm.ts`. Modèle codé par défaut : `Qwen/Qwen3.8-27B` (constante `MODELE`, remplaçable par la variable `FEATHERLESS_MODEL`). Température 0,2 (0,1 dans `pipeline/debats/classer.ts`), réflexion désactivée, 2 appels simultanés au plus. Sans clé `FEATHERLESS_API_KEY`, aucun appel n'est fait et chaque tâche a un repli.

Le tableau liste ce que le code **peut** confier au modèle. Il ne dit pas ce qui a été effectivement rédigé ou classé par le modèle dans `data/` (voir plus bas).

| Tâche que le code peut confier au modèle | Code et consigne | Sortie | Contrôle après l'appel | Fichier |
|---|---|---|---|---|
| Nature d'un amendement quand la règle ne tranche pas | `pipeline/pivots/lib/nature.ts` | JSON validé par Zod | Citation retrouvée dans le dispositif ou l'exposé, sinon `autre` | `texte.json` |
| Organisations entendues dans l'annexe d'un rapport | `pipeline/auditions/lib/organisations.ts`, `pipeline/auditions/lib/llm.ts` | JSON validé par Zod | Repli heuristique si rien d'utilisable | `auditions/<PA>.json` |
| Camp d'une prise de parole : pour, contre ou neutre, avec argument et citation | `pipeline/debats/classer.ts`, `classerTout` | JSON validé par Zod | Citation retrouvée mot pour mot, confiance d'au moins 0,7 | `arguments.json` |
| Second avis sur le camp | `pipeline/debats/classer.ts`, `verifierCamp` | JSON validé par Zod | Un désaccord écarte l'argument | `arguments.json` |
| Regroupement des arguments identiques | `pipeline/debats/classer.ts`, `regrouper` | JSON validé par Zod | Chaque indice dans un seul groupe | `arguments.json` |
| Phrase de lecture du verdict | `pipeline/pivots/verdict.ts`, `pipeline/verdict/prompts/lecture.md` | Texte | Vérificateur de nombres | `verdict.json` |
| Synthèse d'une fiche de député | `pipeline/fiches/lib/fiches.ts`, `pipeline/fiches/prompts/synthese.md` | Texte | Vérificateur de nombres, cohérence avec le classement | `fiches/<PA>.json` |
| Réponse à un argument adverse | `pipeline/fiches/lib/action.ts`, `pipeline/action/prompts/contre-argument.md` | Texte | Vérificateur de nombres | `action.json` |
| Compte rendu pour le client | `pipeline/note/run.ts`, `pipeline/note/prompts/note.md` | Texte | Vérificateur de nombres, liste de formulations interdites | `note.json` |

Format de sortie : les tâches d'extraction et de classement rendent un objet JSON validé par un schéma Zod (`appelStructure` dans `pipeline/lib/llm.ts`, ou `response_format: json_object` dans `pipeline/debats/classer.ts`). Les tâches de rédaction rendent du texte libre, contrôlé ensuite (section 7).

Cache : nature dans `pipeline/pivots/.cache/`, rédactions dans `pipeline/fiches/.cache/`, débats et auditions dans `data/raw/`. Aucun de ces caches n'est dans le dépôt. La phrase du verdict et le compte rendu n'ont pas de cache dans le code lu. Une régénération rappelle donc le modèle et peut donner un texte différent.

**Ce qui est effectivement produit par le modèle dans les données.** Dans `data/`, une partie des textes n'est pas écrite par le modèle mais par gabarit (section 7). C'est le cas d'une part des synthèses de fiche de député et des réponses aux arguments, alors que les phrases de lecture du verdict et les comptes rendus sont en règle générale écrits par le modèle. La répartition change à chaque régénération et diffère d'un dossier à l'autre. Elle se lit à deux endroits : dans le champ `mode` de chaque texte (`llm` ou `gabarit`), et, pour le décompte par dossier, dans [docs/ETAT.md](ETAT.md).

**Classement des arguments par règles de mots, sans modèle.** Avec l'option `--sans-classement` de `pipeline/debats/run.ts`, `classerParRegles` (`pipeline/debats/classer.ts`) déduit le camp d'un mot présent dans une phrase qui cite le sujet (par exemple « supprimer » ou « baisse » : contre ; « économies » : pour), avec une confiance fixe de 0,7, sans second avis ni regroupement. Selon le dossier, `arguments.json` a donc été classé par le modèle ou par ces règles. La méthode se lit dans `meta.limits` de `data/<dossier>/arguments.json` (mention « Version rapide » pour les règles de mots, avec « chaque argument à relire ») et dans `preuve.raisonnement` de chaque argument. La liste des dossiers concernés n'est pas figée ici : elle est dans [docs/ETAT.md](ETAT.md). `status/A2.md` consigne l'historique de ces choix et des faux amis assumés de la version par règles (16 h 12, « baisse démographique »).
Le repli de classement manuel évoqué dans `pipeline/debats/classer.ts` (un dossier `classement-manuel` à côté de ce fichier) n'existe pas dans le dépôt.

**Ce que le modèle ne fait pas** : il ne calcule ni score, ni décompte de sièges, ni position de groupe, ni loyauté. Il ne fixe ni la situation, ni la tendance, ni la confiance du verdict. Il ne classe pas les députés. Il ne produit ni les événements, ni leur effet, ni les échéances, ni les prédictions Orcet. Les résumés d'amendement, les sorts et la mention « travaillé avec » sont produits par règles (`pipeline/amendements/lib/normaliser.ts`, `pipeline/pivots/definitif.ts`). Le modèle ne reçoit aucun vote brut : il reçoit des faits et des nombres déjà calculés.

- Nuance : une sortie du modèle peut entrer dans un calcul. Une prise de parole qu'il a classée devient un acte `dit` dans le classement des députés (section 3). Une nature qu'il a posée (`nature_mode: "llm"`) entre dans le verdict (section 4).
- Les garde-fous du compte rendu (`interdits` dans `pipeline/note/run.ts`) sont des listes d'expressions : ils bloquent des formulations, pas des erreurs de fond.

## 7. Vérificateur de nombres et repli sur gabarit

`pipeline/lib/verif.ts` (`verifierChiffres`, ré-exporté par `qa/verif.ts`) contrôle un texte contre une liste de nombres autorisés, en cinq étapes : (1) il normalise les nombres (espaces, virgule décimale) ; (2) il extrait les nombres en chiffres et les ordinaux, hors identifiants collés à des lettres ; (3) il étend la liste autorisée : une probabilité 0,71 autorise 71, une date `2025-11-19` autorise 19, 11 et 2025, les années 2024 à 2027 sont toujours permises ; (4) il extrait les nombres en lettres (« un » et « une » sont tolérés) ; (5) il rejette tout nombre absent de la liste et rend les jetons fautifs.

`redigerVerifie` (`pipeline/lib/llm.ts`) fait au plus 3 tentatives. Chaque sortie fautive est renvoyée au modèle avec la liste des nombres à retirer. En cas d'échec, de clé absente ou de panne, le texte rendu est un gabarit rempli par le code, avec `mode: "gabarit"` et `modele: null`. Les gabarits sont dans `pipeline/verdict/prompts/gabarit-lecture.md`, `pipeline/fiches/prompts/gabarit-synthese.md`, `pipeline/action/prompts/gabarit-contre-argument.md`, `pipeline/note/prompts/gabarit-note.md` et `pipeline/fiches/lib/gabarits.ts`.
Chaque texte rédigé porte dans son JSON `mode`, `verifie` et `chiffres_utilises`.

Signalement dans l'application, lu dans `web/` : le composant `Redaction` (`web/src/views/depute/commun.tsx`) affiche « Synthèse structurée » pour un gabarit et « Analyse proposée » pour un texte du modèle. Il est utilisé pour la synthèse des fiches (`web/src/views/depute/index.tsx`) et les réponses aux arguments (`web/src/views/blocs/action/index.tsx`). `web/src/components/Badge.tsx` définit les libellés « rédaction par gabarit » et « chiffres contrôlés ». Dans le code lu, les vues du Verdict et du Compte rendu n'affichent pas le champ `mode`.

Ce que le vérificateur ne fait pas : il ne contrôle pas qu'un nombre est rattaché au bon objet, ni la justesse d'une phrase sans nombre. Dans `qa/check.ts`, le texte est comparé à la liste `chiffres_utilises` du même fichier : c'est un contrôle de cohérence interne, pas une comparaison avec la source.

## 8. HATVP

`pipeline/collecte/hatvp.ts` lit le répertoire des représentants d'intérêts et garde, par dossier, les organisations dont une fiche d'activité des exercices 2024 à 2026 contient un mot-clé du sujet dans son objet ou ses observations, et vise des parlementaires ou une loi. Le type d'organisation et le libellé court des actions sont déduits par expressions régulières.

- **Données déclaratives** : le répertoire contient ce que les organisations déclarent. Une fiche n'établit ni un contact avec un député précis ni un effet sur le texte.
- **Filtre par mots-clés** : une fiche peut viser un autre texte sur le même sujet, et un mot-clé court peut retenir une organisation à tort (`meta.limits` de chaque `hatvp.json`).
- **Décalage** : les activités d'un exercice sont publiées après sa clôture. Celles de l'automne 2026 n'y sont pas.
- **Pas de date** : le schéma prévoit un champ facultatif `date_declaration` (`contracts/schemas/hatvp.ts`), mais `pipeline/collecte/hatvp.ts` ne le renseigne pas. `pipeline/fiches/lib/nouveautes.ts` ne liste une déclaration comme événement que si elle est datée : aucune déclaration HATVP n'apparaît donc comme événement daté dans `nouveautes.json`.
- Le nombre d'organisations retenues par dossier se lit dans chaque `hatvp.json`.

## 9. Relecture historique : `petits-colis` au 19 novembre 2025

`data/config.json` fixe `date_reference: "2025-11-19"` pour ce dossier. La date est lue comme le matin de ce jour. La règle est dans `coupure` (`pipeline/pivots/lib/sujet.ts`) : un dépôt, une publication ou une annonce est connu s'il est daté au plus tard du 19 ; un sort, un scrutin, une séance ou une décision n'est connu que s'il est daté strictement avant le 19.

La même règle est appliquée dans `pipeline/pivots/definitif.ts` (un sort daté du 19 ou après redevient `en_attente`), `pipeline/amendements/lib/normaliser.ts`, `pipeline/debats/seance.ts` et `pipeline/debats/commission.ts`, `pipeline/auditions/run.ts` (rapports publiés au plus tard le 19), `pipeline/fiches/lib/io.ts` (`posterieur`, `pasEncoreConnu`), `pipeline/suite/run.ts` et `pipeline/note/run.ts`. `qa/check.ts` la recontrôle sur les événements, les échéances, les amendements, les écarts de vote, les débats et les arguments.
Conséquence de la règle : ce dossier ne porte aucune prédiction Orcet, puisqu'une prédiction calculée en 2026 est postérieure à la date de référence et donc écartée. Le nombre d'événements et d'amendements du dossier est dans [docs/ETAT.md](ETAT.md).

Limites de la reconstruction :

- **Sorts sans date publiée** : un sort d'amendement sans date dans la source n'est pas listé comme événement daté (`pipeline/fiches/lib/nouveautes.ts`, compté dans `meta.limits` de `nouveautes.json`). Ce sort reste affiché dans `texte.json` quand le dépôt est antérieur au 19 : le code ne peut pas exclure qu'il soit postérieur à la date de référence.
- **Groupes et députés d'aujourd'hui** : effectifs, composition des groupes et liste des députés sont ceux de l'export du 14 novembre 2026, pas ceux de novembre 2025 (`meta.limits` de `data/groupes.json` et `data/deputes.json`). Le président de la commission des finances est lu à la date de génération.
- **HATVP non coupé** : `pipeline/collecte/hatvp.ts` n'applique pas la date de référence.
- **Jour de discussion** : `pipeline/suite/run.ts` repère le jour où l'article vient en séance grâce à la date du premier scrutin public sur cet article à partir du 19. Seule la date est utilisée, pas le résultat, mais elle n'était pas connue ce matin-là.
- **État actuel des sources** : les textes sont lus tels que publiés aujourd'hui. Une rectification postérieure n'est pas détectable.
- **Modèle de langage** : ses consignes ne contiennent que des faits antérieurs à la date. Ce qu'il sait par ailleurs de la suite réelle n'est pas vérifiable.

## 10. Ce que la validation automatique vérifie

Commandes (`package.json`) : `bun run check` lance `bun qa/check.ts`, qui appelle `qa/croise.ts`, puis `node pipeline/publication.mjs --check`. `npm run build` lance ce même contrôle du sceau avant `vite build`. `bun run publish:data` lance `node pipeline/publication.mjs`.
Sans argument, `qa/check.ts` contrôle `data/` et le jeu d'exemple `contracts/fixtures/`. Il accepte `--root` (une autre racine) et `--dossier` (un seul dossier). Le résultat de ces commandes sur l'état courant du dépôt n'est pas recopié ici : il est dans [docs/ETAT.md](ETAT.md). Le mode d'emploi est dans [docs/REPRODUCE.md](REPRODUCE.md).

**(a) Conformité aux schémas** (`qa/check.ts`, fonction `charger`). Portée réelle : les quatre fichiers de la racine (`data/config.json`, `data/groupes.json`, `data/deputes.json`, `data/cohesion.json`), puis, par dossier, `texte.json`, `pivots.json`, `hatvp.json`, `note.json`, `fiches/index.json`, `verdict.json`, `nouveautes.json`, `suite.json`, `action.json`, `etat.json`, `groupes-action.json` et `arguments.json`. Chacun doit exister, se lire et respecter son schéma Zod de `contracts/schemas/` (types, énumérations, champs obligatoires, format des dates et des adresses), avec un `dossier_id` de `meta` conforme.
Les fichiers par député (`auditions/<PA>.json`, `debats/<PA>.json`, `amendements/<PA>.json`, `fiches/<PA>.json`) ne sont chargés et validés que pour les députés listés dans `pivots.json`. Les fichiers des autres députés ne passent pas par leur schéma. `qa/check.ts` ne valide donc pas chaque JSON de `data/`. Les fichiers `publication.json` n'ont pas de schéma.

**(b) Cohérence des nombres et des références** :

- identifiants : tout `groupe_id` existe dans `data/groupes.json`, tout député dans `data/deputes.json`, la cause du changement d'un verdict existe dans `nouveautes.json`, une réponse renvoie à un argument présent ;
- fiches des députés de `pivots.json` : chaque fiche est la fusion exacte des fichiers d'auditions, de débats, d'amendements et de `hatvp.json` ;
- nombres : chaque nombre d'un texte rédigé figure dans son `chiffres_utilises` ; un texte en gabarit a `modele: null` ; une situation `insuffisant` a un score `null` ;
- date de référence : rien de postérieur (section 9) ;
- contrôle croisé (`qa/croise.ts`) : même sort et même nature d'un amendement dans `texte.json` et dans les fichiers de `amendements/` et de `fiches/`, même groupe pour un député, aucun député sans acte personnel dans les listes classées ;
- compte rendu et verdict (`qa/croise.ts`) : le texte de `note.json` doit contenir un mot qui exprime la situation de l'objectif principal. Le score n'est comparé que si le compte rendu cite un pourcentage « des sièges » : ce pourcentage doit alors être celui de `verdict.json`. Un compte rendu qui ne cite aucun pourcentage est accepté, ce qui est cohérent avec la consigne `pipeline/note/prompts/note.md`, qui demande de ne citer le score que s'il est indispensable.

**(c) Exactitude des conclusions : non vérifiée automatiquement.** Aucun contrôle ne dit si un amendement porte vraiment sur la mesure, si son sens ou sa nature sont justes, si la position d'un groupe est la bonne, si un orateur est dans le bon camp, si un résumé est fidèle, si une adresse de source prouve ce qu'elle accompagne (seul son format est contrôlé) ou si un verdict correspond à la réalité. L'exactitude des citations est contrôlée au moment de la production (`pipeline/debats/classer.ts`, `pipeline/pivots/lib/nature.ts`), pas par `qa/`. Ces points relèvent d'une relecture humaine, qui n'est pas documentée dans le dépôt.

**(d) Sceau de publication** (`pipeline/publication.mjs`). `bun run publish:data` lance d'abord `qa/check.ts` sur chaque dossier et refuse de sceller en cas d'erreur. Il écrit ensuite `data/<dossier>/publication.json` : pour dix fichiers principaux (`verdict.json`, `nouveautes.json`, `suite.json`, `action.json`, `note.json`, `etat.json`, `texte.json`, `pivots.json`, `hatvp.json`, `fiches/index.json`), l'empreinte SHA-256 du fichier, sa date de génération et son producteur. Avec `--check`, le script recalcule ces empreintes et échoue si un fichier scellé manque, a changé ou ne porte plus les mêmes métadonnées. `npm run build` et `bun run check` échouent alors.

- Ce que le sceau garantit : les dix fichiers scellés d'un dossier sont identiques, octet pour octet, à ceux qui ont passé la validation (a) et (b) au moment de la publication.
- Ce qu'il ne garantit pas : l'exactitude du contenu (point c), ni la fraîcheur des données par rapport aux sources. Il ne couvre pas les fichiers hors de cette liste : `groupes-action.json`, `arguments.json`, les fichiers par député et les quatre fichiers de la racine de `data/`. Ce n'est pas une validation humaine : relancer `bun run publish:data` rescelle l'état courant dès que la validation automatique passe.
- Un dossier incomplet et sans sceau est ignoré par `--check` avec un avertissement, sauf s'il est demandé par `--dossier`.

Tests : `qa/verif.test.ts` (vérificateur de nombres) et `pipeline/lib/llm.test.ts` (appel au modèle, hors réseau). `bun test` lance les deux fichiers ; `bun run test` ne lance que ceux de `qa/`.
Limite : il n'existe aucun test automatique de la règle du verdict, ni des positions, ni du rattachement des amendements à la mesure. Ces règles ne sont contrôlées que par les vérifications de cohérence ci-dessus et par relecture.
