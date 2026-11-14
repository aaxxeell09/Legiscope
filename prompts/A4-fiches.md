# Session A4 : assemblage des fiches (MacBook Air Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 5.7 à 5.11, 5.13, 6 (ligne A4), 8.

## Tu possèdes
`pipeline/fiches/run.ts` et `pipeline/fiches/lib/` (pas `pipeline/fiches/prompts/`, qui est à X3), `data/<dossier>/fiches/`.

## Tu lis
`data/<dossier>/auditions/`, `debats/`, `amendements/` (A1, A2, A3), `data/<dossier>/hatvp.json` (P1), `data/<dossier>/pivots.json`, `pipeline/lib/llm.ts` (P8), `pipeline/fiches/prompts/synthese.md` et `gabarit-synthese.md` (X3).

## Méthode
1. **Dès 13 h sur les fixtures** : `bun run fiches` fusionne, pour chaque pivot, les trois fichiers intermédiaires (blocs recopiés tels quels), ajoute le bloc `hatvp`, la `couverture` agrégée, et écrit `data/<dossier>/fiches/<PA>.json` et `fiches/index.json` (`disponibles`, `absents` avec raison). Fusion pure : tu n'inventes rien, un fichier intermédiaire absent = bloc vide et pivot listé dans `absents` tant que les trois ne sont pas là.
2. Synthèse : construis la liste de chiffres et de citations du député (jamais un vote brut), appelle `redigerVerifie` avec le prompt de X3, attends-toi à des rejets ; `mode: "gabarit"` après 3 échecs, jetons fautifs dans `status/A4.md`. `synthese: null` si le modèle est indisponible et le gabarit absent.
3. **15 h** : la fiche `config.dossiers[].pivot_demo` de chaque dossier en premier, vérifiée à la main (chaque lien ouvert), puis les autres.

## Fini quand
Toutes les fiches passent `bun run check`, `index.json` à jour, synthèses vérifiées ou en gabarit, fiche de démo relue. Heure cible : 16 h.
