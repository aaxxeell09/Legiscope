# Reproduire LegiSpot depuis un clone frais

LegiSpot (dépôt « Legiscope ») est le projet du Hackathon Open Data du 14 novembre 2026.
Trois dossiers de code : `pipeline/` (TypeScript, Bun) produit `data/<dossier>/*.json`, `web/` (Vite, React) les affiche, `qa/` les valide.

Ce document décrit les commandes, ce qu'elles vérifient et l'ordre des étapes. Les commandes du parcours A ont été exécutées le 14 novembre 2026 vers 17 h 04 (heure de Paris), sur une copie fraîche des fichiers suivis par git, sous Linux, avec Node v22.23.4, npm 10.9.9 et Bun 1.4.4.
`data/` et `package.json` ont changé depuis ce test. Les résultats de commandes, les comptes et les tailles ne sont donc pas recopiés ici : l'état mesuré du dépôt livré est dans [docs/ETAT.md](ETAT.md), généré par `node docs/mesurer.mjs`.
Ce qui n'a pas été exécuté est signalé comme tel.

## Parcours A : voir le produit sans clé

Prérequis : Node et npm. `package.json` déclare `engines.node: 24.x`. Le test a été fait avec Node v22.23.4 ; les autres versions de Node, dont la 24, n'ont pas été testées lors de cette vérification.
Bun n'est pas nécessaire pour ce parcours : `npm install`, `npm run dev` et `npm run typecheck` ont été rejoués avec succès sans Bun dans le `PATH`. `npm run build` ne lance lui aussi que Node (voir Vérifications).
Aucune clé n'est nécessaire et aucun fichier `.env` n'est à créer : les données déjà produites sont dans `data/` et le site les lit telles quelles.

```sh
git clone https://github.com/aaxxeell09/Legiscope.git
cd Legiscope
npm install
npm run dev
```

Ouvrir ensuite http://localhost:5173. Si le port 5173 est occupé, Vite prend le suivant : l'adresse exacte est écrite dans le terminal.
La racine `/` redirige vers le dossier de démonstration déclaré dans `data/config.json` (`dossier_demo` : `petits-colis`).

Six dossiers sont déclarés dans `data/config.json`. Les fichiers présents, le mode de rédaction et le verdict de chacun sont dans [docs/ETAT.md](ETAT.md).

| Dossier | Client affiché (exemple) | Adresse locale |
|---|---|---|
| PLF 2026, taxe petits colis (rejoué au 19 novembre 2025) | Alibaba France | http://localhost:5173/dossier/petits-colis |
| PLF 2027, taxe sur les holdings | Afep | http://localhost:5173/dossier/plf2027-holdings |
| PLF 2027, apprentissage | U2P | http://localhost:5173/dossier/plf2027-apprentissage |
| PLF 2027, agriculture | FNSEA | http://localhost:5173/dossier/plf2027-agriculture |
| PLF 2027, logement | Union sociale pour l'habitat | http://localhost:5173/dossier/plf2027-logement |
| PLF 2027, rénovation énergétique | CAPEB | http://localhost:5173/dossier/plf2027-renovation |

Autres routes (lues dans `web/src/App.tsx`) :

- `/dossier/<id>/base` : état de la mesure, articles, amendements.
- `/dossier/<id>/depute/<PA>` : fiche d'un député sur ce dossier.
- `/sources` : liste fixe de liens institutionnels (`web/src/views/sources/index.tsx`).

Version statique : `npm run build` contrôle d'abord le sceau de publication des données, puis écrit `dist/` (données comprises). `npm run preview` sert ce dossier.

Version en ligne : `status/P0.md` (17 h 15) consigne une mise en production sur https://bascule-two.vercel.app, configurée par `vercel.json` et `.vercelignore`. Cette adresse n'a pas été testée lors de cette vérification.

## Vérifications

Les résultats mesurés sur l'état livré sont dans [docs/ETAT.md](ETAT.md). Ce tableau dit seulement quoi lancer et ce que chaque commande contrôle.

| Commande | Ce qu'elle vérifie |
|---|---|
| `node --version`, `npm --version`, `bun --version` | Outils présents |
| `npm install` | Installation, sans Bun |
| `npm run dev` | Serveur de développement |
| `curl` sur `/`, `/config.json`, `/<dossier>/verdict.json` | Page et données servies |
| Navigateur sur `/`, les six dossiers, `/dossier/petits-colis/base`, `/sources` | Rendu des pages |
| `npm run typecheck` | Types (`tsc --noEmit`) |
| `node pipeline/publication.mjs --check` | Sceau de publication : dans chaque dossier, les dix fichiers scellés ont la même empreinte SHA-256 que dans `data/<dossier>/publication.json`. N'écrit rien |
| `npm run build` | Le contrôle du sceau ci-dessus, puis `vite build` (site statique dans `dist/`). Échoue si un fichier scellé a été modifié depuis la publication |
| `npm run preview` | `dist/` servi |
| `bun qa/check.ts --root contracts/fixtures` | Schémas et intégrité croisée du jeu d'exemple |
| `bun qa/check.ts --root data` | Schémas et intégrité croisée des données produites |
| `bun run check` | `bun qa/check.ts` (`data` puis `contracts/fixtures`), puis le contrôle du sceau |
| `bun run publish:data` | Valide chaque dossier (`qa/check.ts --dossier <id>`), puis réécrit son sceau. Cette commande modifie `data/<dossier>/publication.json` |
| `bun test` | Tous les tests : `qa/verif.test.ts` et `pipeline/lib/llm.test.ts`, 19 tests |
| `bun run test` (`bun test qa/`) | Tests de `qa/` seuls |
| `bun test pipeline/lib` | Tests de la rédaction vérifiée, hors réseau |

Constats du test initial qui ne dépendent pas des données :

- npm suffit, sans Bun, pour `npm install`, `npm run dev` et `npm run typecheck`.
- `npm run check` et `npm test` demandent Bun : sans Bun dans le `PATH`, ils sortent en code 127 (« bun: not found »).
- `bun qa/croise.ts` lancé seul ne fait rien : le fichier n'a pas de ligne de commande, il est appelé par `qa/check.ts`.

`qa/check.ts` accepte `--root <racine>` et `--dossier <id>` (plusieurs valeurs séparées par des virgules). Sans argument il vérifie `data` puis `contracts/fixtures`. Il ne valide pas chaque JSON de `data/` : les fichiers par député (auditions, débats, amendements, fiches) ne sont chargés que pour les députés listés dans `pivots.json`, et les `publication.json` n'ont pas de schéma.

`pipeline/publication.mjs` accepte `--check`, `--root` et `--dossier`. Pour valider un dossier il appelle Bun ; si Bun est absent, il compile `qa/check.ts` avec Rolldown et le lance avec Node. Ce repli est lu dans le code, il n'a pas été testé.

## Parcours B : régénérer les données

Ce parcours n'a pas été rejoué lors de cette vérification : il appelle des services à clé (API Hémicycle, Featherless) et les sites de l'Assemblée nationale, inaccessibles depuis l'environnement de test. Il dépend aussi de `data/raw/`, non versionné, que seule la collecte recrée. Il est décrit d'après `package.json`, les `pipeline/*/run.ts`, `pipeline/publication.mjs`, `.env.example`, `LANCEMENT.md`, `PLAN.md` et `status/P0.md`.

Prérequis : Bun (version présente lors du test : 1.4.4), `curl` et `unzip` (appelés par `pipeline/collecte/run.ts`).

```sh
cp .env.example .env    # puis renseigner les deux variables
bun install
```

Variables de `.env.example` (valeurs à fournir, jamais versionnées) :

- `HEMICYCLE_API_KEY` : API Hémicycle. Vide, la partie API de la collecte est sautée et seul l'open data est lu (`pipeline/collecte/api.ts`).
- `FEATHERLESS_API_KEY` : modèle de langage. Vide, les textes sont produits par gabarit, sans modèle (`pipeline/lib/README.md`).

Variables facultatives lues par le code : `ORCET_MAX` (défaut 25), `FEATHERLESS_MODEL`, `FEATHERLESS_THINKING`, `FEATHERLESS_CONCURRENCE`, `AUDITIONS_SANS_MODELE`, `AN_AMENDEMENTS_ZIP`, `BASCULE_DATA_DIR`, `BASCULE_CONTRACTS_DIR`.

Ordre des étapes. C'est la chaîne rejouée par P0 depuis un clone frais (`status/P0.md`, 15 h 52), à laquelle s'ajoutent `auditions`, placée avant `fiches` parce que les fiches fusionnent auditions, débats et amendements (`pipeline/fiches/lib/fiches.ts`), et la publication, ajoutée ensuite :

| Ordre | Commande | Produit | Services appelés |
|---|---|---|---|
| 1 | `bun run collecte` (option `--frais`) | `data/raw/`, `groupes.json`, `deputes.json`, `<dossier>/hatvp.json` | Open data de l'Assemblée, HATVP, puis API Hémicycle si la clé est posée |
| 2 | `bun run cohesion` | `data/cohesion.json` | aucun, lit `data/raw/` |
| 3 | `bun run pivots` (`bun run verdict` lance le même script) | `pivots.json`, `etat.json`, `texte.json`, `groupes-action.json`, `verdict.json` | Featherless pour la phrase de lecture |
| 4 | `bun run suite` | `suite.json` | lit `data/raw/` et `cohesion.json` |
| 5 | `bun run auditions`, `bun run debats`, `bun run amendements` | un fichier par député dans `auditions/`, `debats/`, `amendements/`, et `arguments.json` | Sites de l'Assemblée, Featherless |
| 6 | `bun run fiches` (options `--dossier`, `--gabarit`, `--api`) | `fiches/`, `fiches/index.json`, `nouveautes.json`, `action.json` | Featherless ; Hémicycle avec `--api` |
| 7 | `bun run note` (options `--source`, `--out`, `--dossier`) | `note.json` | Featherless |
| 8 | `bun run publish:data` | `<dossier>/publication.json` | aucun |
| 9 | `bun run check` | validation des deux racines et contrôle du sceau | aucun |

La publication vient avant le contrôle final. `pipeline/publication.mjs` valide lui-même chaque dossier avec `qa/check.ts` avant de le sceller, et ne scelle pas un dossier dont la validation échoue. `bun run check` et `npm run build` échouent tant que les fichiers régénérés n'ont pas été scellés à nouveau. Pour lire les erreurs de validation sans toucher au sceau, lancer `bun qa/check.ts --root data` avant l'étape 8.

Coût en crédits Hémicycle, tel qu'il est écrit dans le dépôt :

- `status/P0.md` (15 h 52) : collecte complète de deux dossiers depuis un clone frais, 57 appels, 550 crédits, 151 s ; `data/raw` pèse alors 2,4 Go. Puis cohésion 6 s, pivots 203 s, suite 6 s, amendements 1 s, fiches 8 s, note 21 s.
- `status/P0.md` (16 h 05) : 25 crédits par prédiction Orcet. Le nombre de prédictions par dossier est dans [docs/ETAT.md](ETAT.md).
- `pipeline/collecte/api.ts` : accord entre groupes, 5 crédits par mois ; le commentaire du fichier indique 50 crédits par prédiction Orcet, ce qui diffère des 25 relevés dans `status/P0.md`. `pipeline/fiches/run.ts` : `--api` coûte 5 crédits par texte.
- `pipeline/collecte/lib/hemicycle.ts` : la collecte s'arrête si le solde passe sous 150 crédits.
- `PLAN.md`, annexe A : 1 000 crédits offerts par compte, recharge à partir de 100 € HT.
- Aucun total pour les six dossiers n'est écrit dans le dépôt.

Deux fragilités sont consignées dans `status/P0.md` (15 h 52) : une archive tronquée dans `data/raw/opendata/` fait échouer la collecte sans retéléchargement, et `debats` a échoué sur une machine neuve au téléchargement de `syseron.xml.zip`. L'état de ces correctifs n'a pas été vérifié ici.

## Limites connues du lancement

- **Sceau de publication.** Toute modification d'un fichier scellé de `data/` fait échouer `npm run build` et `bun run check` jusqu'au prochain `bun run publish:data`.
- **Version de Node.** `package.json` demande Node 24.x ; le test a été fait avec Node v22.23.4.
- **Pas de `package-lock.json`.** Seul `bun.lock` est versionné. `npm install` résout donc les versions à partir des plages de `package.json`. Le jour du test, les versions installées par npm étaient celles de `bun.lock` pour vite, react, react-router-dom, typescript, zod et recharts ; rien ne le garantit plus tard.
- **`npm audit`** signalait, le jour du test, 1 vulnérabilité de niveau élevé sur zod (plage `^3` dans `package.json`).
- **Bun** reste requis pour `check`, `test` et tous les pipelines. `publish:data` est prévu avec Bun.
- **Police.** `web/src/tokens.css` charge Inter depuis `fonts.googleapis.com`. Dans l'environnement de test cette requête a été refusée et les pages se sont affichées avec la police de repli.
- **`data/raw/`** (réponses brutes) n'est pas versionné ; sans lui, les étapes 2 à 7 du parcours B ne peuvent pas tourner avant une collecte.
- **Paquet JavaScript.** Lors du test initial, Vite a émis un avertissement de taille sur le paquet JavaScript, sans effet sur le lancement.
- **`npm test`** ne lance que les tests de `qa/` ; `bun test` lance les deux fichiers de tests.
- **Non testé ici** : macOS et Windows, les autres versions de Node, `bun install`, `bun run publish:data`, la version en ligne, tous les pipelines du parcours B.
