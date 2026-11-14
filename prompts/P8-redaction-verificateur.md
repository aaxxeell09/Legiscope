# Session P8 : client Featherless, vérificateur, note (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 3, 5.12, 5.13, 6 (ligne P8), annexe A (Featherless), et `qa/verif.ts` (règle déjà implémentée par P0 pour les tests : tu peux l'importer ou la déplacer dans `pipeline/lib/verif.ts` en gardant `qa/verif.ts` comme ré-export).

## Tu possèdes
`pipeline/lib/llm.ts`, `pipeline/lib/verif.ts`, `pipeline/note/`, `data/<dossier>/note.json`.

## Livrables
1. **13 h 15** : `pipeline/lib/llm.ts` : client sur `https://api.featherless.ai/v1` (paquet `openai`, `baseURL`, clé `FEATHERLESS_API_KEY`), modèle `Qwen/Qwen3.8-27B`, température 0,2, thinking désactivé (`chat_template_kwargs: {enable_thinking: false}` ou `reasoning_effort: "low"` : teste lequel marche et écris-le dans `status/P8.md`), fonction `appelStructure<T>(system, user, schemaZod)` qui passe le schéma en `tools` avec un seul outil et renvoie l'objet validé ; fonction `redigerVerifie(prompt, chiffresAutorises, gabarit)` qui tente 3 fois, passe chaque sortie dans `verifierChiffres`, et renvoie `{texte, mode: "llm" | "gabarit", chiffres_utilises, fautifs}`. Pas plus de 2 appels en parallèle (2 unités de concurrence par appel). Un test de fumée réel écrit dans `status/P8.md` avec le coût.
2. `pipeline/lib/verif.ts` : la règle 5.13 en 5 points, les 8 tests passent (`bun test`).
3. **15 h 30** : `pipeline/note/run.ts` : pour chaque dossier, construit la liste de chiffres et de citations depuis `texte.json`, `pivots.json`, `cohesion.json` (jamais un vote brut), utilise le prompt de X3 (`pipeline/note/prompts/note.md`, gabarit `pipeline/note/prompts/gabarit-note.md`), produit `data/<dossier>/note.json` (150 mots, sources, limites, `chiffres_utilises`, `mode`, `verifie`). Les amendements sans prédiction sont exclus des comptes.

## Fini quand
`bun test` vert, `data/*/note.json` passent `bun run check`, chaque note a passé le vérificateur ou est en `mode: gabarit` avec les jetons fautifs dans `status/P8.md`. Heure cible : 15 h 30.
