# Session X3 : prompts de rédaction et gabarits de secours (MacBook Pro Axel)

Lis d'abord `prompts/_commun.md`, puis `rendu-final.md` (règle de fiabilité, section 6), `PLAN.md` sections 3, 5.11, 5.13, 5.15, 5.19, 5.21, 6 (ligne X3), annexe A (Featherless), et `contracts/fixtures/` (une fiche, un verdict, une action, une note).

## Tu possèdes
`pipeline/fiches/prompts/`, `pipeline/verdict/prompts/`, `pipeline/action/prompts/`, `pipeline/note/prompts/`.

## Livrables
1. **13 h 35, gabarits de secours** (sans modèle), textes à trous remplis mécaniquement depuis les champs JSON, sans chiffre hors de la liste, variables documentées : `fiches/prompts/gabarit-synthese.md`, `verdict/prompts/gabarit-lecture.md`, `action/prompts/gabarit-contre-argument.md`, `note/prompts/gabarit-note.md`.
2. Les quatre prompts (système + gabarit utilisateur pour `redigerVerifie` ou `appelStructure` de P8, voir `pipeline/lib/README.md`), en français, chiffres en chiffres, uniquement des chiffres présents dans l'entrée, pas de formule creuse :
   - `fiches/prompts/synthese.md` : `position_probable` (une phrase) et `argument` (une phrase concrète adressée au lobbyiste : « présenter à ce député ... »), à partir des chiffres et citations du député, jamais un vote brut.
   - `verdict/prompts/lecture.md` : une phrase par objectif qui dit pourquoi la situation est favorable, incertaine, défavorable ou indécidable, à partir de la situation, de la tendance, de la confiance, des points favorables et bloquants ; jamais « la loi va passer », toujours « la mesure » et l'étape (« à l'Assemblée, en première lecture »).
   - `action/prompts/contre-argument.md` : un contre-argument de deux phrases à un argument entendu, fondé sur les arguments du camp du client déjà entendus et les chiffres du dossier ; jamais d'attaque personnelle, jamais de chiffre absent de l'entrée.
   - `note/prompts/note.md` : compte rendu de 150 mots que le cabinet adapte pour son client : verdict et pourquoi, ce qui a bougé, prochaines dates, sur qui agir, avec les chiffres fournis uniquement, limites en une phrase.
3. **Dès 13 h 35** : teste chaque prompt 3 fois sur les fixtures des deux dossiers ; compte les rejets du vérificateur ; ajuste jusqu'à 0 rejet sur 3 essais ; résultats dans `status/X3.md`. Le cas petits colis doit donner une lecture du type « la mesure est portée par le gouvernement et soutenue par presque tous les groupes ». Respecte les garde-fous de `prompts/_commun.md` dans chaque prompt système.

## Fini quand
P3, A4 et P8 utilisent tes prompts sans retouche, gabarits en place, 0 rejet sur les fixtures. Heure cible : 14 h 45.
