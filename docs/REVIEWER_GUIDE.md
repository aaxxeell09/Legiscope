# Guide de vérification

Ce guide relie chaque capacité de LegiSpot au script qui la calcule, au fichier JSON produit, au composant d'interface et à un parcours de vérification. Les chiffres cités ont été mesurés dans les fichiers du dépôt le 14 novembre 2026 à 17 h 05 (heure de Paris). Présentation du produit : [README.md](../README.md).

## Repères

| Repère | Valeur |
|---|---|
| Produit | LegiSpot |
| Nom du produit | LegiSpot : champ `name` de [package.json](../package.json), champ `produit.nom` de [data/config.json](../data/config.json), qui s'affiche dans la barre latérale |
| Dépôt | Legiscope |
| Contexte | Hackathon Open Data (swanbase et Hémicycle, Paris), construit le 14 novembre 2026 |
| Chaîne | [pipeline/](../pipeline/) (TypeScript, Bun) écrit les JSON de [data/](../data/) ; [contracts/schemas/](../contracts/schemas/) (Zod) les décrit ; [web/src/](../web/src/) (React) les lit ; [qa/](../qa/) les contrôle |
| Clients affichés | Alibaba France, Afep, U2P, FNSEA, Union sociale pour l'habitat, CAPEB : exemples illustratifs, pas des clients réels |
| Lancer l'interface | `bun install` puis `bun run dev`, puis ouvrir `http://localhost:5173` (routes dans [web/src/App.tsx](../web/src/App.tsx)) |

## 1. Ce que démontre le projet

- Un dossier associe un client, un sujet, une mesure suivie et trois objectifs hiérarchisés. Six dossiers sont déclarés dans [data/config.json](../data/config.json), selon le schéma [contracts/schemas/config.ts](../contracts/schemas/config.ts).
- Chaque dossier s'affiche en cinq blocs (Verdict, Nouveautés, Suite, Action, Compte rendu). Chaque bloc lit un seul fichier JSON du dossier ; les composants sont dans [web/src/views/blocs/](../web/src/views/blocs/).
- Le verdict est calculé par des règles, sans modèle de langage : part des sièges des groupes dont la position est connue, seuils 0,55 et 0,4 ([pipeline/pivots/verdict.ts](../pipeline/pivots/verdict.ts)). Le modèle rédige seulement la phrase de lecture.
- Les amendements sont rattachés à la mesure par son article et ses mots-clés, avec auteur, sort, nature et dates ([pipeline/pivots/lib/sujet.ts](../pipeline/pivots/lib/sujet.ts), [data/petits-colis/texte.json](../data/petits-colis/texte.json)).
- Chaque élément affiché porte une preuve : sources, raisonnement et nature (`fait`, `deduction` ou `inconnue`), définie dans [contracts/schemas/preuve.ts](../contracts/schemas/preuve.ts) et ouverte par [web/src/components/Pourquoi.tsx](../web/src/components/Pourquoi.tsx).
- Chaque fichier de données porte un bloc `meta` (date de génération, sources, limites, producteur) défini dans [contracts/schemas/meta.ts](../contracts/schemas/meta.ts).
- Le dossier `petits-colis` est une relecture historique au matin du 19 novembre 2025 : la règle de coupure est la fonction `coupure` de [pipeline/pivots/lib/sujet.ts](../pipeline/pivots/lib/sujet.ts), contrôlée par [qa/check.ts](../qa/check.ts).
- 33 prédictions Orcet sont enregistrées sur des amendements en attente, dans quatre dossiers. Elles sont présentées comme une moyenne des probabilités individuelles de voter pour, jamais comme une probabilité d'adoption.
- Un modèle de langage (Qwen/Qwen3.8-27B par défaut, [pipeline/lib/llm.ts](../pipeline/lib/llm.ts)) extrait les personnes entendues en audition, classe les interventions des débats et rédige des textes courts.
- Tout nombre d'un texte rédigé est comparé à une liste autorisée ([pipeline/lib/verif.ts](../pipeline/lib/verif.ts)). Après trois sorties rejetées, un gabarit sans modèle remplace le texte et le fichier l'indique (`mode`, `verifie`).

## 2. Où regarder

Les exemples de données sont pris dans [data/petits-colis/](../data/petits-colis/). Député d'exemple : `PA794118`.

| Fonctionnalité | Calcul ou collecte | Données produites | Interface | Vérification |
|---|---|---|---|---|
| En-tête du dossier et objectifs | Déclaration manuelle, lue par [pipeline/collecte/lib/config.ts](../pipeline/collecte/lib/config.ts) | [data/config.json](../data/config.json) | [web/src/views/dossier/index.tsx](../web/src/views/dossier/index.tsx), [web/src/lib/config.tsx](../web/src/lib/config.tsx) | `http://localhost:5173/dossier/petits-colis` : client, mesure, mention « Relecture historique », onglets Principal, Repli 1, Repli 2 |
| Verdict | [pipeline/pivots/verdict.ts](../pipeline/pivots/verdict.ts), lancé par [pipeline/pivots/run.ts](../pipeline/pivots/run.ts) ; contexte de cohésion par [pipeline/cohesion/run.ts](../pipeline/cohesion/run.ts) | [data/petits-colis/verdict.json](../data/petits-colis/verdict.json), [data/cohesion.json](../data/cohesion.json) | [web/src/views/blocs/verdict/index.tsx](../web/src/views/blocs/verdict/index.tsx), [web/src/views/blocs/verdict/Tendance.tsx](../web/src/views/blocs/verdict/Tendance.tsx) | Même page : situation, part des sièges favorables à l'objectif, tendance, confiance, « Fondements ». Changer d'onglet d'objectif change le verdict |
| Nouveautés | [pipeline/fiches/lib/nouveautes.ts](../pipeline/fiches/lib/nouveautes.ts), lancé par [pipeline/fiches/run.ts](../pipeline/fiches/run.ts) | [data/petits-colis/nouveautes.json](../data/petits-colis/nouveautes.json) | [web/src/views/blocs/nouveautes/index.tsx](../web/src/views/blocs/nouveautes/index.tsx) | Même page : événements triés par importance, « Effet proposé sur l'objectif », lien vers la source officielle |
| Suite | [pipeline/suite/run.ts](../pipeline/suite/run.ts) | [data/petits-colis/suite.json](../data/petits-colis/suite.json) | [web/src/views/blocs/suite/index.tsx](../web/src/views/blocs/suite/index.tsx) | Même page : première échéance, « Voir les autres échéances », « Scénarios documentés » |
| Action : ceux qui décident, groupes de députés | [pipeline/pivots/definitif.ts](../pipeline/pivots/definitif.ts) (`construireDecideurs`, `construireGroupesAction`), assemblé par [pipeline/fiches/lib/action.ts](../pipeline/fiches/lib/action.ts) | [data/petits-colis/groupes-action.json](../data/petits-colis/groupes-action.json), [data/petits-colis/action.json](../data/petits-colis/action.json) | [web/src/views/blocs/action/index.tsx](../web/src/views/blocs/action/index.tsx) | Même page : « Ceux qui décident », onglets « Positions à approfondir », « Positions convergentes », « Positions opposées » |
| Action : arguments et contre-arguments | Arguments par [pipeline/debats/run.ts](../pipeline/debats/run.ts) ; contre-arguments par [pipeline/fiches/lib/action.ts](../pipeline/fiches/lib/action.ts) avec le prompt [pipeline/action/prompts/contre-argument.md](../pipeline/action/prompts/contre-argument.md) | [data/petits-colis/arguments.json](../data/petits-colis/arguments.json), champ `contre_arguments` de [data/petits-colis/action.json](../data/petits-colis/action.json) | [web/src/views/blocs/action/index.tsx](../web/src/views/blocs/action/index.tsx) | Même page : « Arguments documentés », « Lire la citation originale », « Réponses analytiques proposées » |
| Compte rendu | [pipeline/note/run.ts](../pipeline/note/run.ts) | [data/petits-colis/note.json](../data/petits-colis/note.json) | [web/src/views/blocs/compte-rendu/index.tsx](../web/src/views/blocs/compte-rendu/index.tsx) | Même page : « Note de situation », boutons « Copier la note » et « Modifier » (modification locale, non enregistrée) |
| Base documentaire : état de la mesure, articles, amendements | [pipeline/pivots/definitif.ts](../pipeline/pivots/definitif.ts) (`construireEtat`, `construireTexte`) | [data/petits-colis/etat.json](../data/petits-colis/etat.json), [data/petits-colis/texte.json](../data/petits-colis/texte.json) | [web/src/views/base/index.tsx](../web/src/views/base/index.tsx) | `http://localhost:5173/dossier/petits-colis/base` : article 22 et son statut, tableau des amendements, filtres Statut, Groupe, Nature. Les champs `mesure` et `texte_etat` se lisent dans le JSON |
| Fiche député | [pipeline/fiches/lib/fiches.ts](../pipeline/fiches/lib/fiches.ts), prompt [pipeline/fiches/prompts/synthese.md](../pipeline/fiches/prompts/synthese.md) | [data/petits-colis/fiches/PA794118.json](../data/petits-colis/fiches/PA794118.json), [data/petits-colis/fiches/index.json](../data/petits-colis/fiches/index.json) | [web/src/views/depute/index.tsx](../web/src/views/depute/index.tsx) | `http://localhost:5173/dossier/petits-colis/depute/PA794118` : Synthèse, Amendements, Interventions, Auditions, Organisations |
| Auditions | [pipeline/auditions/run.ts](../pipeline/auditions/run.ts), extraction dans [pipeline/auditions/lib/organisations.ts](../pipeline/auditions/lib/organisations.ts) | [data/petits-colis/auditions/PA794118.json](../data/petits-colis/auditions/PA794118.json) | Section Auditions de [web/src/views/depute/index.tsx](../web/src/views/depute/index.tsx) | Fiche député ci-dessus : rapports rattachés, rôle (rapporteur ou membre), organisations entendues |
| Débats | [pipeline/debats/run.ts](../pipeline/debats/run.ts), lecture par [pipeline/debats/seance.ts](../pipeline/debats/seance.ts) et [pipeline/debats/commission.ts](../pipeline/debats/commission.ts), classement par [pipeline/debats/classer.ts](../pipeline/debats/classer.ts) | [data/petits-colis/debats/PA794118.json](../data/petits-colis/debats/PA794118.json), [data/petits-colis/arguments.json](../data/petits-colis/arguments.json) | Section Interventions de [web/src/views/depute/index.tsx](../web/src/views/depute/index.tsx) ; arguments dans [web/src/views/blocs/action/index.tsx](../web/src/views/blocs/action/index.tsx) | Fiche député ci-dessus : citations datées avec lien vers le compte rendu |
| HATVP | [pipeline/collecte/hatvp.ts](../pipeline/collecte/hatvp.ts) | [data/petits-colis/hatvp.json](../data/petits-colis/hatvp.json) | Section Organisations de [web/src/views/depute/index.tsx](../web/src/views/depute/index.tsx) | Fiche député ci-dessus, ancre Organisations (34 organisations sur ce dossier) |
| Prédictions Orcet | Appel dans [pipeline/collecte/api.ts](../pipeline/collecte/api.ts) ; report par [pipeline/pivots/definitif.ts](../pipeline/pivots/definitif.ts) et [pipeline/suite/run.ts](../pipeline/suite/run.ts) | Aucune sur `petits-colis`. Exemple : [data/plf2027-apprentissage/texte.json](../data/plf2027-apprentissage/texte.json), [data/plf2027-apprentissage/suite.json](../data/plf2027-apprentissage/suite.json) | [web/src/views/blocs/suite/index.tsx](../web/src/views/blocs/suite/index.tsx) | `http://localhost:5173/dossier/plf2027-apprentissage` : ouvrir « Scénarios documentés » dans le bloc Suite |
| Preuve et provenance | [contracts/schemas/preuve.ts](../contracts/schemas/preuve.ts), [contracts/schemas/meta.ts](../contracts/schemas/meta.ts) | Champ `preuve` de chaque élément, bloc `meta` de chaque fichier, par exemple [data/petits-colis/verdict.json](../data/petits-colis/verdict.json) | [web/src/components/Pourquoi.tsx](../web/src/components/Pourquoi.tsx) (icône d'information), [web/src/components/Meta.tsx](../web/src/components/Meta.tsx) (« Sources » en pied de bloc), [web/src/views/sources/index.tsx](../web/src/views/sources/index.tsx) | Cliquer une icône d'information : nature, raisonnement, liens. `http://localhost:5173/sources` : liens institutionnels. `meta.limits` se lit dans les JSON |
| Vérificateur de nombres | [pipeline/lib/verif.ts](../pipeline/lib/verif.ts), appelé par `redigerVerifie` dans [pipeline/lib/llm.ts](../pipeline/lib/llm.ts) | Champs `chiffres_utilises`, `mode`, `verifie` de [data/petits-colis/note.json](../data/petits-colis/note.json) | [web/src/views/blocs/compte-rendu/chiffres.ts](../web/src/views/blocs/compte-rendu/chiffres.ts) | `bun run test` (cas dans [qa/verif.test.ts](../qa/verif.test.ts)) ; autres cas dans [pipeline/lib/llm.test.ts](../pipeline/lib/llm.test.ts) |
| Validation des schémas | [contracts/index.ts](../contracts/index.ts) (table `SCHEMAS`), [qa/check.ts](../qa/check.ts), contrôle croisé [qa/croise.ts](../qa/croise.ts) | Aucun fichier produit | Validation au chargement dans [web/src/lib/data.ts](../web/src/lib/data.ts) et [web/src/lib/contracts.ts](../web/src/lib/contracts.ts) | `bun run check` |

## 3. Carte des preuves

### « Le système suit les amendements »

- Collecte : [pipeline/collecte/amendements-opendata.ts](../pipeline/collecte/amendements-opendata.ts) lit l'open data de l'Assemblée et garde les amendements de l'article de la mesure ou qui citent un mot-clé du sujet.
- Rattachement et qualification : `amendementsDuSujet` dans [pipeline/pivots/lib/sujet.ts](../pipeline/pivots/lib/sujet.ts), `sortUnifie` et `construireTexte` dans [pipeline/pivots/definitif.ts](../pipeline/pivots/definitif.ts), nature (supprime, réduit, reporte, aggrave, autre) dans [pipeline/pivots/lib/nature.ts](../pipeline/pivots/lib/nature.ts).
- Résultat : 77 amendements dans [data/petits-colis/texte.json](../data/petits-colis/texte.json) (numéro, auteur, groupe, sort, nature, dates). Par député : [data/petits-colis/amendements/PA794118.json](../data/petits-colis/amendements/PA794118.json), écrit par [pipeline/amendements/run.ts](../pipeline/amendements/run.ts).
- Suivi dans le temps : dépôts et sorts datés deviennent des événements de [data/petits-colis/nouveautes.json](../data/petits-colis/nouveautes.json).
- Interface : tableau filtrable de [web/src/views/base/index.tsx](../web/src/views/base/index.tsx), à `http://localhost:5173/dossier/petits-colis/base`.

### « Le système utilise Orcet »

- Appel API : `POST /orcet/predictions` de l'API Hémicycle, dans [pipeline/collecte/api.ts](../pipeline/collecte/api.ts), sur les amendements en attente, avec un plafond par dossier (`ORCET_MAX`). Appel unitaire : [pipeline/collecte/orcet-test.ts](../pipeline/collecte/orcet-test.ts). Les réponses brutes ne sont pas versionnées (voir [.gitignore](../.gitignore)).
- Résultats versionnés : champ `prediction` (`proba_pour`, `confiance`, `modele`, `date`) de chaque amendement du fichier texte du dossier, écrit par `predictionOrcet` dans [pipeline/pivots/definitif.ts](../pipeline/pivots/definitif.ts) ; champ `proba` des éléments `probables` du fichier suite du dossier, écrit par [pipeline/suite/run.ts](../pipeline/suite/run.ts). Schéma : [contracts/schemas/texte.ts](../contracts/schemas/texte.ts).
- Effet sur le verdict : correction du score à hauteur de 30 % (`POIDS_ORCET` dans [pipeline/pivots/verdict.ts](../pipeline/pivots/verdict.ts)), tracée dans `confiance.etabli` de [data/plf2027-apprentissage/verdict.json](../data/plf2027-apprentissage/verdict.json) et [data/plf2027-agriculture/verdict.json](../data/plf2027-agriculture/verdict.json).
- Interface : [web/src/views/blocs/suite/index.tsx](../web/src/views/blocs/suite/index.tsx), section « Scénarios documentés », pourcentage formaté par `formatProba` de [web/src/lib/format.ts](../web/src/lib/format.ts) avec la mention « indicateur fourni ». Le composant [web/src/components/Proba.tsx](../web/src/components/Proba.tsx) existe mais aucune vue ne l'importe. La page Base n'affiche pas la prédiction.
- Lecture : une valeur Orcet est la moyenne des probabilités individuelles de voter pour un amendement. Ce n'est jamais une probabilité d'adoption de l'amendement, de l'article ou de la loi.

| Dossier | Amendements avec prédiction (fichier texte du dossier) | Lignes avec valeur Orcet (fichier suite du dossier) |
|---|---|---|
| `plf2027-apprentissage` | 24 | 8 |
| `plf2027-agriculture` | 6 | 6 |
| `plf2027-logement` | 2 | 2 |
| `plf2027-renovation` | 1 | 1 |
| `petits-colis` | 0 (relecture historique, pas de prédiction rétroactive) | 0 |
| `plf2027-holdings` | 0 (aucun amendement en attente sur la mesure, voir `meta.limits` de [data/plf2027-holdings/suite.json](../data/plf2027-holdings/suite.json)) | 0 |

### « Un modèle de langage classe les débats »

- Prompt : il est écrit dans le code, fonction `consigne` de [pipeline/debats/classer.ts](../pipeline/debats/classer.ts). Il n'existe pas de fichier de prompt séparé pour les débats ([prompts/A2-debats.md](../prompts/A2-debats.md) est la consigne de la session de développement).
- Modèle réellement codé : Qwen/Qwen3.8-27B par défaut, servi par Featherless, constante `MODELE` de [pipeline/lib/llm.ts](../pipeline/lib/llm.ts), remplaçable par la variable `FEATHERLESS_MODEL`.
- Contrôles : sortie JSON validée par Zod (`ClassementSchema`), citation retrouvée mot pour mot dans le compte rendu (`citationDansSource` dans [pipeline/debats/texte.ts](../pipeline/debats/texte.ts)), confiance d'au moins 0,7 et second avis indépendant sur le camp (`verifierCamp`), appliqués dans [pipeline/debats/run.ts](../pipeline/debats/run.ts).
- Stockage : [data/petits-colis/arguments.json](../data/petits-colis/arguments.json) (9 pour, 8 contre) et un fichier par député comme [data/petits-colis/debats/PA794118.json](../data/petits-colis/debats/PA794118.json). Le modèle et la confiance sont écrits dans `preuve.raisonnement` ; les décomptes de rejets sont dans `meta.limits`.
- Dossiers classés par le modèle : `petits-colis`, `plf2027-holdings`, `plf2027-apprentissage`.
- Dossiers classés par règles de mots, sans modèle (fonction `classerParRegles`, mention « Version rapide », chaque argument à relire) : `plf2027-agriculture`, `plf2027-logement`, `plf2027-renovation`. Source : `meta.limits` de [data/plf2027-agriculture/arguments.json](../data/plf2027-agriculture/arguments.json), [data/plf2027-logement/arguments.json](../data/plf2027-logement/arguments.json), [data/plf2027-renovation/arguments.json](../data/plf2027-renovation/arguments.json), et journal [status/A2.md](../status/A2.md) (entrée de 16 h 58).

### « Le système produit un compte rendu »

- Générateur : [pipeline/note/run.ts](../pipeline/note/run.ts) (`bun run note`).
- JSON lus : les fichiers verdict, suite, texte, nouveautes et etat du dossier, par exemple [data/petits-colis/verdict.json](../data/petits-colis/verdict.json) et [data/petits-colis/suite.json](../data/petits-colis/suite.json). Aucun vote brut n'est transmis au modèle.
- Prompt : [pipeline/note/prompts/note.md](../pipeline/note/prompts/note.md). Gabarit de repli : [pipeline/note/prompts/gabarit-note.md](../pipeline/note/prompts/gabarit-note.md), sinon le gabarit intégré au script (`gabaritIntegre`).
- Contrôle automatique des nombres : `redigerVerifie` de [pipeline/lib/llm.ts](../pipeline/lib/llm.ts) soumet chaque sortie à `verifierChiffres` de [pipeline/lib/verif.ts](../pipeline/lib/verif.ts), trois tentatives au plus, puis gabarit. Le résultat est écrit dans `mode`, `modele`, `verifie`, `chiffres_utilises` de [data/petits-colis/note.json](../data/petits-colis/note.json). Les six notes du dépôt portent `mode: llm` et `verifie: true`.
- Rendu : [web/src/views/blocs/compte-rendu/index.tsx](../web/src/views/blocs/compte-rendu/index.tsx), qui retire à l'affichage la ligne de limites et les phrases citant Orcet. Cohérence avec le verdict contrôlée par [qa/croise.ts](../qa/croise.ts).

## 4. Cas de démonstration

Six dossiers sont déclarés dans [data/config.json](../data/config.json). Les clients sont illustratifs. Le dossier ouvert par défaut est `petits-colis` (champ `dossier_demo`).

| Identifiant | Client illustratif | Mesure | URL locale | Ce que le dossier permet de montrer | Limite pertinente |
|---|---|---|---|---|---|
| `petits-colis` | Alibaba France | Taxe de 2 euros par article sur les petits colis (budget 2026, article 22) | `http://localhost:5173/dossier/petits-colis` | Les cinq blocs, 46 fiches député, arguments classés par le modèle, relecture historique à la date de référence du 19 novembre 2025 | Aucune prédiction Orcet. Aucun scrutin nominatif lié avant la date de référence. 22 sorts d'amendement sans date publiée ne sont pas listés comme événements |
| `plf2027-holdings` | Afep | Taxe sur la fortune improductive (article 3) et taxe sur les holdings patrimoniales (budget 2027) | `http://localhost:5173/dossier/plf2027-holdings` | Dossier en cours, 21 scrutins nominatifs liés, 58 fiches député, 19 arguments pour et 23 contre classés par le modèle | Le rapprochement entre propositions fiscales voisines n'est pas entièrement validé : le classement pour ou contre « la mesure » reste ambigu pour certains orateurs ([status/A2.md](../status/A2.md), 14 h 10). Aucune prédiction Orcet |
| `plf2027-apprentissage` | U2P | Baisse des crédits de l'apprentissage et des aides à l'embauche (budget 2027, articles 88 et 89) | `http://localhost:5173/dossier/plf2027-apprentissage` | Dossier en cours avec 24 prédictions Orcet, dont 8 visibles dans le bloc Suite ; 58 fiches député ; débats classés par le modèle | Ajouté à 16 h 05. Peu d'arguments retenus (1 pour, 8 contre). 3 synthèses de fiche en gabarit |
| `plf2027-agriculture` | FNSEA | Baisse des crédits des filières agricoles (budget 2027, article 77) | `http://localhost:5173/dossier/plf2027-agriculture` | Version rapide : les cinq blocs, 6 prédictions Orcet, 15 fiches député | Arguments classés par règles de mots, à relire. Synthèses de fiche et contre-arguments en gabarit. 2 scrutins nominatifs liés |
| `plf2027-logement` | Union sociale pour l'habitat | Réforme des aides personnelles au logement et baisse des crédits du logement (budget 2027, article 78) | `http://localhost:5173/dossier/plf2027-logement` | Version rapide : Verdict, Suite (2 prédictions Orcet), Compte rendu, Base documentaire | Pas de fichier pour les blocs Action et Nouveautés ni de fiches député dans [data/plf2027-logement/](../data/plf2027-logement/). Arguments par règles de mots |
| `plf2027-renovation` | CAPEB | Baisse des crédits de MaPrimeRénov' (budget 2027, programme 174) | `http://localhost:5173/dossier/plf2027-renovation` | Version rapide : Verdict, Suite (1 prédiction Orcet), Compte rendu, Base documentaire | Mêmes absences dans [data/plf2027-renovation/](../data/plf2027-renovation/), et pas de débats par député. 1 scrutin nominatif lié. Arguments par règles de mots |

Les trois derniers dossiers ont été ajoutés après 16 h 45 ([status/P0.md](../status/P0.md), entrée de 16 h 53). Pour eux, ce qui est vérifiable est ce qui figure dans leur dossier de données : les fichiers verdict, suite, texte, etat, note, arguments, hatvp, pivots et groupes-action, et les fichiers par député d'auditions et d'amendements.

## 5. Commandes de vérification

Les scripts sont ceux de [package.json](../package.json). Régénérer les données demande en plus les deux clés listées dans [.env.example](../.env.example) ; consulter l'interface et lancer les contrôles n'en demande aucune.

| Commande | Ce qu'elle exécute | Ce qu'elle contrôle |
|---|---|---|
| `bun run typecheck` | `tsc --noEmit` | Les types TypeScript du dépôt ([tsconfig.json](../tsconfig.json)) |
| `bun run build` | `vite build` | La construction du site statique ([vite.config.ts](../vite.config.ts)) |
| `bun run check` | `bun qa/check.ts` | Chaque JSON de [data/](../data/) et de [contracts/fixtures/](../contracts/fixtures/) contre son schéma Zod, puis les contrôles croisés. Option `--root data` pour se limiter aux données |
| `bun run test` | `bun test qa/` | Les cas du vérificateur de nombres ([qa/verif.test.ts](../qa/verif.test.ts)) |

Mesures reproductibles avec `jq`, depuis la racine du dépôt :

```sh
jq '.dossiers[].id' data/config.json
jq '[.amendements[] | select(.prediction != null)] | length' data/plf2027-apprentissage/texte.json
jq '[.probables[] | select(.proba != null)] | length' data/plf2027-apprentissage/suite.json
jq -r '.meta.limits' data/plf2027-agriculture/arguments.json
jq '{mode, modele, verifie}' data/petits-colis/note.json
```

## 6. Limites connues

- Projet construit en une journée, non audité. La validation automatique contrôle la forme des fichiers et la cohérence des nombres, pas l'exactitude des conclusions.
- Le score du verdict est une règle du projet, pas une prédiction validée. Une valeur Orcet est une moyenne de probabilités individuelles de vote pour, jamais une probabilité d'adoption.
- La mesure est déclarée à la main dans [data/config.json](../data/config.json) et suivie par son article et ses mots-clés : un amendement peut être retenu ou écarté à tort. Sur `plf2027-holdings`, le rapprochement entre propositions fiscales n'est pas entièrement validé.
- Trois dossiers (`plf2027-agriculture`, `plf2027-logement`, `plf2027-renovation`) sont en version rapide : arguments par règles de mots, textes en gabarit, et fichiers manquants pour deux d'entre eux (blocs Action et Nouveautés, fiches député).
- Compte rendu : la version actuelle de [pipeline/note/run.ts](../pipeline/note/run.ts) demande au modèle de ne pas écrire le score, alors que [qa/croise.ts](../qa/croise.ts) compare le score de la note à celui du verdict. Les notes des trois dossiers en version rapide ne contiennent pas le score ; celles des trois autres le contiennent.
- Les réponses brutes de l'API Hémicycle et de l'open data ne sont pas dans le dépôt ([.gitignore](../.gitignore)). Les JSON de [data/](../data/) sont vérifiables tels quels ; les régénérer demande les deux clés et de nouveaux appels.
- Interface : les limites (`meta.limits`) et la date de génération ne sont pas affichées, seules les sources le sont. La page Sources est une liste de liens institutionnels. Les champs détaillés de l'état de la mesure se lisent dans [data/petits-colis/etat.json](../data/petits-colis/etat.json) et ses équivalents.
- Couverture : le Sénat n'est pas analysé ; les avis du rapporteur et du gouvernement sont absents des sources ; en audition, le rôle « membre » signifie que la commission du député a produit le rapport, pas qu'il était présent ; les données HATVP sont déclaratives et filtrées par mots-clés.
