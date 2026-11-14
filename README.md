# LegiSpot

**Le tableau de bord parlementaire des cabinets d'affaires publiques : une mesure, un client, des objectifs, et des analyses sourcées.**

LegiSpot transforme les données ouvertes du Parlement en un tableau de bord par dossier. Un dossier, c'est un client, la mesure législative qui le touche et ses objectifs classés par priorité. Le consultant y lit où en est la mesure, ce qui vient de changer, ce qui arrive, sur qui agir et ce qu'il peut écrire à son client. Les analyses portent leur preuve : la source officielle, ou le raisonnement suivi quand il s'agit d'une déduction.

Projet construit le 14 novembre 2026 pendant le Hackathon Open Data (swanbase et Hémicycle, Paris). Nom du produit : LegiSpot. Nom du dépôt : `Legiscope`.

[![Tableau de bord LegiSpot, dossier « Taxe sur les petits colis »](docs/assets/dashboard.png)](docs/assets/legispot-demo.mp4)

| Voir | Où |
|---|---|
| **Vidéo de démonstration** (3 min 23) | [docs/assets/legispot-demo.mp4](docs/assets/legispot-demo.mp4) |
| **Version en ligne** | https://bascule-two.vercel.app |
| **En local, sans clé** | `npm install` puis `npm run dev` |

> **In English.** LegiSpot is a parliamentary dashboard for public affairs firms. One dashboard per case: a client, the legislative measure that affects it, and ranked objectives. A TypeScript pipeline turns French National Assembly open data, Hémicycle's Orcet vote predictions and the HATVP lobbying register into validated JSON files; a React front end displays them in five blocks (Verdict, Updates, Next steps, Action, Report). Scores are computed by explicit rules, a language model (via Featherless) only extracts, classifies and writes, and every number it writes is checked.

## Lire ce dépôt

| Ordre | Document | Pour quoi faire |
|---|---|---|
| 1 | `README.md` (cette page) | Comprendre le produit |
| 2 | [docs/REVIEWER_GUIDE.md](docs/REVIEWER_GUIDE.md) | Retrouver chaque fonctionnalité dans le code, les données et l'interface |
| 3 | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Comprendre le système et suivre un amendement de la source à l'écran |
| 4 | [docs/DATA_AND_AI.md](docs/DATA_AND_AI.md) | Sources, règles de calcul, rôle exact du modèle de langage et d'Orcet |
| 5 | [docs/REPRODUCE.md](docs/REPRODUCE.md) | Lancer, vérifier, régénérer |
| 6 | [docs/ETAT.md](docs/ETAT.md) | L'état mesuré du dépôt : chiffres par dossier et résultats des commandes, générés par script |
| 7 | [contracts/README.md](contracts/README.md) | Les contrats de données (schémas Zod). Écrit pendant la construction : la description des pages y est antérieure à l'interface finale |
| 8 | [AGENTS.md](AGENTS.md) | Repères pour un agent de code : structure, commandes, points d'entrée |

Les documents de la journée de construction (cadrage, plan, consignes des sessions, journaux, script de démonstration) sont archivés dans `docs/historique/` et listés dans [docs/HISTORIQUE.md](docs/HISTORIQUE.md). Ils peuvent contredire l'état final : la référence est cette page et le dossier `docs/`.

## Le problème

Un cabinet d'affaires publiques suit pour ses clients des mesures précises, pas des lois entières. Une mesure naît dans un article, se modifie par amendement, disparaît en commission, revient en séance. Pour savoir où elle en est, le consultant recoupe à la main les textes, les amendements, les scrutins, les comptes rendus, les auditions et le répertoire des représentants d'intérêts. La collecte ne suffit pas : il faut encore interpréter, puis justifier l'analyse devant le client.

## La solution

L'unité de travail est le **dossier : client + sujet + mesure suivie + objectifs classés** (un objectif principal, puis des objectifs de repli). On suit la mesure par rapport aux objectifs du client, pas seulement le texte de loi.

Chaque dossier se lit en cinq blocs :

| Bloc | Question du cabinet | Ce qu'il lit |
|---|---|---|
| **Verdict** | Est-ce en bonne voie ? | Pour chaque objectif : situation, tendance, confiance, ce qui joue pour, ce qui bloque, et l'événement qui a fait bouger le verdict |
| **Nouveautés** | Que s'est-il passé, et qu'est-ce qui compte ? | Les événements parlementaires qui touchent la mesure, triés par importance, avec leur effet sur le verdict |
| **Suite** | Quelles sont les prochaines dates ? | Les échéances connues, la dernière occasion d'agir, ce qui a le plus de chances de se produire |
| **Action** | Qui décide, et sur qui agir ? | Ceux qui décident, trois groupes de députés (sur qui agir, alliés, perdus), les arguments entendus et des réponses possibles |
| **Compte rendu** | Que puis-je reprendre pour mon client ? | Une synthèse courte dont les chiffres sont contrôlés |

En fond : l'état de la mesure, la base documentaire (articles, amendements), la fiche des députés cités et une page des sources.

LegiSpot est un assistant d'analyse. Il propose une lecture et montre ses preuves. Le consultant reste responsable de son jugement.

## Ce qui est réellement construit

Chaque ligne renvoie au code qui la réalise. Le détail, avec les fichiers de données et les composants d'interface, est dans [docs/REVIEWER_GUIDE.md](docs/REVIEWER_GUIDE.md).

| Capacité | Où dans le code |
|---|---|
| Collecte de plusieurs sources parlementaires | [pipeline/collecte/](pipeline/collecte/) |
| Rattachement des amendements à la mesure suivie | [pipeline/collecte/amendements-opendata.ts](pipeline/collecte/amendements-opendata.ts), [pipeline/pivots/lib/sujet.ts](pipeline/pivots/lib/sujet.ts), [pipeline/amendements/](pipeline/amendements/) |
| Verdict par objectif, calculé par des règles | [pipeline/pivots/verdict.ts](pipeline/pivots/verdict.ts) |
| Positions des groupes et des députés, députés à convaincre | [pipeline/pivots/](pipeline/pivots/), [pipeline/fiches/lib/action.ts](pipeline/fiches/lib/action.ts) |
| Événements datés et leur effet sur le verdict | [pipeline/fiches/lib/nouveautes.ts](pipeline/fiches/lib/nouveautes.ts) |
| Échéances et prédictions Orcet quand elles existent | [pipeline/suite/run.ts](pipeline/suite/run.ts), [pipeline/collecte/api.ts](pipeline/collecte/api.ts) |
| Personnes entendues en audition, extraites des rapports | [pipeline/auditions/](pipeline/auditions/) |
| Interventions en séance et en commission, classées pour ou contre | [pipeline/debats/](pipeline/debats/) |
| Organisations déclarées au répertoire HATVP | [pipeline/collecte/hatvp.ts](pipeline/collecte/hatvp.ts) |
| Compte rendu rédigé par un modèle, nombres contrôlés, repli sur gabarit | [pipeline/note/run.ts](pipeline/note/run.ts), [pipeline/lib/llm.ts](pipeline/lib/llm.ts), [pipeline/lib/verif.ts](pipeline/lib/verif.ts) |
| Preuve sur les analyses : fait, déduction ou inconnue | [contracts/schemas/preuve.ts](contracts/schemas/preuve.ts), [web/src/components/Pourquoi.tsx](web/src/components/Pourquoi.tsx) |
| Contrats de données et validation | [contracts/schemas/](contracts/schemas/), [qa/check.ts](qa/check.ts), [qa/croise.ts](qa/croise.ts) |
| Sceau de publication : empreinte de chaque fichier validé, contrôlée au build | [pipeline/publication.mjs](pipeline/publication.mjs) |

## Démonstration

Les dossiers sont déclarés dans [data/config.json](data/config.json). Après `npm run dev`, chacun s'ouvre à l'adresse `http://localhost:5173/dossier/<identifiant>`. La version en ligne est déployée sur Vercel (configuration dans [vercel.json](vercel.json)).

| Identifiant | Client d'exemple | Mesure suivie | Ce que le dossier montre |
|---|---|---|---|
| `petits-colis` | Alibaba France | Taxe de 2 euros par article sur les petits colis (budget 2026, article 22) | Relecture historique : tout est vu au matin du 19 novembre 2025, rien de postérieur n'est utilisé |
| `plf2027-holdings` | Afep | Taxe sur les holdings et la fortune improductive (budget 2027) | Dossier en cours, positions des groupes lues sur des scrutins nominatifs |
| `plf2027-apprentissage` | U2P | Baisse des crédits de l'apprentissage et des aides à l'embauche (budget 2027) | Dossier en cours, prédictions Orcet sur les amendements en attente |
| `plf2027-agriculture` | FNSEA | Baisse des crédits des filières agricoles (budget 2027) | Dossier ajouté en fin de journée par une entrée de configuration, avec prédictions Orcet |
| `plf2027-logement` | Union sociale pour l'habitat | APL et aides à la pierre (budget 2027) | Idem |
| `plf2027-renovation` | CAPEB | MaPrimeRénov' (budget 2027) | Idem |

Les dossiers n'ont pas tous la même profondeur de traitement : selon le dossier, les arguments des débats sont classés par le modèle ou par des règles de mots, et les synthèses de fiche député sont rédigées par le modèle ou produites par gabarit. Le détail mesuré, dossier par dossier, est dans [docs/ETAT.md](docs/ETAT.md). Les limites de chaque fichier sont écrites dans son bloc `meta.limits`.

**Les organisations affichées comme clients sont des exemples choisis pour la démonstration.** Aucune n'est cliente du projet ni associée à lui.

Autres vues :

| Adresse | Page |
|---|---|
| `/dossier/:id` | Tableau de bord du dossier |
| `/dossier/:id/base` | Base documentaire : état de la mesure, articles, amendements |
| `/dossier/:id/depute/:pa` | Fiche d'un député sur ce dossier |
| `/sources` | Liens vers les sources institutionnelles |

| Verdict | Prédictions Orcet dans le bloc Suite |
|---|---|
| ![Bloc Verdict](docs/assets/verdict.png) | ![Prédictions Orcet, dossier apprentissage](docs/assets/orcet.png) |

Autres captures : [Nouveautés](docs/assets/nouveautes.png), [Action](docs/assets/action.png), [Base documentaire](docs/assets/base.png).

## Architecture

Pas de serveur applicatif. Le pipeline prépare des fichiers JSON, l'interface les lit. Les données de démonstration sont conservées dans le dépôt : l'interface se rejoue à l'identique à partir de `data/`. Les régénérer demande les clés et les données brutes, qui ne sont pas versionnées. Ce n'est pas une application en temps réel : les données sont celles de la dernière exécution du pipeline.

```mermaid
flowchart LR
  subgraph S["Sources"]
    H["API Hémicycle<br/>prédictions Orcet,<br/>flux d'événements"]
    AN["Open data Assemblée nationale<br/>dossiers, amendements, scrutins et votes,<br/>comptes rendus, agenda"]
    HA["HATVP<br/>représentants d'intérêts"]
  end
  subgraph P["pipeline/ (TypeScript, Bun)"]
    C["Collecte"]
    R["Calculs par règles<br/>positions, verdict, suite, nouveautés"]
    L["Extraction et rédaction<br/>auditions, débats, fiches, compte rendu"]
    V["Vérificateur de nombres<br/>repli sur gabarit"]
  end
  F["Featherless<br/>modèle de langage"]
  D[("data/&lt;dossier&gt;/*.json")]
  K["contracts/<br/>schémas Zod"]
  Q["qa/<br/>validation, contrôle croisé"]
  W["web/<br/>React, Vite"]
  H --> C
  AN --> C
  HA --> C
  C --> R --> D
  C --> L --> V --> D
  F <--> L
  K --> Q
  K --> W
  D --> Q
  D --> W
```

- **L'open data de l'Assemblée nationale** fournit l'essentiel : dossiers, amendements, scrutins et votes nominatifs, comptes rendus.
- **L'API Hémicycle** fournit les prédictions du modèle Orcet et, en option, un flux d'événements parlementaires, voir [pipeline/collecte/api.ts](pipeline/collecte/api.ts) et [pipeline/fiches/lib/evenements-api.ts](pipeline/fiches/lib/evenements-api.ts).
- **Orcet** donne, pour un amendement en attente, la moyenne des probabilités individuelles de voter pour. Ce n'est pas une probabilité d'adoption. Sans prédiction, rien n'est affiché. Quand des amendements en attente portent la position du client, leur moyenne Orcet entre pour 30 % dans le score du verdict ([pipeline/pivots/verdict.ts](pipeline/pivots/verdict.ts)).
- **Featherless** donne accès au modèle de langage (`Qwen/Qwen3.8-27B` par défaut, voir [pipeline/lib/llm.ts](pipeline/lib/llm.ts)). Il extrait les personnes entendues dans les rapports, classe les interventions des débats et la nature de certains amendements, et rédige des textes à partir de chiffres déjà calculés. Il ne calcule aucun chiffre : un vérificateur rejette tout texte qui contient un nombre absent de la liste fournie, et après trois essais le texte est produit par un gabarit sans modèle.
- **Le verdict et le classement des députés sont calculés par des règles**, pas par le modèle. Le score du verdict est un indicateur descriptif construit par le projet, pas une prédiction validée statistiquement.

Détail dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) et [docs/DATA_AND_AI.md](docs/DATA_AND_AI.md).

| Dossier | Rôle |
|---|---|
| [pipeline/](pipeline/) | Collecte, calculs, extraction et rédaction. Produit `data/` |
| [contracts/](contracts/) | Un schéma Zod par fichier JSON, types, jeu d'exemple |
| [data/](data/) | Les fichiers JSON produits, par dossier |
| [web/](web/) | L'interface (React, Vite, React Router, Recharts) |
| [qa/](qa/) | Validation des schémas, contrôle croisé, vérificateur de nombres, tests |
| [docs/](docs/) | Documentation de la version finale, captures, vidéo. `docs/historique/` : archive de la journée de construction |

## Lancer le projet

Voir l'interface, sans aucune clé :

```sh
git clone https://github.com/aaxxeell09/Legiscope.git
cd Legiscope
npm install
npm run dev
```

Puis ouvrir http://localhost:5173. Les données de démonstration sont déjà dans `data/`.

Régénérer les données demande [Bun](https://bun.sh) et deux clés (`HEMICYCLE_API_KEY`, `FEATHERLESS_API_KEY`) dans un fichier `.env` créé à partir de `.env.example`. La marche à suivre et l'ordre des étapes sont dans [docs/REPRODUCE.md](docs/REPRODUCE.md).

## Vérifications

| Commande | Ce qu'elle vérifie |
|---|---|
| `npm run typecheck` | Les types TypeScript de tout le dépôt |
| `npm run build` | Le sceau de publication de chaque dossier, puis la construction du site statique dans `dist/`. Échoue si un fichier scellé de `data/` a changé depuis sa publication |
| `bun run check` | Les fichiers principaux de `data/` et du jeu d'exemple contre leur schéma Zod, les contrôles croisés entre fichiers, puis le sceau de publication |
| `bun run publish:data` | Valide puis scelle chaque dossier (empreinte SHA-256 dans `data/<dossier>/publication.json`). À relancer après toute régénération |
| `bun test` | Les tests du vérificateur de nombres et de l'appel au modèle |
| `node docs/mesurer.mjs --commandes` | Mesure l'état du dépôt et lance les commandes ci-dessus |

Les résultats obtenus sur l'état livré, avec le commit et l'heure, sont dans [docs/ETAT.md](docs/ETAT.md). Ce fichier est généré par script, aucun chiffre n'y est écrit à la main.

## Sources de données

| Source | Ce qu'on en tire | Licence ou conditions |
|---|---|---|
| [Open data de l'Assemblée nationale](https://data.assemblee-nationale.fr) | Députés et groupes, dossiers législatifs, amendements, scrutins et votes nominatifs, comptes rendus de séance, agenda. Les rapports et les comptes rendus de commission sont lus sur [assemblee-nationale.fr](https://www.assemblee-nationale.fr) | [Licence Ouverte](https://data.assemblee-nationale.fr/licence-ouverte-open-licence) (Etalab) |
| [HATVP](https://www.hatvp.fr), [répertoire des représentants d'intérêts](https://www.data.gouv.fr/datasets/repertoire-des-representants-dinterets) | Organisations ayant déclaré une action de représentation d'intérêts sur le sujet | Licence Ouverte (Etalab) |
| [API Hémicycle](https://hemicycle.ai/api) | Prédictions Orcet sur les amendements en attente, flux d'événements parlementaires en option. Deux agrégats (accord entre groupes, loyauté des députés) sont collectés mais ne sont pas encore exploités | Service à clé, conditions d'utilisation d'Hémicycle |
| [Featherless](https://featherless.ai) | Accès à un modèle de langage ouvert, pour l'extraction et la rédaction | Service à clé |

## Limites

- **L'outil propose, le cabinet décide.** Le verdict est une proposition avec ses raisons. Il peut dire qu'il n'y a pas assez d'information pour conclure.
- **Le score du verdict est une règle du projet** (part pondérée des sièges favorables à l'objectif, corrigée par la moyenne Orcet quand elle existe), pas une prédiction validée. Aucun test automatique ne couvre cette règle.
- **Une prédiction Orcet n'est pas une probabilité d'adoption.**
- **La validation automatique contrôle la forme et la cohérence des nombres, pas l'exactitude des conclusions.** Les fichiers par député ne sont validés que pour les députés retenus dans `pivots.json`.
- **La preuve détaillée (fait, déduction, inconnue) couvre les blocs Verdict, Nouveautés, Suite, Action et l'état de la mesure.** Les amendements de la base, le compte rendu et les organisations HATVP renvoient à une adresse ou à une liste de sources.
- **Une partie des textes est produite par gabarit, sans modèle.** Le champ `mode` de chaque texte le dit.
- **La mesure est déclarée à la main** dans `data/config.json` et suivie par ses mots-clés et son article. Le filtre peut retenir un amendement à tort. Sur le dossier `plf2027-holdings`, le rapprochement entre plusieurs propositions fiscales voisines n'est pas entièrement validé.
- **Relecture historique.** Sur `petits-colis`, un sort d'amendement sans date publiée n'est pas listé comme événement daté.
- **L'Assemblée n'est pas l'issue finale.** Les votes et les débats du Sénat ne sont pas analysés.
- **Un député n'est classé que sur ce qu'il a lui-même dit, déposé ou voté.** Quand sa position n'est pas connue, c'est écrit.
- **Auditions et débats : couverture partielle.** Tous les rapports n'ont pas de liste de personnes entendues. Seules les interventions dont l'orateur est identifié sont gardées.
- **HATVP.** Les données sont déclaratives. Le filtre par mots-clés peut retenir une organisation à tort.
- **Hors périmètre.** Vue sur plusieurs dossiers à la fois, presse, alertes.
- **Projet de hackathon**, construit en une journée. Il n'a pas été audité.

## Équipe et crédits

**Axel** : cadrage du produit à partir du besoin du cabinet ([docs/historique/rendu-final.md](docs/historique/rendu-final.md)), documentation, préparation de la démonstration, consignes de rédaction du modèle.
**Ilan** : plan de construction, contrats de données, pilotage des sessions de développement du pipeline et de l'interface.

Le code a été écrit en une journée avec des sessions Claude Code menées en parallèle sur trois ordinateurs. Leurs consignes et leurs journaux sont conservés (voir [docs/HISTORIQUE.md](docs/HISTORIQUE.md)).

- [Hémicycle](https://hemicycle.ai) : API parlementaire et modèle Orcet. Organisateur du hackathon avec swanbase.
- [Featherless](https://featherless.ai) : accès aux modèles de langage ouverts.
- [Assemblée nationale](https://data.assemblee-nationale.fr) : données ouvertes de la 17e législature.
- [Haute Autorité pour la transparence de la vie publique](https://www.hatvp.fr) : répertoire des représentants d'intérêts.
