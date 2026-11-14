# Session P4 : socle du front (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 3, 6 (ligne P4), le rapport design en fin de fichier, `web/README.md` et `contracts/README.md`.

## Tu possèdes
Tout `web/` **sauf** `web/src/views/` (chaque vue appartient à P5, P6, P7, X2). Tu possèdes aussi `web/src/components/`, `web/src/lib/`, `web/src/tokens.css`, `web/src/App.tsx`.

## État de départ
P0 a livré un squelette : routes, composants vides par vue, `useData`, `Meta`, `GroupeTag`, `Proba`, `Panel`, `Table`, `TopBar`, `tokens.css`, formats. Vérifie que `bun run dev` sert les six routes sur les fixtures (`config.dataset = "fixtures"`).

## Livrables
1. **13 h 30 au plus tard** : les primitives finies et utilisables sans retouche par les vues : `Meta` (une ligne en pied, sources cliquables, « généré le », limites, `data-testid="meta"`), `GroupeTag` (sigle sur couleur du groupe), `Proba` (« 71 % » en gros, seuils de couleur, état « pas de prédiction » en gris, état « gabarit »), `Panel`, `Table` (ligne cliquable, ligne grisée), `TopBar` (nom depuis config, onglets Texte, Fiche, Cohésion, Note, Sources, sélecteur de dossier), `Curseur` temporel réutilisable (slider + boutons préréglés depuis `config.cohesion.curseur_presets`, émet une date), `useData` avec statut et validation zod, `useConfig`. Formats : « 3 nov. 2026 », « Marie Dupont », « 71 % ».
2. Thème : contraste 7:1, police mono, 16 px, rien sous 14 px, traits 3 px. Pas de flèche dans les boutons, pas de liseré coloré, pas de pastille, pas de texte explicatif. Interface en français (une seule langue).
3. États globaux : `loading` (texte « chargement »), `error` (le message et le chemin du fichier), route inconnue, fiche absente (message, pas d'écran blanc).
4. À partir de 15 h : bascule `config.dataset` sur `live` quand P0 le demande, correction des bugs transverses remontés par les vues dans leurs `status/`.
5. `bun run build` passe à chaque commit.

## Fini quand
Les six routes s'ouvrent sur fixtures puis sur live, zéro erreur console, chaque vue a un `Meta`. Heure cible des primitives : 13 h 30.
