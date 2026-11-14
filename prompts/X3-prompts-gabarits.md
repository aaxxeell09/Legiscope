# Session X3 : prompts de synthèse et de note, gabarits (MacBook Pro Axel)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 3, 5.11, 5.12, 5.13, 6 (ligne X3), annexe A (Featherless), et `contracts/fixtures/` (une fiche et une note d'exemple).

## Tu possèdes
`pipeline/fiches/prompts/` et `pipeline/note/prompts/`.

## Livrables
1. **13 h 15, gabarits de secours** (sans modèle) : `pipeline/fiches/prompts/gabarit-synthese.md` et `pipeline/note/prompts/gabarit-note.md` : des textes à trous remplis mécaniquement depuis les champs JSON (position du groupe, nombre d'écarts, organisations entendues, dernier amendement), lisibles, sans chiffre hors de la liste. Documente les variables attendues.
2. `pipeline/fiches/prompts/synthese.md` : prompt système et gabarit utilisateur pour `redigerVerifie` : entrée = chiffres et citations du député (jamais un vote brut), sortie = `position_probable` (une phrase) et `argument` (une phrase, concret, adressé au lobbyiste : « présenter à ce député ... »), en français, chiffres en chiffres (jamais en lettres), uniquement des chiffres présents dans l'entrée, pas de formule creuse, pas de jugement sur la personne. Sortie structurée via l'outil (schéma zod fourni par P8).
3. `pipeline/note/prompts/note.md` : note d'analyste de 150 mots : ce qui va passer, ce qui craque, qui peut basculer, avec les chiffres fournis uniquement, ton d'analyste, limites en une phrase.
4. **Dès que `pipeline/lib/llm.ts` existe (13 h 15)** : teste chaque prompt sur 3 fiches des fixtures et 1 note, 3 fois chacun ; compte les rejets du vérificateur, ajuste le prompt jusqu'à 0 rejet sur 3 essais ; écris les résultats dans `status/X3.md`.

## Fini quand
A4 et P8 utilisent tes prompts sans retouche, gabarits en place, 0 rejet sur les fixtures. Heure cible : 14 h 30.
