# Repères pour un agent de code

Document factuel : structure, commandes, points d'entrée. La présentation du produit est dans [README.md](README.md).

## Structure

| Chemin | Contenu |
|---|---|
| `pipeline/` | Scripts TypeScript lancés avec Bun. Un sous-dossier par étape, point d'entrée `run.ts`. Produit `data/` |
| `pipeline/lib/` | Appel au modèle de langage (`llm.ts`) et vérificateur de nombres (`verif.ts`) |
| `pipeline/*/prompts/` | Consignes et gabarits de repli réellement utilisés par le pipeline |
| `contracts/schemas/` | Un schéma Zod par fichier JSON. `contracts/index.ts` exporte schémas, types et `dataPath()` |
| `contracts/fixtures/` | Jeu d'exemple (députés fictifs), même arborescence que `data/` |
| `data/config.json` | Liste des dossiers : client, mesure, objectifs, mots-clés, date de référence |
| `data/<dossier>/` | Fichiers JSON d'un dossier (`verdict.json`, `nouveautes.json`, `suite.json`, `action.json`, `note.json`, `etat.json`, `texte.json`, etc.) |
| `web/src/` | Interface React. Routes dans `App.tsx`, chargement dans `lib/`, blocs dans `views/blocs/` |
| `qa/` | `check.ts` (schémas), `croise.ts` (cohérence entre fichiers), `verif.ts` et tests |
| `pipeline/publication.mjs` | Sceau de publication : empreinte SHA-256 des fichiers validés de chaque dossier |
| `docs/` | Documentation de la version finale. `docs/ETAT.md` est généré par `docs/mesurer.mjs` |

## Commandes

| Commande | Effet |
|---|---|
| `npm install` puis `npm run dev` | Lance l'interface sur http://localhost:5173, sans clé |
| `npm run typecheck` | Types TypeScript |
| `npm run build` | Contrôle du sceau de publication, puis site statique dans `dist/` |
| `bun run check` | Validation de `data/` et du jeu d'exemple, puis contrôle du sceau |
| `bun run publish:data` | Valide et scelle chaque dossier (`data/<dossier>/publication.json`). À relancer après toute modification de `data/` |
| `node docs/mesurer.mjs --commandes > docs/ETAT.md` | Régénère l'état mesuré du dépôt |
| `bun test` | Tests |
| `bun run collecte`, `cohesion`, `pivots`, `suite`, `amendements`, `auditions`, `debats`, `fiches`, `note` | Étapes du pipeline. Demandent un fichier `.env` (voir `.env.example`) |

## Conventions

- Les couches ne communiquent que par les fichiers JSON de `data/`, conformes aux schémas de `contracts/schemas/`.
- Les fichiers JSON produits par le pipeline portent un bloc `meta` (sources, date de génération, limites). Les éléments des fichiers `verdict`, `nouveautes`, `suite`, `action` et `etat` portent une `preuve` de nature `fait`, `deduction` ou `inconnue`.
- Le modèle de langage ne produit aucun nombre : `pipeline/lib/verif.ts` rejette un texte qui contient un nombre absent de la liste fournie.
- Les clés d'API ne vont que dans `.env`, jamais dans un fichier suivi.
- `PLAN.md`, `LANCEMENT.md`, `prompts/` et `status/` sont les documents de la journée de construction (voir [docs/HISTORIQUE.md](docs/HISTORIQUE.md)). Ils ne décrivent pas forcément l'état final.
