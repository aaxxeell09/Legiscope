# Session X2 : README et page Sources (MacBook Pro Axel)

Lis d'abord `prompts/_commun.md`, puis `rendu-final.md`, `PLAN.md` sections 1, 3, 10, 11, annexes A et B, et `contracts/README.md`, `web/README.md`.

## Tu possèdes
`README.md` (racine, dès maintenant : P0 n'y touche plus) et `web/src/views/sources/`.

## Livrables
1. `README.md` publiable : ce que fait Bascule en trois phrases (un tableau de bord par dossier, un client, un sujet, un objectif, cinq blocs), capture (à 16 h 30, fournie par P0 dans `qa/captures/`), lancement en quatre commandes (clone, `.env`, `bun install`, `bun run dev`), sources de données avec liens et licences, limites, ce que le modèle de langage voit et ne voit pas, crédits (Hémicycle, Featherless, open data AN, HATVP), équipe. En français. Pas de prix.
2. `web/src/views/sources/index.tsx` (route `/sources`) : page « Sources et limites » dans l'app : un tableau source → ce qu'on en tire → date de synchronisation → limite, construit depuis les blocs `meta` des fichiers chargés (`useData` sur config, cohesion, verdict, nouveautes, suite, action, etat du dossier courant) plus les sources fixes (open data AN, HATVP, Featherless). `Meta` en pied.
3. Relis à 16 h 45 que chaque bloc affiche bien source, date et limites et que chaque ligne a son `Pourquoi` ; écris les manques dans `status/X2.md`.

## Fini quand
Un inconnu lance la démo en suivant le README ; la page Sources s'ouvre sur fixtures et live. Route `/sources`, en-tête commune de P4.
