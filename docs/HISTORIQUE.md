# Documents de la phase de construction

LegiSpot a été construit le 14 novembre 2026, pendant le Hackathon Open Data, par des sessions de développement menées en parallèle. Ces sessions se coordonnaient par des documents écrits dans le dépôt : un cadrage, un plan, des consignes, des journaux. Ils sont conservés tels quels comme trace de la journée. Après le gel du code, ils ont été déplacés de la racine du dépôt vers `docs/historique/`, sans réécriture de l'historique Git : les chemins qu'ils citent entre eux (`PLAN.md`, `prompts/`, `status/`) se lisent donc relativement à ce dossier.

**Ces documents ne décrivent pas la version finale.** Ils ont été écrits avant ou pendant la construction et peuvent contredire ce qui est livré. La référence actuelle est le [README](../README.md) et le dossier [docs/](./).

## Index

| Document ou dossier | Ce que c'est | Statut |
|---|---|---|
| [docs/historique/idee-du-projet-axel.md](historique/idee-du-projet-axel.md) | Cadrage initial (12 h 20) : client visé, sources de données, produit en quatre vues, risques | Historique : peut contredire l'état final |
| [docs/historique/rendu-final.md](historique/rendu-final.md) | Rendu attendu (version 2, 13 h) : le dossier, les cinq blocs, les règles de fiabilité. Malgré son nom, il fixe la cible avant le développement, il ne décrit pas le résultat | Historique : peut contredire l'état final |
| [docs/historique/PLAN.md](historique/PLAN.md) | Plan de construction (version 3, 13 h 05) : décisions, architecture, formats JSON, répartition des sessions sur trois machines, horaires, risques, rapport de revue | Historique : peut contredire l'état final |
| [docs/historique/LANCEMENT.md](historique/LANCEMENT.md) | Procédure de lancement des sessions sur chaque machine, avec les heures de la journée | Historique : peut contredire l'état final |
| [docs/historique/prompts/](historique/prompts/) | Consignes données à chaque session de développement (`P1` à `P8`, `A1` à `A4`, `X1` à `X3`), règles communes (`_commun.md`) et compléments de 14 h 05 | Historique : peut contredire l'état final |
| [docs/historique/status/](historique/status/) | Journal de chaque session (`P0` à `P8`, `A1` à `A4`, `X1` à `X3`, `AXEL`) : fait, en cours, bloqué, signalements entre sessions | Historique : peut contredire l'état final |
| [docs/historique/demo/](historique/demo/) | Préparation de la démonstration orale : [script](historique/demo/script.md), [pitch](historique/demo/pitch.md), [questions du jury](historique/demo/jury.md). Chiffres relevés à 14 h 25 | Historique : peut contredire l'état final |
| [.interface-design/system.md](../.interface-design/system.md) | Système d'interface : intention, palette claire, hiérarchie, motifs de la Base documentaire et des Sources, contrôles avant livraison. Il renvoie à `web/src/tokens.css` comme source de vérité | Consignes de conception du thème actuel, pas un état des lieux. Pour l'état livré : [web/README.md](../web/README.md) |

Dans tous les cas, la référence actuelle est le [README](../README.md) et le dossier [docs/](./).

## À ne pas confondre : les `prompts/` du pipeline

Le dossier `docs/historique/prompts/` contient les consignes des sessions de développement (historique). Les dossiers `prompts/` situés dans `pipeline/` sont du code vivant : ce sont les consignes envoyées au modèle de langage et les gabarits de repli, lus à chaque exécution du pipeline.

| Dossier | Contenu | Lu par |
|---|---|---|
| [pipeline/verdict/prompts/](../pipeline/verdict/prompts/) | `lecture.md`, `gabarit-lecture.md` : phrase de lecture du verdict | `pipeline/pivots/verdict.ts` |
| [pipeline/fiches/prompts/](../pipeline/fiches/prompts/) | `synthese.md`, `gabarit-synthese.md` : synthèse d'une fiche de député | `pipeline/fiches/lib/fiches.ts`, `pipeline/fiches/lib/gabarits.ts` |
| [pipeline/action/prompts/](../pipeline/action/prompts/) | `contre-argument.md`, `gabarit-contre-argument.md` : réponses aux arguments entendus | `pipeline/fiches/lib/action.ts`, `pipeline/fiches/lib/gabarits.ts` |
| [pipeline/note/prompts/](../pipeline/note/prompts/) | `note.md`, `gabarit-note.md` : compte rendu | `pipeline/note/run.ts` |

Modifier un de ces fichiers change ce que le pipeline produit.

## Écarts connus entre ces documents et la version finale

- **Nombre de dossiers.** Le plan, les consignes et le script parlent de deux dossiers, les journaux de deux, puis de trois, puis de six. `data/config.json` en déclare six.
- **Date de la relecture historique.** Le script et les notes du jury disent « 18 novembre 2025 ». La configuration porte le 19 novembre 2025, lu comme le matin de ce jour (décision de 14 h 57, consignée dans `docs/historique/prompts/complements-14h05.md`).
- **Chiffres de la démonstration.** Les valeurs de `docs/historique/demo/` ont été relevées à 14 h 25. Les fichiers de `data/` ont été régénérés ensuite : des scores, des tendances et des comptes ont changé.
- **Interface.** Le cadrage évoque un terminal financier et les consignes un bouton texte « pourquoi ». L'interface livrée a un thème clair, et la preuve s'ouvre par une icône d'information.
- **Page Sources.** Le journal `docs/historique/status/X2.md` décrit deux tableaux construits depuis les blocs `meta`. La page livrée est une liste de sources institutionnelles.
- **Nom.** Le produit et l'interface s'appellent LegiSpot ; le dépôt conserve le nom Legiscope.

## Pourquoi ils restent à leur place

- Des commentaires du code citent `PLAN.md` et `rendu-final.md` par numéro de section : ces deux fichiers sont désormais dans `docs/historique/` (par exemple `web/src/lib/data.ts`, `pipeline/lib/verif.ts`, `contracts/schemas/enums.ts`).
- Les journaux de `docs/historique/status/` se citent entre eux et citent `docs/historique/prompts/`.
- Le [README](../README.md) et [AGENTS.md](../AGENTS.md) renvoient à cette page plutôt qu'à chaque document.
