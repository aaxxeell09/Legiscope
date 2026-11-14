# Lancement des sessions (14 novembre 2026)

## Sur chaque machine, une fois

```
git clone https://github.com/aaxxeell09/Legiscope.git ~/Legiscope
cd ~/Legiscope
cp .env.example .env        # puis coller HEMICYCLE_API_KEY et FEATHERLESS_API_KEY
bun install
bun run check               # doit être vert sur contracts/fixtures
bun run dev                 # http://localhost:5173/dossier/petits-colis sur les fixtures
```

Chaque session Claude Code s'ouvre dans `~/Legiscope`. Premier message de la session : le contenu de `prompts/<session>.md` (copier-coller), rien d'autre. Le prompt lui dit de lire `prompts/_commun.md` et `PLAN.md`.

Les sessions de données (P1, P2, P3, A1, A2, A3, A4, P8) peuvent tourner sans navigateur. Les sessions de front (P4, P5, P6, P7, X2) gardent `bun run dev` ouvert.

## MacBook Pro Ilan : 9 sessions

| Session | Prompt | Quoi |
|---|---|---|
| P0 | (cette session, déjà ouverte) | chef d'orchestre, contrats, tests, go/no-go, fusion |
| P1 | `prompts/P1-collecte.md` | seule session qui appelle l'API Hémicycle, clé `hmc_live_` dans `.env` |
| P2 | `prompts/P2-cohesion.md` | courbe de cohésion, réponse de 13 h 35, bloc Suite |
| P3 | `prompts/P3-pivots.md` | état du texte, base, pivots (provisoires 13 h 50), groupes d'action, verdict |
| P4 | `prompts/P4-front-socle.md` | primitives, page dossier, bouton pourquoi, avant 13 h 50 |
| P5 | `prompts/P5-blocs-verdict-suite.md` | blocs Verdict et Suite |
| P6 | `prompts/P6-blocs-nouveautes-base.md` | bloc Nouveautés, page Base |
| P7 | `prompts/P7-blocs-action-compte-rendu.md` | bloc Action, page Député, bloc Compte rendu |
| P8 | `prompts/P8-redaction-verificateur.md` | client Featherless, vérificateur, compte rendu |

Ordre de lancement : P1 et P4 d'abord (tout le monde dépend d'eux), puis P2, P3, P8, puis P5, P6, P7.

## MacBook Air Ilan : 4 sessions

| Session | Prompt | Quoi |
|---|---|---|
| A1 | `prompts/A1-auditions.md` | annexes d'auditions des rapports (open data + HTML) |
| A2 | `prompts/A2-debats.md` | débats par député et arguments entendus pour et contre |
| A3 | `prompts/A3-amendements.md` | amendements par député, « travaillé avec » |
| A4 | `prompts/A4-fiches.md` | fiches, Nouveautés, Action, dès 13 h 20 sur fixtures |

Les quatre tournent sur `contracts/fixtures/` jusqu'aux pivots provisoires de P3 (13 h 50), puis sur `data/`.

## MacBook Pro Axel : 3 sessions, et Axel en personne

| Session | Prompt | Quoi |
|---|---|---|
| X1 | `prompts/X1-demo.md` | script, pitch, jury, `pivot_demo` à 15 h 15, répétitions 17 h 15 |
| X2 | `prompts/X2-readme-sources.md` | README publiable, page Sources dans l'app |
| X3 | `prompts/X3-prompts-gabarits.md` | gabarits avant 13 h 35, prompts synthèse, lecture du verdict, contre-argument, compte rendu |

Axel, avant 13 h 15, auprès de l'équipe Hémicycle, réponses dans `demo/terrain.md` :
1. Atlas extrait-il déjà les auditions des rapports parlementaires ?
2. Orcet prédit-il des amendements qui n'ont pas de scrutin ?
2 bis. L'API renvoie-t-elle les avis du rapporteur et du gouvernement sur les amendements ?
3. Crédits supplémentaires : combien, sur quel compte ?
4. Grille du jury telle qu'annoncée.

## Capacités gardées en réserve

MacBook Pro Ilan : 1 session libre. MacBook Air : 1. MacBook Pro Axel : 2. Elles servent à relancer une session morte (status muet 30 minutes) avec le même prompt, sans arrêter les autres.

## Heures

13 h 15 lancement. 13 h 35 go/no-go dans `status/P0.md`. 13 h 50 pivots provisoires, primitives du front. 14 h 45 données définitives. 15 h 15 verdict et suite, bascule sur `dataset: live`, `pivot_demo` choisi. 15 h 45 auditions, débats, arguments, amendements, comptes rendus. 16 h 15 fiches, nouveautés, action. 16 h 45 gel. 17 h 15 et 17 h 40 répétitions. 18 h démo.
