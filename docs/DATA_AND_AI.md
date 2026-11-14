# Données, règles de calcul et rôle des modèles

Ce document décrit ce que LegiSpot (dépôt : « Legiscope ») collecte, calcule et fait rédiger, tel que cela se lit dans le code et dans `data/` le 14 novembre 2026 vers 17 h.
Chaque point renvoie aux fichiers qui le prouvent. Les chiffres « mesurés » ont été comptés dans `data/` avec `jq`. Les pipelines n'ont pas été relancés pour l'écrire.
Les organisations affichées comme clients (Alibaba France, Afep, U2P, FNSEA, Union sociale pour l'habitat, CAPEB) sont des exemples : aucune n'est cliente du projet.

Trois précautions de lecture :

- `data/raw/` et `pipeline/*/.cache/` sont exclus du dépôt (`.gitignore`). Les réponses brutes des API, les archives téléchargées et les caches du modèle ne sont donc pas vérifiables depuis le dépôt : seuls les fichiers dérivés de `data/<dossier>/` le sont.
- Chaque fichier JSON porte un bloc `meta` (`contracts/schemas/meta.ts`) avec ses sources et ses limites en clair (`meta.limits`). C'est la description la plus précise de chaque fichier.
- Chaque information affichée porte une preuve (`contracts/schemas/preuve.ts`) de nature `fait` (publié par une source), `deduction` (produit par l'outil) ou `inconnue`.

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
| API Hémicycle | Prédictions Orcet, accord entre groupes, loyauté, flux d'événements | `pipeline/collecte/api.ts`, `pipeline/fiches/lib/evenements-api.ts` | `prediction` dans `texte.json`, puis `verdict.json` et `suite.json` ; dépôts par jour dans `nouveautes.json` |
| Featherless | Appels à un modèle de langage | `pipeline/lib/llm.ts` | Voir section 6 |

Précisions sur l'API Hémicycle, lues dans le code :

- Le client unique est `pipeline/collecte/lib/hemicycle.ts` (compteur de crédits, arrêt sous 150 crédits restants, journal dans `data/raw/`).
- `pipeline/collecte/api.ts` fait trois types d'appel : `POST /orcet/predictions`, `POST /agregats/accord-groupes`, `POST /agregats/loyaute-deputes`. Seules les prédictions Orcet sont relues par la suite du pipeline. Aucun script hors de `pipeline/collecte/` ne lit `data/raw/accord-groupes` ni `data/raw/loyaute` : la cohésion et la loyauté affichées sont recalculées à partir des scrutins open data (`pipeline/cohesion/`, `pipeline/pivots/lib/loyaute.ts`).
- Les scrutins, votes, amendements, députés et groupes de `data/` viennent de l'open data de l'Assemblée, pas de l'API. `data/groupes.json` et `data/deputes.json` l'écrivent dans leur `meta.limits`.
- `pipeline/fiches/lib/evenements-api.ts` interroge le jeu `evenements_parlementaires` (30 derniers jours), seulement avec l'option `--api`. Mesuré dans les `meta.limits` de `nouveautes.json` : 187 lignes pour les dossiers holdings, apprentissage et agriculture, 0 pour `petits-colis`.
- `pipeline/collecte/mesure.ts` n'est pas un traitement des données : c'est un script de mesure du coût de l'API (un appel de chaque type, sortie dans `data/raw/mesure.json`). Il n'est pas appelé par `run.ts`.

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
- Nature de l'amendement (`pipeline/pivots/lib/nature.ts`) : `supprime`, `reduit`, `reporte`, `aggrave` ou `autre`. Règle d'abord, sinon modèle de langage avec contrôle de citation, sinon `autre`. Le champ `nature_mode` de `texte.json` dit lequel.

Mesuré dans `data/*/texte.json` (312 amendements au total) : 110 natures posées par règle, 1 par le modèle (`plf2027-renovation`), 201 par défaut à `autre`.

Limites :

- La mesure est déclarée à la main et suivie par mots-clés. Des mots-clés généraux (« colis », « holding », « agricult ») peuvent retenir un amendement à tort ou en manquer un.
- Le sens et la nature d'un amendement sont une lecture de l'outil, pas un fait publié. `texte.json` l'écrit dans ses limites.
- Les trois filtres peuvent diverger sur un même amendement, et un même amendement peut entrer dans deux dossiers : l'amendement n° 107 de seconde partie figure dans `plf2027-logement` et dans `plf2027-renovation`.
- Dossier `plf2027-holdings` : le contrôle des 15 % écarte l'article 3 déclaré (0 % de ses amendements citent le sujet). `etat.json` indique donc `dans_le_texte: false`. Le dossier rassemble des propositions fiscales voisines (taxe sur les holdings, fortune improductive, propositions dites « Zucman », débats du budget 2026) par mots-clés. Ces rapprochements n'ont pas été relus un par un et rien dans le dépôt n'en documente la validation. `status/A2.md` (14 h 10) note que le classement d'un orateur « par rapport à la mesure » y reste ambigu. Dans `texte.json`, les 37 amendements de ce dossier ont la nature `autre` par défaut. La raison n'est pas vérifiable depuis le dépôt.

## 3. Position des groupes et des députés

**Groupes** (`pipeline/pivots/lib/sujet.ts`, appelé par `pipeline/pivots/run.ts`) :

- `positionsDepuisScrutins` : pour chaque scrutin lié de sens connu, la position majoritaire du groupe est traduite en position sur la mesure. Le groupe est `pour`, `contre` ou `abstention` si au moins 60 % de ses positions vont dans le même sens, sinon `divise`.
- Si moins de 3 groupes ont une position par les scrutins, le code se replie sur `positionsDepuisAmendements` : sens des amendements déposés par des membres du groupe.
- Un groupe sans scrutin lié ni amendement de sens lisible a la position `null`.

Mesuré : `petits-colis` repose sur les amendements (0 scrutin lié avant la date de référence). Les cinq autres dossiers reposent sur des scrutins : 21 pour `plf2027-holdings`, 4 pour `plf2027-logement`, 3 pour `plf2027-apprentissage`, 2 pour `plf2027-agriculture`, 1 pour `plf2027-renovation` (`meta.limits` de `pivots.json`).

**Députés** (`actesPropres` et `construireGroupesAction` dans `pipeline/pivots/definitif.ts`, schémas dans `contracts/schemas/action.ts`). Un député n'est classé que sur ses propres actes, de trois types (champ `fondement`) : `vote` (son vote sur un scrutin lié, traduit en position sur la mesure), `depose` (un amendement de sens connu qu'il a déposé ou cosigné), `dit` (une prise de parole classée pour ou contre dans `arguments.json`, section 6).

| Catégorie | Règle |
|---|---|
| Alliés | La majorité de ses actes va dans le sens du client |
| Perdus | Ses actes vont contre le client, sa loyauté sur 12 mois est d'au moins 0,85 et son groupe est lui-même opposé |
| Sur qui agir (`actionnables`) | Actes opposés mais au moins un vote contraire à son groupe, ou loyauté sous 0,85, ou actes dans les deux sens |
| Position inconnue | Aucun acte personnel lié à la mesure. La position du groupe est donnée en contexte, pas comme classement (`preuve.nature: "inconnue"`) |

Chaque liste est coupée à 15 députés, sauf `position_inconnue`, gardée en entier. Mesuré dans `groupes-action.json` : 343 députés en position inconnue pour `petits-colis`, 110 agriculture, 85 apprentissage, 24 holdings, 95 logement, 200 rénovation, sur 574 députés dans `data/deputes.json`.
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
5. Si des amendements en attente qui portent la position du client ont une prédiction Orcet, le score devient 0,7 × score + 0,3 × moyenne de ces prédictions (`POIDS_ORCET = 0.3`).

| Élément | Règle dans le code |
|---|---|
| Situation | `insuffisant` si moins de 3 groupes de position connue, `favorable` à partir de 0,55 (`SEUIL_FAVORABLE`), `defavorable` sous 0,4 (`SEUIL_DEFAVORABLE`), `incertaine` entre les deux |
| Tendance | Même calcul avec les données connues sept jours plus tôt. Écart de plus de 0,03 : `amelioration` ou `degradation`, sinon `stable` |
| Confiance, objectif principal | `elevee` si les positions viennent de scrutins, `moyenne` si elles viennent d'amendements, `faible` sans position |
| Confiance, objectifs de repli | `moyenne` si au moins un amendement de repli est déposé à la date de référence, sinon `faible` |
| Objectifs de repli | Comptent pour le client : les groupes auteurs d'amendements de nature `reduit` ou `reporte` (selon l'objectif) et les groupes opposés à la mesure. Contre : les groupes auteurs d'amendements `aggrave` |
| Cause du changement | L'événement non neutre le plus important de `nouveautes.json` sur les sept derniers jours, s'il passe les contrôles de `causeValide` |

Le fichier écrit le score arrondi à deux décimales, avec `score_libelle` : « part des sièges favorables à l'objectif », et `null` quand la situation est `insuffisant`. Les valeurs intermédiaires du calcul sont recopiées dans `meta.limits` de `verdict.json`.

Mesuré dans `data/*/verdict.json`, objectif principal : `petits-colis` défavorable 0,23 ; `plf2027-agriculture` incertaine 0,48 ; `plf2027-apprentissage` incertaine 0,51 ; `plf2027-holdings` favorable 0,66 ; `plf2027-logement` favorable 0,60 ; `plf2027-renovation` défavorable 0,33.

Limites à connaître :

- Le niveau `elevee` dépend de l'origine des positions (scrutins), pas de leur nombre. `plf2027-renovation` a ce niveau avec 1 scrutin lié, `plf2027-agriculture` avec 2.
- Pour les cinq dossiers du budget 2027, les objectifs de repli ont un score de 1 avec une confiance `faible` : aucun amendement de nature `reduit` ou `reporte` n'y est classé. Le calcul ne compte alors que les groupes déjà opposés à la mesure, d'où un score de 1 : il ne mesure pas le soutien réel à un repli.
- Le score décrit un rapport de forces à l'Assemblée nationale. Le Sénat n'est pas analysé.
- Le commentaire du champ `score` dans `contracts/schemas/verdict.ts` parle encore de « probabilité que l'objectif soit atteint ». Il est en retard sur le code : le score n'est pas une probabilité.

## 5. Orcet

Orcet est le modèle de prédiction de vote d'Hémicycle. LegiSpot ne l'entraîne pas et ne le modifie pas.

- **Appel** : `pipeline/collecte/api.ts`, `POST /orcet/predictions` avec l'identifiant d'un amendement en attente, au plus 25 amendements par dossier (`ORCET_MAX`), en commençant par ceux déjà retenus dans `texte.json`. Un test manuel existe : `pipeline/collecte/orcet-test.ts`.
- **Champ utilisé** : `moyenne_probabilites_pour`, lu par `predictionOrcet` (`pipeline/pivots/definitif.ts`) et `orcetMoyen` (`pipeline/pivots/verdict.ts`). Il est recopié dans `texte.json` sous `amendements[].prediction.proba_pour`, avec `confiance`, `modele` et `date` (`contracts/schemas/texte.ts`).
- **Sens** : c'est la moyenne des probabilités individuelles de voter pour cet amendement. Ce n'est pas une probabilité d'adoption de l'amendement, et jamais une probabilité d'adoption de la mesure ou de la loi. Le schéma, `texte.json` et `verdict.json` l'écrivent.
- **Usages** : correction du score du verdict (section 4) et lignes « probables » de `suite.json` (`probablesOrcet` dans `pipeline/suite/run.ts`, 8 lignes au plus). La lecture « adoption probable » à partir de 0,5 et « rejet probable » en dessous est une règle du projet, marquée `deduction`. Elle ne vient pas d'Orcet.
- **Sans prédiction** : le champ vaut `null` et rien n'est affiché. Une prédiction datée après la date de référence d'un dossier est écartée.

Prédictions réellement présentes dans `data/`, comptées dans `data/<dossier>/texte.json` (`prediction` non nul) :

| Dossier | Amendements | En attente | Avec prédiction | Valeurs de `proba_pour` | Lignes Orcet dans `suite.json` | Utilisé dans le score |
|---|---|---|---|---|---|---|
| `petits-colis` | 77 | 31 | 0 | aucune | 0 | non |
| `plf2027-holdings` | 37 | 0 | 0 | aucune | 0 | non |
| `plf2027-apprentissage` | 52 | 24 | 24 | 0,25 à 0,57 | 8 | oui : 2 amendements, moyenne 0,46 |
| `plf2027-agriculture` | 78 | 23 | 6 | 0,31 à 0,89 | 6 | oui : 5 amendements, moyenne 0,48 |
| `plf2027-logement` | 44 | 12 | 2 | 0,26 et 0,38 | 2 | non |
| `plf2027-renovation` | 24 | 3 | 1 | 0,26 | 1 | non |

Total : 33 prédictions sur 32 amendements distincts (le n° 107 est compté dans deux dossiers). Toutes portent le modèle `v1-mirt2d-tfidf-live-2026-06` et la date du 14 novembre 2026.
Non vérifiable : les réponses brutes d'Orcet (`data/raw/<dossier>/orcet/`) ne sont pas dans le dépôt. La phrase de `suite.json` du dossier holdings sur « 7 prédictions hors sujet » est une chaîne écrite en dur dans `pipeline/suite/run.ts`.

## 6. Featherless : ce que fait le modèle de langage

Client : `pipeline/lib/llm.ts`. Modèle codé par défaut : `Qwen/Qwen3.8-27B` (constante `MODELE`, remplaçable par la variable `FEATHERLESS_MODEL`). Température 0,2 (0,1 dans `pipeline/debats/classer.ts`), réflexion désactivée, 2 appels simultanés au plus. Sans clé `FEATHERLESS_API_KEY`, aucun appel n'est fait et chaque tâche a un repli.

| Tâche confiée au modèle | Code et consigne | Sortie | Contrôle après l'appel | Fichier |
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

Cache : nature dans `pipeline/pivots/.cache/nature.json`, rédactions dans `pipeline/fiches/.cache/redaction/`, débats dans `data/raw/debats/`, auditions dans `data/raw/opendata/rapports/`. Aucun de ces caches n'est dans le dépôt. La phrase du verdict et le compte rendu n'ont pas de cache dans le code lu. Une régénération rappelle donc le modèle et peut donner un texte différent.

**Ce que le modèle ne fait pas** : il ne calcule ni score, ni décompte de sièges, ni position de groupe, ni loyauté. Il ne fixe ni la situation, ni la tendance, ni la confiance du verdict. Il ne classe pas les députés. Il ne produit ni les événements, ni leur effet, ni les échéances, ni les prédictions Orcet. Les résumés d'amendement, les sorts et la mention « travaillé avec » sont produits par règles (`pipeline/amendements/lib/normaliser.ts`, `pipeline/pivots/definitif.ts`). Le modèle ne reçoit aucun vote brut : il reçoit des faits et des nombres déjà calculés.

- Nuance : une sortie du modèle peut entrer dans un calcul. Une prise de parole qu'il a classée devient un acte `dit` dans le classement des députés (section 3). Une nature qu'il a posée entre dans le verdict (section 4), ce qui concerne 1 amendement dans `data/`.
- Les garde-fous du compte rendu (`interdits` dans `pipeline/note/run.ts`) sont des listes d'expressions : ils bloquent des formulations, pas des erreurs de fond.

**Traitements par règles de mots, sans modèle.** Avec l'option `--sans-classement`, `classerParRegles` (`pipeline/debats/classer.ts`) déduit le camp d'un mot présent dans une phrase qui cite le sujet (par exemple « supprimer » ou « baisse » : contre ; « économies » : pour), avec une confiance fixe de 0,7 et sans second avis. Mesuré dans `arguments.json` (`meta.limits` et `preuve.raisonnement`) :

| Dossier | Arguments retenus | Mode de classement |
|---|---|---|
| `petits-colis` | 17 | modèle |
| `plf2027-holdings` | 42 | modèle |
| `plf2027-apprentissage` | 9 | modèle |
| `plf2027-agriculture` | 41 (2 pour, 39 contre) | règles de mots, « à relire » |
| `plf2027-logement` | 34 (2 pour, 32 contre) | règles de mots, « à relire » |
| `plf2027-renovation` | 8 (3 pour, 5 contre) | règles de mots, « à relire » |

`status/A2.md` (16 h 58) confirme cette « version rapide » pour les trois derniers dossiers, et signale des faux amis assumés (16 h 12, « baisse démographique »). Le repli de classement manuel prévu dans `classer.ts` (`pipeline/debats/classement-manuel/`) n'existe pas dans le dépôt.

Textes en gabarit mesurés dans `data/` : les 15 synthèses et les 2 réponses de `plf2027-agriculture`, 3 synthèses de `plf2027-apprentissage`, 1 de `plf2027-holdings`. Les 18 phrases de verdict et les 6 comptes rendus sont en mode `llm`. `plf2027-logement` et `plf2027-renovation` n'ont ni `action.json`, ni `nouveautes.json`, ni fiches.

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
- **Pas de date** : aucune des six listes ne porte `date_declaration` (mesuré : 0). Aucune déclaration n'apparaît donc comme événement daté dans `nouveautes.json`.
- Mesuré : 34 organisations pour `petits-colis`, 23 holdings, 93 apprentissage, 87 agriculture, 72 logement, 120 rénovation.

## 9. Relecture historique : `petits-colis` au 19 novembre 2025

`data/config.json` fixe `date_reference: "2025-11-19"` pour ce dossier. La date est lue comme le matin de ce jour. La règle est dans `coupure` (`pipeline/pivots/lib/sujet.ts`) : un dépôt, une publication ou une annonce est connu s'il est daté au plus tard du 19 ; un sort, un scrutin, une séance ou une décision n'est connu que s'il est daté strictement avant le 19.

La même règle est appliquée dans `pipeline/pivots/definitif.ts` (un sort daté du 19 ou après redevient `en_attente`), `pipeline/amendements/lib/normaliser.ts`, `pipeline/debats/seance.ts` et `commission.ts`, `pipeline/auditions/run.ts` (rapports publiés au plus tard le 19), `pipeline/fiches/lib/io.ts` (`posterieur`, `pasEncoreConnu`), `pipeline/suite/run.ts` et `pipeline/note/run.ts`. `qa/check.ts` la recontrôle sur les événements, les échéances, les amendements, les écarts de vote, les débats et les arguments.
Mesuré : `nouveautes.json` contient 105 événements, le plus récent daté du 19 novembre 2025, et le sort, scrutin ou séance le plus récent daté du 18. `texte.json` contient 8 amendements déposés le 19 et aucune prédiction Orcet (une prédiction calculée en 2026 est écartée).

Limites de la reconstruction :

- **Sorts sans date publiée** : 22 sorts d'amendement n'ont pas de date dans la source. Ils ne sont pas listés comme événements datés (`pipeline/fiches/lib/nouveautes.ts`, compté dans `meta.limits`). Leur sort reste affiché dans `texte.json` quand le dépôt est antérieur au 19 : le code ne peut pas exclure qu'un tel sort soit postérieur à la date de référence.
- **Groupes et députés d'aujourd'hui** : effectifs, composition des groupes et liste des députés sont ceux de l'export du 14 novembre 2026, pas ceux de novembre 2025 (`meta.limits` de `data/groupes.json` et `data/deputes.json`). Le président de la commission des finances est lu à la date de génération.
- **HATVP non coupé** : `pipeline/collecte/hatvp.ts` n'applique pas la date de référence.
- **Jour de discussion** : `pipeline/suite/run.ts` repère le jour où l'article vient en séance grâce à la date du premier scrutin public sur cet article à partir du 19. Seule la date est utilisée, pas le résultat, mais elle n'était pas connue ce matin-là.
- **État actuel des sources** : les textes sont lus tels que publiés aujourd'hui. Une rectification postérieure n'est pas détectable.
- **Modèle de langage** : ses consignes ne contiennent que des faits antérieurs à la date. Ce qu'il sait par ailleurs de la suite réelle n'est pas vérifiable.

## 10. Ce que la validation automatique vérifie

`bun run check` lance `qa/check.ts`, qui appelle `qa/croise.ts`.

**(a) Conformité aux schémas** (`qa/check.ts`, fonction `charger`) : chaque fichier attendu existe, se lit, et respecte son schéma Zod de `contracts/schemas/` (types, énumérations, champs obligatoires, format des dates et des adresses). Le `dossier_id` de `meta` correspond au dossier.

**(b) Cohérence des nombres et des références** :

- identifiants : tout `groupe_id` existe dans `groupes.json`, tout député dans `deputes.json`, la cause du changement d'un verdict existe dans `nouveautes.json`, une réponse renvoie à un argument présent ;
- fiches : chaque fiche est la fusion exacte des fichiers d'auditions, de débats, d'amendements et de `hatvp.json` ;
- nombres : chaque nombre d'un texte rédigé figure dans son `chiffres_utilises` ; un texte en gabarit a `modele: null` ; une situation `insuffisant` a un score `null` ;
- date de référence : rien de postérieur (section 9) ;
- contrôle croisé (`qa/croise.ts`) : même sort et même nature d'un amendement dans tous les fichiers, même groupe pour un député, aucun député sans acte personnel dans les listes classées, situation et score du verdict repris dans le compte rendu.

**(c) Exactitude des conclusions : non vérifiée automatiquement.** Aucun contrôle ne dit si un amendement porte vraiment sur la mesure, si son sens ou sa nature sont justes, si la position d'un groupe est la bonne, si un orateur est dans le bon camp, si un résumé est fidèle, si une adresse de source prouve ce qu'elle accompagne (seul son format est contrôlé) ou si un verdict correspond à la réalité. L'exactitude des citations est contrôlée au moment de la production (`pipeline/debats/classer.ts`, `pipeline/pivots/lib/nature.ts`), pas par `qa/`. Ces points relèvent d'une relecture humaine, qui n'est pas documentée dans le dépôt.

Tests : `qa/verif.test.ts` (10 tests du vérificateur) et `pipeline/lib/llm.test.ts` (9 tests de l'appel au modèle, hors réseau). Aucun test ne couvre les règles du verdict, des positions ou du rattachement.

État mesuré le 14 novembre 2026 vers 17 h : `bun qa/check.ts --root data` rend 56 erreurs. 51 sont des fichiers manquants dans `plf2027-logement` et `plf2027-renovation`, 2 des fiches d'`plf2027-apprentissage` listées hors des députés suivis, 3 des comptes rendus sans le score du verdict (agriculture, logement, rénovation). `petits-colis` et `plf2027-holdings` n'ont aucune erreur. Le détail est dans `docs/REPRODUCE.md`.
Ce dernier contrôle contredit le code de production : `qa/croise.ts` exige le pourcentage du score dans le compte rendu, alors que la consigne actuelle de `pipeline/note/run.ts` demande de ne pas l'écrire.
