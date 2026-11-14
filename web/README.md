# web/ : l'interface de LegiSpot

Ce dossier contient l'interface : une application React (Vite, TypeScript, React Router, Recharts) sans serveur applicatif. Elle lit les fichiers JSON produits par le pipeline dans `data/` et les affiche comme un tableau de bord par dossier. Le nom interne dans le code est `bascule` (`package.json`, plugins Vite, variables d'environnement).

## Commandes

À lancer depuis la racine du dépôt (les scripts sont dans `package.json`, la configuration dans `vite.config.ts`) :

```sh
npm install          # ou bun install (le dépôt suit bun.lock)
npm run dev          # http://localhost:5173
npm run build        # site statique dans dist/, à la racine du dépôt
npm run preview      # sert dist/
npm run typecheck    # tsc --noEmit sur web/, contracts/, qa/, pipeline/
```

## Routes

Déclarées dans `src/App.tsx`.

| Route | Vue | Fichier |
|---|---|---|
| `/` | Redirige vers `/dossier/<config.dossier_demo>`, à défaut le premier dossier de la configuration | `src/App.tsx` |
| `/dossier/:id` | Vue d'ensemble du dossier : en-tête et cinq blocs | `src/views/dossier/index.tsx` |
| `/dossier/:id/base` | Base documentaire : textes et articles, amendements du dossier | `src/views/base/index.tsx` |
| `/dossier/:id/depute/:pa` | Fiche d'un député dans le contexte du dossier | `src/views/depute/index.tsx` |
| `/sources` | Liste des sources institutionnelles | `src/views/sources/index.tsx` |
| toute autre adresse | « Page introuvable », avec un lien de retour | `src/App.tsx` |

Un identifiant de dossier absent de `config.json` affiche « Dossier inconnu ».

## Structure

| Chemin | Rôle |
|---|---|
| `index.html`, `src/main.tsx` | Point d'entrée, charge `tokens.css` puis `App` |
| `src/App.tsx` | `ConfigProvider`, routeur, lien d'évitement, `TopBar`, états globaux (chargement ou erreur de `config.json`), `ErrorBoundary` par page |
| `src/tokens.css` | Variables du thème et styles communs : coquille, panneaux, tableaux, badges, preuve, grille du tableau de bord |
| `src/components/` | Composants partagés, exportés par `index.ts` |
| `src/lib/config.tsx` | Lecture unique de `config.json`, `useConfig()`, `useDossier()`, `baseFor()` |
| `src/lib/data.ts` | `useData<T>(kind, dossier?, pa?)`, `pathFor()`, cache par URL |
| `src/lib/contracts.ts` | Pont vers les schémas Zod de `contracts/`, `validate()` |
| `src/lib/format.ts` | `formatProba`, `formatDate`, `formatDateTime`, `formatMois`, `formatNom`, `formatNombre` |
| `src/views/dossier/` | En-tête du dossier et grille des cinq blocs |
| `src/views/blocs/` | Un dossier par bloc : `verdict`, `nouveautes`, `suite`, `action`, `compte-rendu` |
| `src/views/base/`, `src/views/depute/`, `src/views/sources/` | Les trois autres pages |

## Tableau de bord

`views/dossier/index.tsx` pose l'en-tête : client, titre du dossier, mesure, mention « Relecture historique » avec la date quand `date_reference` est posée (sinon « Dossier vivant »), lien vers la Base documentaire, contexte parlementaire, puis les objectifs sous forme d'onglets (« Principal », « Repli 1 », etc.). L'onglet choisi est transmis au bloc Verdict.

La grille (`.dossier-grille` dans `tokens.css`) place Verdict sur toute la largeur, Nouveautés et Suite côte à côte, puis Action et Compte rendu sur toute la largeur. Sous 1100 px, elle passe sur une colonne. Chaque bloc est un composant exporté par défaut de `views/blocs/<nom>/index.tsx`, charge ses propres données avec `useData` et est isolé par un `ErrorBoundary` : un bloc en erreur n'emporte pas la page.

## Composants partagés

| Composant | Rôle |
|---|---|
| `TopBar` | Barre latérale (marque, menu « Dossier actif », liens Vue d'ensemble, Base documentaire, Sources, indicateur « Données produites » ou « Données de démonstration ») et bandeau de contexte en haut de page. Sous 780 px, la barre latérale s'ouvre par un bouton « Menu » |
| `Pourquoi` | La preuve d'une information, voir ci-dessous |
| `Meta` | Pied de bloc réduit aux sources, voir ci-dessous |
| `Etat`, `Chargement`, `Erreur` | Enveloppe d'un bloc selon l'état de `useData` : chargement, erreur, contenu |
| `ErrorBoundary` | Attrape une erreur de rendu et affiche son message à la place de la zone |
| `Panel` | Surface avec titre et élément à droite du titre |
| `Table` | Tableau à colonnes typées, ligne cliquable (clavier compris), ligne grisée, message quand il est vide |
| `Badge` | Étiquette courte : nature de la preuve, mode de rédaction, importance, chiffres contrôlés ou non |
| `GroupeTag` | Sigle d'un groupe sur sa couleur, texte noir ou blanc selon la luminance |
| `Proba` | Pourcentage coloré par seuils (0,6 et 0,4), « pas de prédiction » pour `null` |
| `Curseur` | Curseur de date avec préréglages, utilisé par le panneau « Tendance » du Verdict |

### La preuve : `Pourquoi`

`<Pourquoi preuve={e.preuve} />` (ou `sources`, `raisonnement`, `nature` passés séparément) affiche une **icône d'information « ⓘ »**, pas un bouton texte. Son libellé accessible est « Voir les sources et le raisonnement ». Le clic ouvre un panneau (`role="dialog"`) qui contient, dans l'ordre : la nature de la preuve en badge (« fait publié », « déduction », « inconnu »), le raisonnement, la liste des sources en liens, un bouton « Fermer ». Échap ferme et rend le focus à l'icône, un clic hors du panneau ferme. Le composant est utilisé dans les blocs Verdict, Nouveautés, Suite et Action, et dans la fiche du député.

### Le pied : `Meta`

`<Meta meta={data.meta} />` affiche un seul élément repliable « Sources » : les sources du fichier, dédoublonnées par URL, en liens. La date de génération, les limites et le producteur restent dans les JSON et ne sont pas affichés. Sans source, le composant ne rend rien.

## Chargement des données

1. `ConfigProvider` lit `/config.json` une fois. **Repli :** si ce fichier est absent ou illisible, il lit `/fixtures/config.json` et force le jeu `fixtures`.
2. `useData` construit l'adresse du fichier avec `pathFor()` : `groupes`, `deputes`, `cohesion` à la racine ; `verdict`, `nouveautes`, `suite`, `action`, `etat`, `texte`, `pivots`, `hatvp`, `note` sous `/<dossier>/<kind>.json` ; `fiches_index` sous `/<dossier>/fiches/index.json` ; `fiche` sous `/<dossier>/fiches/<PA>.json` ; `auditions`, `debats`, `amendements` sous `/<dossier>/<kind>/<PA>.json`.
3. Le préfixe dépend de `config.dataset` (`baseFor()`) : vide pour `live` (`data/` est servi à la racine du site), `/fixtures` pour `fixtures` (`contracts/fixtures/`, même arborescence).
4. La réponse est validée par le schéma Zod du type demandé. Un schéma absent est une erreur : aucun JSON n'est accepté sans validation. Un fichier dont `meta.dossier_id` diffère du dossier demandé est refusé.
5. Le résultat est mis en cache par URL. États rendus : `loading`, `ok`, `error` (le message nomme l'adresse et le champ fautif).

Le repli sur les fixtures porte sur le jeu entier, pas fichier par fichier : en `live`, un fichier manquant met son bloc en erreur. `contracts/fixtures/` contient deux dossiers (`petits-colis`, `plf2027-holdings`) avec des députés fictifs.

## Ce que fait `vite.config.ts`

- `root` vaut `web`, `publicDir` vaut `data/` : `data/config.json` est servi à `/config.json`.
- Le plugin `bascule-fixtures` sert `contracts/fixtures/` sous `/fixtures/` en développement. En développement comme en prévisualisation, il répond 404 en JSON pour un fichier `.json` absent, au lieu de la page de l'application.
- Au build, `data/` est copié dans `dist/` sans `data/raw/`, et les fixtures dans `dist/fixtures/`.
- Le plugin `bascule-contracts` expose `contracts/index.ts` par le module `virtual:contracts`. Alias : `@contracts` et `@web`.

Deux variables d'environnement sont lues, toutes deux facultatives :

| Variable | Effet |
|---|---|
| `BASCULE_DATA_DIR` | Remplace `data/` par un autre dossier |
| `BASCULE_CONTRACTS_DIR` | Remplace `contracts/` (schémas et fixtures) par un autre dossier |

Le code de `src/` ne lit aucune variable d'environnement.

## Thème

Thème clair unique (`color-scheme: light`), défini par les variables de `src/tokens.css` : fond ivoire `--bg`, surfaces blanches et pierre, texte presque noir, accent bleu, vert, ambre et rouge réservés aux états. Police Inter, chargée depuis Google Fonts, avec repli sur les polices du système. Les intentions de conception sont décrites dans [.interface-design/system.md](../.interface-design/system.md).
