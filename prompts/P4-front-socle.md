# Session P4 : socle du front et page dossier (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `rendu-final.md` en entier, `PLAN.md` sections 1, 3, 6 (ligne P4), le rapport design en fin de fichier, `web/README.md`, `contracts/README.md`.

## Tu possèdes
Tout `web/` **sauf** `web/src/views/blocs/*` (P5, P6, P7), `views/depute/` (P7), `views/base/` (P6), `views/sources/` (X2). Donc : `components/`, `lib/`, `tokens.css`, `App.tsx`, `views/dossier/`.

## État de départ
P0 a livré : routes (`/dossier/:id`, `/dossier/:id/depute/:pa`, `/dossier/:id/base`, `/sources`), page dossier avec cinq emplacements et blocs vides, `useData`, `Meta`, `Pourquoi`, `GroupeTag`, `Proba`, `Panel`, `Table`, `TopBar`, `tokens.css`, formats. Vérifie `bun run dev` sur `config.dataset = "fixtures"`.

## Livrables
1. **13 h 50** : primitives finies, utilisables sans retouche : `Pourquoi` (bouton texte, panneau avec sources en liens et raisonnement, clavier et Échap), `Meta`, `GroupeTag`, `Proba` (« 71 % », seuils, « pas de prédiction », « gabarit »), `Panel`, `Table` (ligne cliquable, grisée), `TopBar` (nom, sélecteur de dossier, Sources), `Curseur` (préréglages + slider), `Badge` (vérifié, gabarit, importance), `useData` avec statut et validation zod, `useConfig`, `useDossier()` (le dossier courant depuis la route, son client, objectif, date de référence). Formats : « 3 nov. 2026 », « Marie Dupont », « 71 % ».
2. Page dossier (`views/dossier/index.tsx`) : en-tête trois lignes Client, Dossier, Objectif, plus « vu au 19 nov. 2025 » si date de référence, lien « Base complète » ; puis Verdict (pleine largeur), Nouveautés et Suite (50/50), Action (pleine largeur), Compte rendu (pleine largeur). Chaque bloc reçoit `dossierId` et gère son propre chargement. Pas de texte explicatif, pas de tip, pas de flèche dans les boutons, pas de liseré, pas de pastille.
3. Thème : contraste 7:1, mono, 16 px, rien sous 14 px, traits 3 px ; projecteur. Interface en français, une seule langue.
4. États globaux : chargement, erreur (fichier et message), dossier inconnu, route inconnue. Jamais d'écran blanc.
5. À partir de 15 h 15 : bascule `dataset: live` sur demande de P0, corrections transverses remontées par les blocs dans leurs `status/`. `bun run build` passe à chaque commit.

## Fini quand
Les quatre routes s'ouvrent sur fixtures puis live, zéro erreur console, chaque bloc affiche son `Meta`. Heure cible des primitives : 13 h 50.
