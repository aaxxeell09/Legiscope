# web/ : le front de Bascule

Vite, React, TypeScript, react-router, Recharts. Pas de serveur : un tableau de bord par dossier (rendu-final.md), qui lit des fichiers JSON.

## Lancer

```sh
bun install          # à la racine du dépôt, une fois
bun run dev          # http://localhost:5173
bun run build        # produit dist/ à la racine du dépôt
bun run preview      # sert dist/
bun run typecheck    # tsc --noEmit sur web/, contracts/, qa/, pipeline/
```

## Routes

| Route | Vue | Fichier |
|---|---|---|
| `/` | redirige vers `/dossier/<config.dossier_demo>` | `App.tsx` |
| `/dossier/:id` | tableau de bord du dossier : en-tête et cinq blocs | `views/dossier/index.tsx` |
| `/dossier/:id/depute/:pa` | fiche d'un député sur ce dossier | `views/depute/index.tsx` |
| `/dossier/:id/base` | base complète : état du texte, articles, amendements | `views/base/index.tsx` |
| `/sources` | sources et limites | `views/sources/index.tsx` |

## Le tableau de bord

`views/dossier/index.tsx` pose l'en-tête (Client, Dossier, Objectif, lus dans `config.dossiers[]` : `client`, `label`, `objectif.texte`, plus « vu au 19 nov. 2025 » quand `date_reference` est posée), un lien « Base complète », puis cinq emplacements :

```
Verdict                       (pleine largeur)
Nouveautés 50 % | Suite 50 %
Action                        (pleine largeur)
Compte rendu                  (pleine largeur)
```

Chaque emplacement rend un composant de `views/blocs/<nom>/index.tsx` (`verdict`, `nouveautes`, `suite`, `action`, `compte-rendu`), export par défaut, props `{ dossier: string }`. Ces cinq dossiers appartiennent chacun à une session ; `views/dossier/index.tsx` et la grille CSS (`.dossier-grille` dans `tokens.css`) appartiennent à P0. Un bloc charge ses propres données avec `useData` et finit par un `<Meta>`.

## Où sont les choses

| Chemin | Rôle |
|---|---|
| `web/src/App.tsx` | Routes, `ConfigProvider`, `TopBar` |
| `web/src/tokens.css` | Variables du thème (couleurs, tailles, `--stroke` 3 px pour les graphiques), styles de base, des primitives, de la grille du tableau de bord |
| `web/src/components/` | `Meta`, `GroupeTag`, `Proba`, `Panel`, `Table`, `TopBar`, `Pourquoi` (export groupé dans `index.ts`) |
| `web/src/lib/data.ts` | `useData<T>(kind, dossier?, pa?)` |
| `web/src/lib/config.tsx` | Lecture unique de `config.json`, `useConfig()` |
| `web/src/lib/contracts.ts` | Pont vers les schémas zod de `contracts/` |
| `web/src/lib/format.ts` | `formatProba`, `formatDate`, `formatDateTime`, `formatMois`, `formatNom`, `formatNombre` |

Une vue ou un bloc n'importe que depuis `components`, `lib/*` et `@contracts/index` (types). Il ne touche ni `App.tsx` ni `tokens.css` : besoin d'une variable ou d'une primitive, l'écrire dans `status/`.

## Primitives

- `<Pourquoi sources={[{label, url}]} raisonnement="…" />` : règle de fiabilité, un par information. Bouton texte « pourquoi », panneau avec le raisonnement et les sources en liens. Entrée ou Espace ouvre, Échap ferme et rend le focus au bouton, clic hors du panneau ferme.
- `<Meta meta={data.meta} />` : une ligne en pied de bloc ou de vue, sources en liens, « généré le », limites. `data-testid="meta"`.
- `<GroupeTag sigle="RN" couleur="#0D378A" />` : sigle sur la couleur du groupe, texte noir ou blanc selon la luminance.
- `<Proba value={0.71} size="lg" label="de votes pour prédits" />` : « 71 % » ; vert ≥ 0,6, orange de 0,4 à 0,6, rouge < 0,4, gris « pas de prédiction » pour `null`.
- `<Panel title="Positions" aside="8 groupes">…</Panel>` : titre, bordure, contenu.
- `<Table columns={…} rows={…} rowKey={r => r.id} onRowClick={…} isRowMuted={r => !r.fiche} />` : colonnes typées (`render`, `align`, `width`), ligne cliquable, ligne grisée, message « vide ».
- `<TopBar />` : nom du produit, sélecteur de dossier (navigue vers `/dossier/:id`), lien Sources. Déjà posée par `App.tsx`.

## Comment un bloc charge ses données

```tsx
import type { Verdict } from "@contracts/index";
import { useData } from "../../../lib/data";
import { Meta, Panel, Pourquoi } from "../../../components";

export default function VerdictBloc({ dossier }: { dossier: string }) {
  const r = useData<Verdict>("verdict", dossier);
  if (r.status === "loading") return <Panel title="Verdict"><div className="status">Chargement</div></Panel>;
  if (r.status === "error") return <Panel title="Verdict"><div className="status status-error">{r.error}</div></Panel>;
  const v = r.data!;
  return (<Panel title="Verdict">… <Meta meta={v.meta} /></Panel>);
}
```

`useData` :

1. lit `config.json` une seule fois (`ConfigProvider` dans `App.tsx`) ;
2. résout le chemin : `groupes | deputes | cohesion` à la racine ; `verdict | nouveautes | suite | action | etat | texte | pivots | hatvp | note | fiches_index` sous `/<dossier>/<kind>.json` (`fiches_index` → `/<dossier>/fiches/index.json`) ; `auditions | debats | amendements | fiche` sous `/<dossier>/<kind>/<PA>.json` (la fiche sous `/<dossier>/fiches/<PA>.json`) ;
3. préfixe selon `config.dataset` : `live` lit `data/` (servi à la racine du site), `fixtures` lit `contracts/fixtures/` (servi sous `/fixtures/`) ;
4. valide la réponse avec le schéma zod de `contracts/index.ts` (`VerdictSchema`, ou la map `SCHEMAS`) et refuse un fichier dont `meta.dossier_id` diffère du dossier demandé ; sans schéma exporté pour ce kind, les données passent telles quelles avec un avertissement console ;
5. met en cache par URL ; `clearDataCache()` vide le cache.

Statuts : `loading | ok | error`, avec `data` ou `error` (message qui nomme l'URL et le premier champ fautif).

## Où le front lit les fichiers

- `data/` est le `publicDir` de Vite (`vite.config.ts`, pas de lien symbolique) : `data/config.json` est servi à `/config.json`, `data/petits-colis/verdict.json` à `/petits-colis/verdict.json`. Au build, `data/` est copié à la racine de `dist/` et `dist/raw/` est retiré (réponses brutes de l'API, volumineuses).
- `contracts/fixtures/` est servi sous `/fixtures/` par le plugin Vite `bascule-fixtures` en dev, et copié dans `dist/fixtures/` au build. Les fixtures reproduisent l'arborescence de `data/`.
- Choix fait : le préfixe `live` est vide (pas `/data/`), parce que `publicDir` sert toujours à la racine du site ; un préfixe `/data/` aurait demandé une réécriture en dev qui n'existerait pas dans `dist/`. Le préfixe se change en un endroit, `baseFor()` dans `web/src/lib/config.tsx`.
- `config.json` est toujours lu dans `data/` ; s'il manque (clone frais sans données), `contracts/fixtures/config.json` est lu à la place et le jeu passe en `fixtures`.
- `contracts/index.ts` est importé par le module virtuel `virtual:contracts` (plugin `bascule-contracts`) : s'il n'existe pas, le module est vide, le build passe, et `useData` renvoie les données sans les valider.

Variables d'environnement du build et du dev : `BASCULE_DATA_DIR` et `BASCULE_CONTRACTS_DIR` remplacent `data/` et `contracts/` (tests, captures).

## Thème

Sombre, type terminal financier : fond `#0b0e14`, surface `#141922`, texte `#e6edf3`, texte secondaire `#a6b0bc`, accent `#5ab4ff`, succès `#4ade80`, alerte `#fbbf24`, danger `#ff8585`, bordure `#2a3340`. Chaque couleur de texte fait au moins 7:1 sur le fond et sur la surface. Police monospace système, 16 px de base, rien sous 14 px, traits de graphique `var(--stroke)` = 3 px. Pas de flèche dans les boutons, pas de liseré coloré, pas de pastille, pas de texte explicatif.
