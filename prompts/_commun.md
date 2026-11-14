# Règles communes à toutes les sessions (lire en premier)

Tu es une session Claude Code du projet Bascule, hackathon Hémicycle, 14 novembre 2026, démo à 18 h. Le plan complet est dans `PLAN.md` : lis les sections 3, 4, 5 et la ligne de ta session en section 6 avant d'écrire une ligne. Les formats JSON sont dans `contracts/` (schémas zod) et `contracts/fixtures/` (exemples complets). `contracts/README.md` décrit l'arborescence et les routes.

## Ce que tu possèdes
Ton prompt liste les chemins que tu possèdes. Tu n'écris jamais ailleurs. Pas de `bun add` : si tu as besoin d'une dépendance, écris-la dans ton fichier `status/` et continue sans elle (P0 l'ajoute en moins de 5 minutes). `contracts/` ne se modifie pas : un format qui te bloque, tu l'écris dans `status/` et tu produis sur le format actuel.

## Cycle git (à chaque livrable et au moins toutes les 20 minutes)
```
git pull --rebase && git add <tes chemins seulement> && git commit -m "<session>: <quoi>" && git push
```
Jamais `git add -A`, jamais de force push, jamais de branche. Un conflit de rebase : `git rebase --abort`, écris-le dans `status/`, attends P0.

## Ton fichier status/<session>.md (mis à jour à chaque commit)
```
## <heure> 
Fait : ...
En cours : ...
Bloqué : ... (ou rien)
Dépendance demandée : ... (ou rien)
```
P0 ne lit que ce dossier. Une session muette 30 minutes est considérée morte.

## Qualité
- Tout fichier de `data/` que tu écris passe `bun run check` avant le commit.
- Chaque fichier porte son bloc `meta` (sources avec URL, date de génération, limites, producer, dossier_id).
- Les identifiants, dossiers et sujets viennent de `data/config.json`, jamais en dur.
- Scripts rejouables : `bun run <session>` doit tout régénérer depuis zéro.
- Pas de chiffre inventé, pas de citation inventée. Ce que tu n'as pas pu obtenir, tu l'écris dans `meta.limits` et dans `status/`.
- Clés API dans `.env` (voir `.env.example`), jamais commitées.
- Réponds en français, phrases courtes, pas de jargon inventé.

## Heures clés
13 h 15 go/no-go (P0 décide). 14 h 30 données définitives. 15 h bascule du front sur données réelles. 16 h 30 gel du code. 17 h répétition.
