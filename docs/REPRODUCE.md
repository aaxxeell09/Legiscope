# Reproduire LegiSpot depuis un clone frais

LegiSpot (dépôt « Legiscope ») est le projet du Hackathon Open Data du 14 novembre 2026.
Trois dossiers de code : `pipeline/` (TypeScript, Bun) produit `data/<dossier>/*.json`, `web/` (Vite, React) les affiche, `qa/` les valide.

Ce document décrit ce qui a été réellement exécuté le 14 novembre 2026 vers 17 h 04 (heure de Paris), sur une copie fraîche des fichiers suivis par git (commit `5995a14` de `main`, 1 389 fichiers, 25 Mo), sous Linux, avec Node v22.23.4, npm 10.9.9 et Bun 1.4.4.
Ce qui n'a pas été exécuté est signalé comme tel.

## Parcours A : voir le produit sans clé

Prérequis : Node et npm. Version testée : Node v22.23.4. Vite 8.3.8 déclare `^20.19.0 || >=22.12.0` ; les autres versions de Node n'ont pas été testées.
Bun n'est pas nécessaire pour ce parcours : `npm install`, `npm run dev`, `npm run typecheck` et `npm run build` ont été rejoués avec succès sans Bun dans le `PATH`.
Aucune clé n'est nécessaire et aucun fichier `.env` n'est à créer : les données déjà produites sont dans `data/` (21 Mo, 1 128 fichiers) et le site les lit telles quelles.

```sh
git clone https://github.com/aaxxeell09/Legiscope.git
cd Legiscope
npm install
npm run dev
```

Ouvrir ensuite http://localhost:5173. Si le port 5173 est occupé, Vite prend le suivant : l'adresse exacte est écrite dans le terminal.
La racine `/` redirige vers le dossier de démonstration déclaré dans `data/config.json` (`dossier_demo` : `petits-colis`).

Six dossiers sont déclarés dans `data/config.json`. Chacun a répondu 200 sur sa page et sur son `verdict.json` :

| Dossier | Client affiché (exemple) | Adresse locale | État des données |
|---|---|---|---|
| PLF 2026, taxe petits colis | Alibaba France | http://localhost:5173/dossier/petits-colis | complet, rejoué au 19 novembre 2025 |
| PLF 2027, taxe sur les holdings | Afep | http://localhost:5173/dossier/plf2027-holdings | complet |
| PLF 2027, apprentissage | U2P | http://localhost:5173/dossier/plf2027-apprentissage | affiché, 2 erreurs de validation |
| PLF 2027, agriculture | FNSEA | http://localhost:5173/dossier/plf2027-agriculture | affiché, 1 erreur de validation |
| PLF 2027, logement | Union sociale pour l'habitat | http://localhost:5173/dossier/plf2027-logement | incomplet, voir Limites |
| PLF 2027, rénovation énergétique | CAPEB | http://localhost:5173/dossier/plf2027-renovation | incomplet, voir Limites |

Autres routes (lues dans `web/src/App.tsx`) :

- `/dossier/<id>/base` : état de la mesure, articles, amendements.
- `/dossier/<id>/depute/<PA>` : fiche d'un député sur ce dossier.
- `/sources` : les sources institutionnelles utilisées (liste de liens officiels).

Version statique : `npm run build` écrit `dist/` (22 Mo, données comprises), `npm run preview` le sert. Les deux ont été testés.

## Vérifications

Résultats obtenus le 14 novembre 2026 sur la copie fraîche. Seules les commandes exécutées figurent ici.

| Commande | Ce qu'elle vérifie | Résultat obtenu |
|---|---|---|
| `node --version`, `npm --version`, `bun --version` | Outils présents | v22.23.4, 10.9.9, 1.4.4 |
| `npm install` | Installation sans Bun | Code 0, environ 15 s, « added 105 packages », `node_modules` 195 Mo, 1 alerte `npm audit` de niveau élevé (zod) |
| `npm run dev -- --port 5188 --host 127.0.0.1` | Serveur de développement | « VITE v8.3.8 ready in 205 ms » |
| `curl` sur `/`, `/config.json`, `/petits-colis/verdict.json` | Page et données servies | 200, 200, 200 |
| `curl` sur `/dossier/<id>` et `/<id>/verdict.json`, six dossiers | Chaque dossier répond | 200 partout (12 requêtes) |
| `curl` sur les 41 modules de `web/src` | Aucune erreur de transformation | 200 partout |
| Chrome sans interface sur `/`, les six dossiers, `/dossier/petits-colis/base`, `/sources` | Rendu réel des pages | Pages rendues ; `/` mène à petits colis ; logement et rénovation affichent « HTTP 404 » dans les blocs Nouveautés et Action |
| `npm run typecheck` | Types (`tsc --noEmit`) | Code 0, environ 2 s, aucune erreur |
| `npm run build` | Site statique dans `dist/` | Code 0, environ 1 s, « 466 modules transformed », avertissement de taille (JS de 768 ko) |
| `npm run preview` puis `curl` sur 4 adresses | `dist/` servi | 200 partout |
| `bun qa/check.ts --root contracts/fixtures` | Schémas et intégrité du jeu d'exemple | Code 0, « OK : 72 fichiers valides » |
| `bun qa/check.ts --root data` | Schémas et intégrité des données réelles | **Code 1, 56 erreurs** (détail plus bas) |
| `bun run check` (défaut : `data` puis `contracts/fixtures`) | Les deux racines | **Code 1**, mêmes 56 erreurs |
| `npm run check` sans Bun dans le `PATH` | Dépendance à Bun | Code 127, « bun: not found » |
| `bun test` | Tous les tests (`qa/verif.test.ts`, `pipeline/lib/llm.test.ts`) | Code 0, 19 tests passés, 0 échec, environ 0,2 s |
| `bun run test` (`bun test qa/`) | Tests de `qa/` seuls | Code 0, 10 tests passés |
| `bun test pipeline/lib` | Tests de la rédaction vérifiée, hors réseau | Code 0, 9 tests passés |
| `bun qa/croise.ts` | Rien seul | Code 0, aucune sortie : le fichier n'a pas de ligne de commande, il est appelé par `qa/check.ts` |

`qa/check.ts` accepte `--root <racine>` (plusieurs racines séparées par des virgules) et rien d'autre. Sans argument il vérifie `data` puis `contracts/fixtures`.

Détail des 56 erreurs de `bun qa/check.ts --root data` :

- `plf2027-renovation`, 34 erreurs : `nouveautes.json`, `action.json` et `fiches/index.json` absents, aucun fichier dans `debats/` ni dans `fiches/`, et le score du verdict (33 %) absent de `note.json`.
- `plf2027-logement`, 19 erreurs : `nouveautes.json`, `action.json`, `fiches/index.json` et 15 fiches absents, et le score du verdict (60 %) absent de `note.json`.
- `plf2027-apprentissage`, 2 erreurs : `fiches/index.json` liste `PA942` et `PA736201`, absents de `pivots.json` et de `groupes-action.json`.
- `plf2027-agriculture`, 1 erreur : le score du verdict (48 %) absent de `note.json`.
- `petits-colis` et `plf2027-holdings` : aucune erreur.

## Parcours B : régénérer les données

Ce parcours n'a pas été rejoué lors de cette vérification : il appelle des services à clé (API Hémicycle, Featherless) et les sites de l'Assemblée nationale, inaccessibles depuis l'environnement de test. Il est décrit d'après `package.json`, les `pipeline/*/run.ts`, `.env.example`, `LANCEMENT.md`, `PLAN.md` et `status/P0.md`.

Prérequis : Bun (version présente lors du test : 1.4.4), `curl` et `unzip` (appelés par `pipeline/collecte/run.ts`).

```sh
cp .env.example .env    # puis renseigner les deux variables
bun install
```

Variables de `.env.example` (valeurs à fournir, jamais versionnées) :

- `HEMICYCLE_API_KEY` : API Hémicycle. Vide, la partie API de la collecte est sautée et seul l'open data est lu (`pipeline/collecte/api.ts`).
- `FEATHERLESS_API_KEY` : modèle de langage. Vide, les textes sont produits par gabarit, sans modèle (`pipeline/lib/README.md`).

Variables facultatives lues par le code : `ORCET_MAX` (défaut 25), `FEATHERLESS_MODEL`, `FEATHERLESS_THINKING`, `FEATHERLESS_CONCURRENCE`, `AUDITIONS_SANS_MODELE`, `AN_AMENDEMENTS_ZIP`, `BASCULE_DATA_DIR`, `BASCULE_CONTRACTS_DIR`.

Ordre des étapes. C'est la chaîne rejouée par P0 depuis un clone frais (`status/P0.md`, 15 h 52), à laquelle s'ajoute `auditions`, placée avant `fiches` parce que les fiches fusionnent auditions, débats et amendements (`pipeline/fiches/lib/fiches.ts`) :

| Ordre | Commande | Produit | Services appelés |
|---|---|---|---|
| 1 | `bun run collecte` (option `--frais`) | `data/raw/`, `groupes.json`, `deputes.json`, `<dossier>/hatvp.json` | Open data de l'Assemblée, HATVP, puis API Hémicycle si la clé est posée |
| 2 | `bun run cohesion` | `data/cohesion.json` | aucun, lit `data/raw/` |
| 3 | `bun run pivots` (`bun run verdict` lance le même script) | `pivots.json`, `etat.json`, `texte.json`, `groupes-action.json`, `verdict.json` | Featherless pour la phrase de lecture |
| 4 | `bun run suite` | `suite.json` | lit `data/raw/` et `cohesion.json` |
| 5 | `bun run auditions`, `bun run debats`, `bun run amendements` | un fichier par député dans `auditions/`, `debats/`, `amendements/`, et `arguments.json` | Sites de l'Assemblée, Featherless |
| 6 | `bun run fiches` (options `--dossier`, `--gabarit`, `--api`) | `fiches/`, `fiches/index.json`, `nouveautes.json`, `action.json` | Featherless ; Hémicycle avec `--api` |
| 7 | `bun run note` (options `--source`, `--out`, `--dossier`) | `note.json` | Featherless |
| 8 | `bun run check` | validation | aucun |

Coût en crédits Hémicycle, tel qu'il est écrit dans le dépôt :

- `status/P0.md` (15 h 52) : collecte complète de deux dossiers depuis un clone frais, 57 appels, 550 crédits, 151 s ; `data/raw` pèse alors 2,4 Go. Puis cohésion 6 s, pivots 203 s, suite 6 s, amendements 1 s, fiches 8 s, note 21 s.
- `status/P0.md` (16 h 05 et 16 h 53) : 20 prédictions Orcet à 25 crédits chacune pour l'apprentissage ; 24 prédictions Orcet par dossier pour agriculture, logement et rénovation, 1 800 crédits en tout.
- `pipeline/collecte/api.ts` : accord entre groupes, 5 crédits par mois ; le commentaire du fichier indique 50 crédits par prédiction Orcet, ce qui diffère des 25 relevés dans `status/P0.md`. `pipeline/fiches/run.ts` : `--api` coûte 5 crédits par texte.
- `pipeline/collecte/lib/hemicycle.ts` : la collecte s'arrête si le solde passe sous 150 crédits.
- `PLAN.md`, annexe A : 1 000 crédits offerts par compte, recharge à partir de 100 € HT.
- Aucun total pour les six dossiers n'est écrit dans le dépôt.

Deux fragilités sont consignées dans `status/P0.md` (15 h 52) : une archive tronquée dans `data/raw/opendata/` fait échouer la collecte sans retéléchargement, et `debats` a échoué sur une machine neuve au téléchargement de `syseron.xml.zip`. L'état de ces correctifs n'a pas été vérifié ici.

## Limites connues du lancement

- **Validation rouge.** `bun run check` sort en code 1 sur les données versionnées (56 erreurs, détail plus haut). `LANCEMENT.md` annonce un contrôle vert ; il ne l'est que sur `contracts/fixtures`.
- **Deux dossiers incomplets.** Sur `/dossier/plf2027-logement` et `/dossier/plf2027-renovation`, les blocs Nouveautés et Action affichent « HTTP 404 » (`nouveautes.json` et `action.json` absents). Les blocs Verdict, Suite et Compte rendu s'affichent.
- **Pas de `package-lock.json`.** Seul `bun.lock` est versionné. `npm install` résout donc les versions à partir des plages de `package.json`. Le jour du test, les versions installées par npm étaient celles de `bun.lock` pour vite, react, react-router-dom, typescript, zod et recharts ; rien ne le garantit plus tard.
- **`npm audit`** signale 1 vulnérabilité de niveau élevé sur zod (plage `^3` dans `package.json`).
- **Le README et `LANCEMENT.md` demandent Bun et `cp .env.example .env`** pour lancer le site. Le test montre que ni l'un ni l'autre n'est requis pour le parcours A. Bun reste requis pour `check`, `test` et tous les pipelines.
- **Police.** `web/src/tokens.css` charge Inter depuis `fonts.googleapis.com`. Dans l'environnement de test cette requête a été refusée et les pages se sont affichées avec la police de repli.
- **Nom affiché.** Le titre de l'onglet et `data/config.json` (`produit.nom`) portent « LegiSpot ».
- **Taille.** `data/` versionné : 21 Mo. `data/raw/` (réponses brutes) n'est pas versionné ; sans lui, les étapes 2 à 7 du parcours B ne peuvent pas tourner avant une collecte.
- **Paquet JavaScript** de 768 ko après minification (avertissement de Vite, sans effet sur le lancement).
- **`npm test`** ne lance que `qa/` (10 tests) ; `bun test` lance les 19.
- **Non testé ici** : macOS et Windows, les autres versions de Node, `bun install`, tous les pipelines du parcours B.
