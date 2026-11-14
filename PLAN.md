<!-- /autoplan restore point: /Users/ilansainte-agathe/.gstack/projects/aaxxeell09-Legiscope/main-autoplan-restore-20261114-122731.md -->
# Plan Bascule : construire en une après-midi, à trois machines

Version 3, 14 novembre 2026, 12 h 55. La v2 (12 h 35, revue stratégie, design, ingénierie, rapport en fin de fichier) décrivait quatre vues. À 12 h 45 Axel a publié `rendu-final.md`, qui prime sur son cadrage initial et définit le rendu à partir du besoin du cabinet : **un tableau de bord par dossier, lu en cinq blocs**. Ilan a validé à 12 h 50 : on reprend le rendu final et on adapte le plan. Le pipeline de données et les contrats de la v2 sont conservés et étendus ; ce qui change est la composition du front, trois fichiers JSON de plus, et la démo. Démo à 18 h.

## 0. Ce qui est demandé, ce qui ne l'est pas

Demandé : un plan exécutable qui répartit le travail sur trois machines (MacBook Pro Ilan 9 sessions, MacBook Air Ilan 4, MacBook Pro Axel 3, décidé à 12 h 40), fixe les formats JSON avant tout lancement, et aboutit à 18 h à la démo d'un tableau de bord par dossier en cinq blocs, tel que `rendu-final.md` le décrit.

Pas demandé : la vue multi-dossiers, la presse, le prix, le mode de livraison, le produit réel après le hackathon (écartés par le rendu final, section 7).

## 1. Ce qu'on livre à 18 h

Un site statique servi en local. Un **dossier** = un client, un sujet, un objectif (exemple du rendu : Alibaba, petits colis, empêcher que la taxe soit votée). Deux dossiers :

- **Dossier rejoué** : taxe petits colis, budget 2026, vu la veille du vote (19 novembre 2025), comme dans l'illustration d'Axel. Toutes les données sont filtrées à cette date ; « ce qui s'est réellement passé » (208 contre 87) sert de chute à la démo.
- **Dossier vivant** : la taxe sur les holdings et la fortune improductive (« taxe Zucman ») dans le PLF 2027, le sujet unique le plus riche en données (annexe B). Le PLF 2027 a été rejeté par l'Assemblée le 4 novembre ; le dossier continue au Sénat puis en nouvelle lecture, et c'est exactement ce que le bloc Suite doit dire. Client = une organisation HATVP déclarée sur le sujet, objectif « empêcher la taxe ».

La page d'un dossier, dans l'ordre de lecture du cabinet :

1. **Verdict** (pleine largeur, en tête) : en bonne voie, incertain ou mal engagé par rapport à l'objectif ; tendance ; une phrase de lecture ; ce qui marche et ce qui coince, chaque point avec son bouton « pourquoi ».
2. **Nouveautés** (gauche) : les événements du dossier triés par importance, pas par date.
3. **Suite** (droite) : les prochaines échéances du texte et ce qui a le plus de chances de se produire (prédictions Orcet, lecture de la cohésion).
4. **Action** (pleine largeur) : trois groupes de députés (sur qui on peut encore agir, alliés à protéger, perdus), chaque nom ouvrant sa fiche (auditions, interventions, amendements, HATVP, synthèse) ; les arguments entendus dans les débats, pour et contre la mesure, avec citation et source ; les contre-arguments à amener.
5. **Compte rendu** (pleine largeur) : quelques lignes à reprendre pour le client, chiffres vérifiés soulignés, bouton Copier.

En fond, accessibles d'un lien : l'**état du texte** (étape, voté, reste à voter) et la **base** (articles et amendements du dossier, consultables).

Règle de fiabilité : chaque information affichée porte un bouton « pourquoi » qui montre la source et le raisonnement. Le modèle de langage ne voit jamais un vote et aucun chiffre non sourcé ne passe.

## 2. Décisions

| # | Décision | Choix | Qui, quand |
|---|---|---|---|
| D1 | Périmètre | Complet : cinq blocs, état du texte, base, fiches de députés | Ilan 12 h 40, confirmé 12 h 50 sur le rendu final |
| D2 | Sujet du dossier vivant | **Taxe sur les holdings et la fortune improductive (« taxe Zucman »), PLF 2027** : le plus riche des sujets uniques mesurés (annexe B : 141 amendements, 104 scrutins publics dont 27 sur le PLF 2027, 35 organisations HATVP). Fait mesuré qui change la lecture : le PLF 2027 a été rejeté par l'Assemblée le 4 novembre 2026 (scrutin V9759), le texte est au Sénat et reviendra en nouvelle lecture ; le dossier reste vivant, les positions prises à l'Assemblée sont connues, la suite est le Sénat et la nouvelle lecture. Client : une organisation HATVP déclarée sur le sujet (Afep ou Medef, P1 vérifie la fiche), objectif « empêcher la taxe sur les holdings », position cible contre. | Ilan 12 h 40 (règle : le plus de données), P0 13 h 00 (choix) |
| D3 | Dossier rejoué | Petits colis, date de référence 19 novembre 2025 | Rendu final section 9, Ilan 12 h 40 |
| D4 | Sessions | 16 : 9 + 4 + 3, Axel en personne auprès d'Hémicycle | Ilan 12 h 40 |
| D5 | Forme du rendu | Tableau de bord par dossier en cinq blocs, `rendu-final.md` prime | Axel 12 h 45, Ilan 12 h 50 |
| D6 | Démo | Verdict, Action, Compte rendu sur le dossier rejoué, chute sur le vote réel ; puis le Verdict du dossier vivant. Ordre détaillé section 8, finalisé par X1 à 15 h 15 | P0, à confirmer par X1 |
| D7 | Forme du verdict | Mécanique et sourcée (section 5.15) : l'outil propose, le cabinet tranche | P0, point ouvert 2 du rendu |

Le nom se tranche à 17 h : une chaîne dans `config.json`.

## 3. Architecture

Pas de serveur. Trois couches qui ne se parlent que par des fichiers JSON dont le format est fixé en section 5.

```
Hémicycle API (REST) ──────┐
Open data AN (dossiers,    ├─► pipeline/ (TypeScript, Bun) ──► data/<dossier>/*.json ──► web/ (Vite + React + TS)
  comptes rendus, agenda) ─┤                                     data/cohesion.json           une page par dossier
HATVP (via API) ───────────┤                                          ▲
Featherless (extraction,   │                                          │
  rédaction vérifiée) ─────┘            contracts/ (schémas zod + fixtures), seule dépendance entre sessions
```

- `contracts/` : un schéma zod par fichier, une fixture complète par fichier et par dossier, types du front inférés. Possédé par P0 seul, figé à 13 h 10. `config.dataset` ∈ `live | fixtures` : le front charge l'un ou l'autre, personne ne copie de fichiers.
- `data/` : `config.json`, `groupes.json`, `deputes.json`, `cohesion.json`, `raw/` (réponses brutes, un fichier par scrutin, non commité pour l'open data), et un dossier par dossier (`petits-colis/`, `plf2027-holdings/`) contenant : `etat.json`, `texte.json`, `pivots.json`, `groupes-action.json`, `verdict.json`, `suite.json`, `nouveautes.json`, `arguments.json`, `action.json`, `hatvp.json`, `auditions/<PA>.json`, `debats/<PA>.json`, `amendements/<PA>.json`, `fiches/<PA>.json`, `fiches/index.json`, `note.json`.
- **Date de référence** : quand `config.dossiers[].date_reference` est posée, chaque producteur ne retient que ce qui est daté au plus tard ce jour-là, et un amendement dont le sort est postérieur est `en_attente`. `qa/check.ts` le vérifie.
- `pipeline/` : un sous-dossier par session, un `run.ts`, qui lit `config.json` et itère sur les dossiers. Scripts rejouables.
- `web/` : Vite, React, TypeScript, react-router, Recharts. Routes : `/dossier/:id`, `/dossier/:id/depute/:pa`, `/dossier/:id/base`, `/sources`. Primitives livrées par P4 avant 13 h 50 : `tokens.css`, `Meta`, `Pourquoi`, `GroupeTag`, `Proba`, `Panel`, `Table`, `TopBar`, `Curseur`, `useData`, `useConfig`. La page dossier (`views/dossier/`) est un gabarit à cinq emplacements ; chaque bloc vit dans `views/blocs/<nom>/` et appartient à une session.
- `status/<session>.md` et `prompts/<session>.md` : inchangés (section 4).

Règles tenues par construction : le modèle de langage reçoit des chiffres et des citations, jamais un vote, et `pipeline/lib/verif.ts` rejette tout nombre absent de la liste autorisée (règle 5.13), trois tentatives puis gabarit avec `mode: "gabarit"` ; une seule session (P1) appelle l'API Hémicycle avec un compteur de crédits ; non-inscrits exclus des agrégats ; chaque prédiction est une probabilité datée ; chaque élément affiché porte un `preuve`.

## 4. Git : seize sessions sur une branche sans conflit

Inchangé depuis la v2 : tout le monde sur `main`, chaque session ne touche que ses chemins, P0 possède la racine (`package.json`, `bun.lock`, `tsconfig.json`, `vite.config.ts`, `web/src/App.tsx`), `bun add` interdit (demande dans `status/`), cycle `git pull --rebase && git add <chemins> && git commit && git push` à chaque livrable et toutes les 20 minutes, jamais `git add -A`, jamais de force push, conflit = `status/` et P0 arbitre, gel à 16 h 45.

## 5. Formats JSON (figés à 13 h 10)

Les formats 5.2 à 5.13 de la v2 sont conservés tels quels (meta, enums, groupes, deputes, cohesion, texte, pivots, auditions, debats, amendements, hatvp, fiches, note, règle du vérificateur). Ils sont dans `contracts/schemas/`. Ce qui change ou s'ajoute :

### 5.1 `config.json` (modifié)
```json
{"produit": {"nom": "Bascule", "accroche": "Bascule vous dit quel vote peut basculer, et grâce à qui."},
 "dataset": "live",
 "dossiers": [
   {"id": "petits-colis", "label": "Taxe petits colis, PLF 2026", "texte_id": "PRJLANR5L17B1906",
    "client": "Alibaba France", "objectif": {"texte": "Empêcher que la taxe soit votée", "position_cible": "contre"},
    "date_reference": "2025-11-19",
    "sujet": {"label": "Taxe sur les petits colis", "mots_cles": ["petits colis", "colis", "franchise douanière", "article 22"]},
    "pivot_demo": null},
   {"id": "plf2027-holdings", "label": "PLF 2027, taxe sur les holdings (Zucman)", "texte_id": "PRJLANR5L17B3210",
    "client": "Afep", "objectif": {"texte": "Empêcher la taxe sur les holdings et la fortune improductive", "position_cible": "contre"},
    "date_reference": null, "sujet": {"label": "Taxe sur les holdings et la fortune improductive", "mots_cles": ["zucman", "holding", "holdings", "impôt sur la fortune", "fortune improductive", "patrimoine improductif", "ISF", "IFF"]}, "pivot_demo": null}
 ],
 "dossier_demo": "petits-colis",
 "cohesion": {"paires_demo": [["PO...", "PO..."]], "curseur_presets": [...]}}
```
`position_cible` est la position du client **sur la mesure** (empêcher la taxe = `contre`). Tout « pour » et « contre » des fichiers ci-dessous est relatif à la mesure, jamais à l'objectif.

### 5.14 Bloc `preuve` (sur chaque élément affiché)
```json
"preuve": {"sources": [{"label": "Scrutin n° 1234", "url": "https://..."}], "raisonnement": "Une à trois phrases : d'où vient l'information et pourquoi on la lit ainsi."}
```

### 5.15 `data/<dossier>/verdict.json` (P3, lecture rédigée via P8)
```json
{"meta": {...},
 "verdict": "mal_engage", "score": 0.18, "tendance": "moins_bien",
 "lecture": {"texte": "La mesure est portée par le gouvernement et soutenue par presque tous les groupes.", "mode": "llm", "verifie": true, "chiffres_utilises": []},
 "favorable": [{"titre": "Amendement de suppression déposé par le RN", "detail": "...", "preuve": {...}}],
 "bloquant": [{"titre": "Amendement de compromis du gouvernement", "detail": "...", "preuve": {...}}]}
```
Mécanique du verdict : `score` = part pondérée des sièges dont la position dominante (scrutins liés, sinon amendements, sinon loyauté) va dans le sens de `position_cible`, corrigée par la moyenne Orcet des amendements qui portent la position du client. `verdict` : `bonne_voie` ≥ 0,55, `incertain` entre 0,4 et 0,55, `mal_engage` < 0,4. `tendance` : comparaison du score à la date de référence et sept jours plus tôt (événements, sorts, cohésion). `favorable` et `bloquant` : amendements et positions alignés ou opposés, avis du rapporteur et du gouvernement quand disponibles, chaque point avec sa preuve.

### 5.16 `data/<dossier>/nouveautes.json` (A4)
```json
{"meta": {...}, "evenements": [
  {"id": "...", "date": "2025-11-18", "type": "amendement_depose", "titre": "Le RN dépose un amendement de suppression de l'article 22", "detail": "...", "importance": 3, "url": "https://...", "preuve": {...}}
]}
```
`type` ∈ `amendement_depose | amendement_sort | scrutin | rapport | audition | seance | commission | hatvp | agenda`. `importance` 1 à 3. Tri : importance décroissante puis date décroissante. Rien après `date_reference`.

### 5.17 `data/<dossier>/suite.json` (P2)
```json
{"meta": {...},
 "echeances": [{"date": "2025-11-20", "titre": "Examen de l'article 22 en séance", "lieu": "seance", "url": "https://...", "preuve": {...}}],
 "probables": [{"titre": "Adoption de l'article 22", "proba": 0.81, "detail": "Moyenne Orcet des votes pour sur l'amendement de suppression : 0,19", "preuve": {...}}]}
```
`lieu` ∈ `seance | commission | senat | cmp | autre`. `proba` nullable. Échéances depuis l'agenda open data et l'état du texte ; probables depuis Orcet et la cohésion.

### 5.18 `data/<dossier>/groupes-action.json` (P3) et `arguments.json` (A2), intermédiaires
```json
{"meta": {...}, "actionnables": [{"depute_id": "PA...", "groupe_id": "PO...", "score": 0.34, "raison": "Groupe divisé, 3 écarts récents", "preuve": {...}}], "allies": [...], "perdus": [...]}
```
```json
{"meta": {...}, "pour": [{"argument": "Protéger le commerce et financer les contrôles", "citation": "...", "orateur_id": "PA...", "groupe_id": "PO...", "date": "...", "lieu": "seance", "url": "https://...", "preuve": {...}}], "contre": [...]}
```
Classement des députés : `allies` = groupes dont la position dominante va dans le sens de `position_cible` ; `perdus` = groupes opposés avec loyauté ≥ 0,85 ; `actionnables` = les pivots (section 5.6) des groupes divisés ou des groupes opposés avec loyauté faible. Arguments : toutes les interventions sur le sujet (pas seulement les pivots), classées pour ou contre la mesure, orateur identifié ou `null` (ministre, président).

### 5.19 `data/<dossier>/action.json` (A4)
Fusion de 5.18 : `groupes` (avec `fiche: true|false` selon `fiches/index.json`), `arguments`, plus `contre_arguments` : `[{"texte", "repond_a": "<argument pour>", "chiffres_utilises", "mode", "verifie", "preuve"}]`, rédigés par le modèle à partir des arguments entendus et des chiffres du dossier, passés au vérificateur.

### 5.20 `data/<dossier>/etat.json` (P3)
```json
{"meta": {...}, "etape": "Première lecture, Assemblée nationale, séance publique",
 "etapes": [{"nom": "Commission des finances", "date": "2025-10-22", "statut": "fait", "url": "..."}, {"nom": "Séance publique, première partie", "date": "2025-11-20", "statut": "en_cours", "url": "..."}, {"nom": "Sénat", "date": null, "statut": "a_venir", "url": null}],
 "articles": [{"numero": "22", "titre": "Taxe sur les petits colis", "statut": "reste", "sort_detail": "en discussion", "url": "..."}]}
```

### 5.21 `note.json` devient le bloc Compte rendu
Inchangé (5.12) plus `client` et `objectif` recopiés depuis la config.

## 6. Répartition par machine et par session

Seize sessions et une tâche humaine. Les chemins possédés sont exclusifs.

### MacBook Pro Ilan, 9 sessions

| Session | Possède | Livre | Fini quand |
|---|---|---|---|
| **P0 Chef d'orchestre** (cette session) | racine, `contracts/`, `prompts/`, `config.json`, `qa/`, `LANCEMENT.md` | Schémas, fixtures, dépendances, `App.tsx`, tests, prompts ; go/no-go 13 h 35 ; captures 16 h 45 ; fusion | Démo sur données réelles à 17 h 15, tests verts |
| **P1 Collecte Hémicycle** (seule session qui appelle l'API) | `pipeline/collecte/`, `data/raw/`, `groupes.json`, `deputes.json`, `<dossier>/hatvp.json` | 13 h 20 : mesure d'un appel de chaque type, Orcet sur un amendement en attente du dossier vivant, nombre d'amendements en attente, coût réel. Puis scrutins et votes depuis juillet 2024 (un fichier par scrutin), accord entre groupes, loyauté, textes et amendements des deux dossiers (avec `expose`, `sort`, avis rapporteur et gouvernement si l'API les renvoie), Orcet sur les amendements en attente, HATVP des deux dossiers, agenda open data (`Agenda.json.zip`) dans `raw/opendata/` | Fichiers bruts validés, compteur de crédits à jour |
| **P2 Cohésion et Suite** | `pipeline/cohesion/`, `pipeline/suite/`, `cohesion.json`, `<dossier>/suite.json` | 13 h 35 : « la courbe décroche-t-elle avant les censures ? » avec vrais et faux décrochages ; 14 h 45 : `cohesion.json` ; 15 h 15 : `suite.json` par dossier (échéances depuis l'agenda et `etat.json`, probables depuis Orcet et cohésion, filtrées par `date_reference`) | Fichiers valides, réponse écrite |
| **P3 État, base, pivots, verdict** | `pipeline/pivots/`, `<dossier>/etat.json`, `texte.json`, `pivots.json`, `groupes-action.json`, `verdict.json` | 13 h 50 : pivots provisoires (`base: general`) ; 14 h 45 : `etat.json`, `texte.json`, `pivots.json`, `groupes-action.json` ; 15 h 15 : `verdict.json` (mécanique 5.15, lecture via `redigerVerifie` de P8 avec le prompt de X3). Tout filtré par `date_reference` | Fichiers valides, nombre de scrutins liés publié |
| **P4 Front socle et page dossier** | `web/` sauf `web/src/views/blocs/*`, `views/depute/`, `views/base/`, `views/sources/` | 13 h 50 : primitives finies (`Pourquoi` inclus), page dossier avec en-tête trois lignes et cinq emplacements, états globaux (chargement, erreur, dossier inconnu) ; 15 h 15 : bascule `dataset: live` ; corrections transverses | Les quatre routes s'ouvrent sur fixtures puis live, zéro erreur console |
| **P5 Blocs Verdict et Suite** | `views/blocs/verdict/`, `views/blocs/suite/` | Verdict : bandeau avec le mot (bonne voie, incertain, mal engagé) en gros, score en %, tendance, lecture en une phrase avec badge vérifié ou gabarit, deux colonnes « ce qui marche » et « ce qui coince » avec `Pourquoi` sur chaque ligne ; repli de la courbe de cohésion dans un panneau « tendance » (Recharts, préréglages). Suite : échéances en liste datée, probables avec `Proba` et `Pourquoi` | Conforme sur fixtures puis live |
| **P6 Bloc Nouveautés, page Base** | `views/blocs/nouveautes/`, `views/base/` | Nouveautés : liste triée par importance (3 en gras), date, titre, détail, lien, `Pourquoi`, filtre par type, « rien de nouveau » si vide. Base : état du texte (étapes avec statut), articles (voté, reste, supprimé), table des amendements du dossier (numéro, auteur, groupe, sort, `Proba` Orcet, lien) | Conforme sur fixtures puis live |
| **P7 Bloc Action, page Député, bloc Compte rendu** | `views/blocs/action/`, `views/blocs/compte-rendu/`, `views/depute/` | Action : trois colonnes (agir, alliés, perdus) avec nom, `GroupeTag`, score, raison, `Pourquoi`, ligne cliquable vers la fiche si `fiche: true`, grisée sinon ; dessous deux colonnes d'arguments pour et contre avec citation, orateur, lien, `Pourquoi` ; puis contre-arguments avec badge vérifié. Député : en-tête, synthèse, auditions, débats, amendements, HATVP, couverture, retour. Compte rendu : texte avec chiffres vérifiés soulignés, sources numérotées, bouton Copier | Chaque lien s'ouvre, états vides rendus, fiche absente = message |
| **P8 Rédaction et vérificateur** | `pipeline/lib/llm.ts`, `pipeline/lib/verif.ts`, `pipeline/note/`, `<dossier>/note.json` | 13 h 35 : client Featherless (`Qwen/Qwen3.8-27B`, sortie par `tools`, thinking désactivé), `redigerVerifie`, `appelStructure`, 8 tests ; 15 h 45 : `note.json` par dossier (compte rendu, 150 mots, client et objectif) | Tests verts, notes vérifiées ou en gabarit |

### MacBook Air Ilan, 4 sessions

| Session | Possède | Livre | Fini quand |
|---|---|---|---|
| **A1 Auditions** | `pipeline/auditions/`, `<dossier>/auditions/` | Comme en v2 (dump des dossiers législatifs, HTML des rapports, extraction des « personnes entendues » via Featherless, rattachement rapporteur ou membre de commission), sur la liste des députés de `groupes-action.json` (provisoire : `pivots.json` à 13 h 50), filtré par `date_reference` | Un fichier par député, couverture chiffrée |
| **A2 Débats et arguments** | `pipeline/debats/`, `<dossier>/debats/`, `<dossier>/arguments.json` | Par député : interventions sur le sujet, citation et lien (v2). En plus : `arguments.json` : toutes les interventions sur le sujet (séance via `syseron.xml`, commission via HTML), classées pour ou contre la mesure par `appelStructure`, citation exacte, orateur `PA` ou `null`, preuve | Chaque citation a une URL ; arguments pour et contre non vides sur petits colis |
| **A3 Amendements par député** | `pipeline/amendements/`, `<dossier>/amendements/` | Comme en v2 (auteur ou cosignataire, sort, « travaillé avec » depuis l'exposé des motifs), sur la liste de `groupes-action.json` | Un fichier par député |
| **A4 Fiches, Nouveautés, Action** | `pipeline/fiches/run.ts`, `pipeline/fiches/lib/`, `<dossier>/fiches/`, `nouveautes.json`, `action.json` | Dès 13 h 20 sur fixtures : fiches (fusion pure + synthèse via X3), `index.json` ; `nouveautes.json` assemblé depuis `texte.json` (dépôts, sorts), scrutins, rapports (A1), séances (A2), HATVP, agenda, avec importance (3 : scrutin, sort d'un amendement du client ou d'un allié, avis du gouvernement ; 2 : rapport, audition, dépôt d'amendement de groupe ; 1 : le reste) ; `action.json` = `groupes-action.json` + `arguments.json` + contre-arguments rédigés via `redigerVerifie` et le prompt de X3. Tout filtré par `date_reference`. 15 h 15 : fiche `pivot_demo` d'abord | Fichiers valides, synthèses et contre-arguments vérifiés ou en gabarit |

### MacBook Pro Axel, 3 sessions et Axel en personne

| Session | Possède | Livre | Fini quand |
|---|---|---|---|
| **X1 Script, pitch, jury** | `demo/` | 13 h 50 : script en quatre temps (section 8), trois minutes, variantes selon les mesures de 13 h 35 ; pitch 150 mots ; 15 h 15 : `pivot_demo` et ordre final ; jury joué ; répétitions 17 h 15 et 17 h 40 | Deux répétitions sous trois minutes |
| **X2 README et page Sources** | `README.md`, `views/sources/` | README publiable ; page Sources construite depuis les `meta` | Un inconnu lance la démo en suivant le README |
| **X3 Prompts et gabarits** | `pipeline/fiches/prompts/`, `pipeline/note/prompts/`, `pipeline/verdict/prompts/`, `pipeline/action/prompts/` | 13 h 35 : gabarits de secours (synthèse, lecture du verdict, contre-argument, compte rendu) ; puis les quatre prompts, testés sur fixtures jusqu'à 0 rejet sur 3 essais | A4, P3, P8 les utilisent sans retouche |
| **Axel, en personne, avant 13 h 15** | `demo/terrain.md` | Atlas extrait-il les auditions ? Orcet prédit-il des amendements sans scrutin ? L'API renvoie-t-elle les avis du rapporteur et du gouvernement sur les amendements ? Crédits. Grille du jury | Réponses écrites avant 13 h 35 |

## 7. Horaires

| Heure | Jalon | Qui |
|---|---|---|
| 13 h 10 | `contracts/` v3, fixtures, squelette, prompts v3 commités ; les trois machines clonent et installent ; Axel a posé ses questions | P0, Axel |
| 13 h 15 | Lancement des 15 sessions ; P1 mesure | Ilan, Axel |
| 13 h 35 | **Go/no-go** dans `status/P0.md` : Orcet et amendements en attente (P1), décrochages vrais et faux (P2), coût réel (P1), tests en place (P0), gabarits (X3), client et vérificateur (P8) | P0 |
| 13 h 50 | Pivots provisoires (P3), primitives et page dossier (P4), couverture auditions (A1) | |
| 14 h 15 | Données brutes complètes (P1) | |
| 14 h 45 | `cohesion.json`, `etat.json`, `texte.json`, `pivots.json`, `groupes-action.json` définitifs | P2, P3 |
| 15 h 15 | `verdict.json`, `suite.json` ; blocs sur fixtures ; bascule `dataset: live` ; `pivot_demo` et ordre de démo | P3, P2, P4 à P7, X1 |
| 15 h 45 | Auditions, débats, arguments, amendements ; notes | A1 à A3, P8 |
| 16 h 15 | Fiches, nouveautés, action assemblés et vérifiés | A4 |
| 16 h 45 | Gel. Tests verts sur `live` et `fixtures`. Captures | P0 |
| 17 h 15 | Répétition 1 | X1 |
| 17 h 40 | Répétition 2, nom tranché | tous |
| 18 h 00 | Démo | Ilan ou Axel |

## 8. La démo

1. **Dossier rejoué, Verdict** : « Alibaba, petits colis, empêcher la taxe. Nous sommes le 19 novembre 2025, la veille du vote. Verdict : mal engagé, 18 %. Ce qui marche : le RN a déposé un amendement de suppression (pourquoi : la source). Ce qui coince : le gouvernement prépare un compromis sur le mode de paiement qui lève la réserve de LFI. »
2. **Action** : « Sur qui agir encore : ces députés, pour ces raisons. Alliés : le RN. Perdus : le socle gouvernemental. Arguments entendus contre : la taxe pèse sur les ménages modestes. Pour : 500 M€ de recettes. Contre-argument à amener : ... » Clic sur un député : sa fiche, ses auditions, ce qu'il a dit, ses amendements.
3. **Compte rendu** : « Ceci part au client ce soir. » Bouton Copier.
4. **Chute, puis dossier vivant** : « Ce qui s'est passé le lendemain : 208 contre 87, le RN seul contre. L'outil avait dit mal engagé. » Puis le Verdict du dossier vivant du PLF 2027 : « Et voici ce qu'il dit aujourd'hui, avec les prédictions Orcet sur les amendements en attente. »

Arguments pour le jury : on part du client, pas de la donnée ; chaque information a son pourquoi ; Orcet nourrit le verdict et la suite ; ce que l'API ne structure pas (auditions, arguments des débats, « travaillé avec »), on l'extrait de l'open data et on le rend. Jamais une affirmation sur ce qu'Atlas ne fait pas sans l'avoir demandé.

## 9. Risques et replis

| Risque | Comment on le sait | Repli |
|---|---|---|
| Orcet ne prédit pas des amendements sans scrutin | P1 13 h 20, Axel | Suite et Verdict sans Orcet (positions et amendements) ; la démo reste sur le dossier rejoué |
| L'API ne renvoie pas les avis rapporteur et gouvernement | P1 13 h 20 | `favorable` et `bloquant` depuis amendements et positions seulement |
| Pas d'agenda exploitable | P2 15 h | `suite.echeances` depuis `etat.json` seul |
| Verdict mécanique contre-intuitif sur petits colis (doit dire mal engagé) | P3 15 h 15, test dans `qa/` | Ajuster les pondérations 5.15, le jeu de fixtures sert de cas de référence |
| Zéro scrutin nominatif sur le sujet vivant | P3 13 h 50 | `base: general` affiché, ou changement de sujet |
| Peu d'auditions | A1 13 h 50 | Couverture affichée, la fiche vit sur débats, amendements, HATVP |
| Arguments mal classés pour/contre | A4, X3 | Ne garder que les arguments avec citation et orateur identifié |
| Le front n'est pas prêt | tests P0 | Démo sur Verdict et Action, le reste en captures |
| Une session meurt | `status/` muet 30 min | Relance avec son prompt |
| Featherless indisponible | P8 | Gabarits, `mode: gabarit` |
| Le jury dit « vous avez refait Atlas » | X1 | Partir du client et de l'objectif, montrer le pourquoi et l'open data |

## 10. Ce qui n'est pas dans le périmètre

Vue multi-dossiers, presse, rattrapages après l'Assemblée, message de trente secondes au client final, mode de livraison, prix (rendu final, section 7). Déploiement en ligne. Sénat. Alertes temps réel. Produit réel après le hackathon.

## 11. Ce qui n'a pas été vérifié au moment d'écrire

- Formats de réponse réels des agrégats et de `/scrutins/{id}/votes` (P1 à 13 h 20).
- Si l'API renvoie les avis du rapporteur et du gouvernement sur les amendements (P1, Axel).
- Si le dump des dossiers législatifs contient le texte des rapports (A1 à 13 h 30).
- Si Featherless accepte la désactivation du thinking (P8 à 13 h 35).
- Orcet sur des amendements sans scrutin (P1).
- La fiche HATVP exacte du client du dossier vivant (Afep ou Medef) et le texte de l'objectif (P1 à 13 h 20).
- Si le texte du PLF 2027 est déjà au Sénat ce samedi et à quelle date la nouvelle lecture à l'Assemblée est prévue (P2 pour `suite.json`).

## Annexe A. Ce que l'API Hémicycle et Featherless font vraiment (vérifié le 14 novembre à 12 h 40)

Vérification par lecture des pages `hemicycle.ai/docs/*`, `hemicycle.ai/docs/openapi`, `featherless.ai/docs/*`, `featherless.ai/models`, et `curl HEAD` sur data.assemblee-nationale.fr. Rien testé avec une clé.

### Hémicycle

- Base `https://api.hemicycle.ai/v1`, en-têtes `Authorization: Bearer hmc_live_...` et `Hemicycle-Version: 2026-10-01`. Listes : `data`, `next_cursor`, `has_more` ; `limit` 1 à 100, 20 par défaut ; chaque page facturée. Filtres combinés en ET, valeurs séparées par virgules en OU, tri du plus récent au plus ancien.
- En-têtes `X-Credits-Cost`, `X-Credits-Remaining`. Erreurs RFC 9457 : 402 `credits-insuffisants`, 429 avec `Retry-After`. Débit : 300 requêtes par minute en lecture, 30 par minute pour les modèles, par organisation. 1 000 crédits offerts par compte ; recharge à partir de 100 € HT.
- Endpoints utiles et coût : `GET /scrutins` (1), `GET /scrutins/{id}/votes` (1, pagination inconnue), `GET /scrutins/{id}/resultat` (1), `GET /acteurs` (1, filtres `nom`, `groupe`), `GET /organes` (1, `type`), `GET /textes/{id}` (1), `GET /amendements?texte=...&auteur=...&sort=...` (1), `GET /recherche?q=&types=` (2), `POST /agregats/accord-groupes` (5, période obligatoire), `POST /agregats/loyaute-deputes` (5, `groupe`, `min_votes`, `limite`), `POST /agregats/positions-groupes` (1, 100 scrutins max), `POST /orcet/predictions` (50, `{"amendement": id}`), `GET /entreprises?q=` (2, HATVP), `POST /jeux/interroger` (1 par page de 200 lignes, jeu `votes` filtrable par `scrutin_ref`), `GET /credits` (0).
- Objets : scrutin `id, type, numero, date, titre, objet, resultat, decompte{pour,contre,abstention,non_votants}` ; vote `acteur, groupe (au moment du vote), position` ; amendement `numero, texte, article, dispositif, expose, auteur, groupe, signataires, sort, sort_libelle, date_depot, date_sort` ; acteur `civilite, prenom, nom, profession, hatvp, mandats`.
- Orcet : sortie `amendement, modele (orcet-v2), moyenne_probabilites_pour, confiance, predit_le`. Phrase exacte : « La valeur renvoyée est la moyenne des probabilités individuelles de voter pour, pas la probabilité d'adoption du texte. » Pas de prédiction : 404 non facturé. Précision annoncée : 84 % des votes individuels sur 1 592 scrutins masqués.
- **Non exposé** : débats et comptes rendus (cités comme source sur la page Données, aucun endpoint), rapports parlementaires, schémas de réponse des agrégats.
- MCP : `claude mcp add --transport http hemicycle https://api.hemicycle.ai/mcp --header "Authorization: Bearer $HEMICYCLE_API_KEY"`, 18 outils en lecture seule facturés comme l'API (`interroger`, `rechercher`, `lire_scrutin`, `resultat_scrutin`, `accord_groupes`, `loyaute_deputes`, `predire_vote`, `solde_credits`...). Utile pour explorer à la main, pas pour la collecte en volume.

### Featherless

- Base `https://api.featherless.ai/v1`, `Authorization: Bearer`, `POST /chat/completions`. Paramètres documentés : `model, messages, temperature, top_p, max_tokens, seed, stop, stream, chat_template_kwargs`... `response_format` n'est cité que pour `json_object` sur les modèles sans tool calling natif ; `json_schema` n'apparaît nulle part. Tool calling natif documenté pour la famille Qwen 3 et Kimi K2, format OpenAI `tools` / `tool_calls`.
- `Qwen/Qwen3.8-27B` : 27B FP8, 256K de contexte, « Tool Calling: Supported », thinking par défaut désactivable, 2 unités de concurrence, 0,4 $ en entrée et 3 $ en sortie par million. Replis : `Qwen/Qwen3.6-35B-A3B` (32K affiché), `Qwen/Qwen3-32B` (32K, 0,49 $ sortie).
- Concurrence : 16 à 35B = 2 unités par appel ; dépassement = 429. Un compte Developer a 100 unités, un compte Chat 4 : vérifier le plan du compte avant de paralléliser.

### Open data Assemblée nationale (17e législature)

- `Dossiers_Legislatifs.json.zip` : 11,3 Mo, mis à jour aujourd'hui. Contient les métadonnées des rapports (rapporteurs, numéros, URL), pas leur texte intégral selon la page : le texte s'obtient en HTML sur assemblee-nationale.fr.
- Comptes rendus de séance : `syseron.xml.zip`, 61,9 Mo, un seul fichier XML pour toute la législature, orateurs avec `acteurRef`.
- Comptes rendus de commission : pas d'export en masse trouvé. Lecture en HTML page par page.

---

## Annexe B. Mesure des sujets du PLF 2027 (open data, 14 novembre 2026, 12 h 40 à 13 h 00)

Méthode : archive complète `Amendements.json.zip` (363 Mo, 148 034 fichiers, 42 069 lus pour les PLF 2025, 2026, 2027), `Scrutins.json.zip` (9 895 scrutins, 1 854 scrutins PLF liés à leur amendement par le numéro cité dans le titre), répertoire HATVP `agora_repertoire_opendata.json` (139 Mo, 4 117 organisations, 113 613 fiches d'activité). Mots-clés en regex sur texte sans accents, dans dispositif et exposé sommaire. Scripts et résultats bruts dans le dossier de travail de la session de mesure. Aucune donnée Hémicycle (pas de clé). Rapports et comptes rendus : estimations par recherche sur le site, pas de corpus lu.

**Fait mesuré** : la première partie du PLF 2027 a été rejetée par l'Assemblée le 4 novembre 2026 (scrutin VTANR5L17V9759, texte adopté n° 362 « rejeté »). Les 3 187 amendements « en traitement » du texte 3210 (quasi tous en seconde partie) sont déposés mais ne seront pas examinés à l'Assemblée en première lecture.

| Sujet | Amendements 3210 | dont en attente | Scrutins publics depuis juillet 2024 (dont PLF 2027) | Rapports et CR (estimation) | Organisations HATVP |
|---|---|---|---|---|---|
| TVA (thème transversal) | 599 | 19 | 188 (65) | ~10 | 365 |
| **Holdings, fortune improductive, Zucman** | **141** | 7 | **104 (27)** | ~6 | 35 |
| Crédit d'impôt recherche | 76 | 3 | 65 (23) | ~8 | 96 |
| Cryptoactifs | 42 | 1 | 23 (11) | ~3 | 26 |
| Facturation électronique | 34 | 1 | 5 (4) | ~2 | 38 |
| Petits colis | 29 | 6 | 10 (1) | ~4 | 45 |

Autres sujets mesurés (amendements / scrutins / organisations) : TTF 105 / 47 / 11 ; CDHR 73 / 60 / 10 ; Dutreil 95 / 57 / 33 ; dividendes 139 / 108 / 11 ; niches fiscales 127 / 120 / 17 ; aérien 155 / 49 / 46 ; malus et ZFE 92 / 45 / 170 ; logement 143 / 21 / 116 ; apprentissage 78 / 16 / 138.

Choix : holdings et fortune improductive, sujet unique le plus voté (27 scrutins nominatifs sur le PLF 2027, donc des pivots `base: sujet`), amendements nombreux, lobbying déclaré. La TVA est écartée comme thème, pas sujet. Mots-clés retenus : `zucman | holdings? | impôt sur la fortune | fortune improductive | patrimoine improductif | ISF | IFF`.

Non mesuré : les 1 270 amendements irrecevables sans texte ; 131 scrutins PLF sur articles et motions non rattachés à un sujet ; précision du filtre HATVP (faux positifs possibles sur « holding ») ; comptes rendus de commission non téléchargés.

## GSTACK REVIEW REPORT

Pipeline /autoplan, 14 novembre 2026, 12 h 25 à 12 h 40. Mode **sous-agent seul** : Codex (gpt-5.4 et trois autres modèles) refuse tout appel avec ce compte ChatGPT, donc chaque phase a eu une voix Claude indépendante (sans contexte des autres phases) plus l'analyse du chef d'orchestre. Les trois sous-agents ont tourné en parallèle, Codex devant recevoir le contexte des phases précédentes n'a pas pu tourner. Phase DX faite en ligne par le chef d'orchestre, sans voix indépendante.

### Phase 1, stratégie

**0A Prémisses nommées et évaluées**

| Prémisse | Origine | État | Décision |
|---|---|---|---|
| Les quatre questions (ça passe, ça craque, qui bascule, comment l'aborder) sont le besoin des affaires publiques | Plan Terminal Parlement, Axel | Supposée, pas validée avec un client | Acceptée pour le hackathon, question lundi |
| La courbe de cohésion décroche avant les censures | Plan initial | Non mesurée, granularité mensuelle contre un signal « 3 semaines avant » | Mesure à 13 h 15 avec comptage des faux décrochages |
| Orcet prédit des amendements en attente | Plan initial | La doc dit « le sort probable d'un amendement », sortie = moyenne de probabilités individuelles, 404 sans prédiction | Premier appel à 12 h 55 avant toute collecte |
| Les pivots « sur le sujet » existent | Plan initial | Les amendements de facturation électronique sont votés à main levée : zéro scrutin nominatif probable | `base: sujet | general` affiché, mesuré à 13 h 30 |
| La fiche d'approche distingue d'Atlas | Axel | Non vérifiée | Axel pose la question en personne avant 12 h 55 ; positionnement « couche au-dessus » quelle que soit la réponse |
| Les annexes d'auditions sont extractibles de l'open data | Axel | Partiellement vraie : métadonnées en dump, texte en HTML, 62 % des rapports sans liste (2011) | Rapports de la commission rattachés aux membres, couverture affichée |
| Vingt sessions accélèrent | Ilan | Contestée : l'intégration et l'attention d'Ilan sont la contrainte, pas le temps de développement | Soumise à Ilan : 16 recommandé |
| Les crédits sont illimités | Axel | Non vérifiée, 1 000 par compte, recharge 100 € | X4 avant 13 h 15, coût réel mesuré à 12 h 55 |
| Le jury veut « le croisement de sources que personne ne lit ensemble » avec source visible | Page du hackathon | Vraie | Fiche d'approche et extraction open data en tête de démo |

**0B Code existant** : dépôt vide. Hors dépôt : Hémicycle expose scrutins, votes, agrégats, Orcet, HATVP ; n'expose ni débats ni rapports. Datan et NosDéputés calculent déjà des cohésions de groupe, utilisables comme contrôle de P2 mais pas comme source. Le MCP Hémicycle évite d'écrire un client pour l'exploration.

**0C État rêvé** : aujourd'hui rien ; ce plan = quatre vues sur deux dossiers, servies en local ; à 12 mois = abonnement, tous les textes, Sénat, alertes, fiches d'approche pour chaque député, livraison par mail. Delta : tout ce qui est produit aujourd'hui (contrats, pipeline, vues) est réutilisable ; ce qui ne l'est pas, c'est le choix de sujet et la collecte à la main.

**0C bis Alternatives d'implémentation**

| Approche | Effort | Risque | Verdict |
|---|---|---|---|
| Fichiers JSON et site statique (retenue) | faible, parallélisable | dérive de formats, corrigée par schémas zod partagés et tests | retenue |
| Application Next.js appelant l'API en direct | moyen | crédits brûlés pendant la démo, latence sur scène, un seul code partagé donc conflits | rejetée |
| Notebook ou Streamlit | très faible | ressemble à un notebook devant un jury qui vend un produit | rejetée |
| Exploration via MCP Hémicycle dans Claude Code | nul | pas scriptable en volume | retenue comme tactique de P1 |

**0E Interrogation temporelle** : heure 1 contrats et lancements, go/no-go ; heure 2 données brutes et front sur fixtures ; heure 3 bascule sur données réelles, premiers bugs d'identifiants ; heure 4 fiches et notes, rejets du vérificateur ; heure 5 gel et répétitions ; heure 6 démo, dépendances uniquement locales.

**0F Mode** : expansion sélective.

**Voix CEO (sous-agent Claude)**, résumé : mauvais centre de gravité (trois vues sur quatre refont Atlas, la fiche n'a que 4 sessions et arrive à 16 h) ; cinq prémisses non mesurées ; vingt sessions = coût d'intégration ; regret à 18 h = quatre vues en trois minutes, personne ne retient rien ; alternatives écartées trop vite : HATVP (qui a déjà agi sur ce texte), petits colis comme dossier principal de la fiche, MCP ; risque jury « vous avez refait Atlas ».

```
CEO DUAL VOICES — CONSENSUS TABLE (Codex indisponible)
  Dimension                             Claude   Codex   Consensus
  1. Prémisses valides ?                NON      N/A     signalé : 5 prémisses à mesurer avant 13 h 30
  2. Bon problème ?                     PARTIEL  N/A     signalé : recentrer sur la fiche
  3. Périmètre calibré ?                NON      N/A     signalé : 16 sessions, HATVP ajouté, petits colis complet
  4. Alternatives explorées ?           NON      N/A     signalé : HATVP, petits colis, MCP ajoutés
  5. Risques concurrentiels couverts ?  PARTIEL  N/A     signalé : positionnement « couche au-dessus »
  6. Trajectoire 6 mois saine ?         NON      N/A     hors périmètre aujourd'hui, noté section 10
```

**Registre des erreurs et replis** : section 9 du plan (dix lignes, chacune avec le moment où on le sait et le repli).

**Sections 1 à 10 de la revue stratégique** : marché et client (sections 3 et 4 du cadrage d'Axel, chiffres HATVP sourcés, rien à ajouter) ; concurrence (tableau du cadrage, Atlas non lu en détail, risque traité par le positionnement) ; prix et modèle (abonnement, hors démo) ; périmètre (décisions D1 à D4) ; dépendances externes (Hémicycle, Featherless, open data, toutes vérifiées en annexe A) ; équipe et temps (section 6 et 7) ; risques (section 9) ; mesure du succès (démo tenue, tests verts, jury convaincu par la fiche) ; ce qui n'est pas fait (section 10) ; design (phase 2).

### Phase 2, design

**Voix design (sous-agent Claude)**, résumé : 55 paires de groupes sans paire par défaut ; Orcet pas au centre de la vue Texte ; synthèse en 4e bloc de la fiche ; note en texte brut ; sept états manquants (fiche absente, blocs vides, prédiction nulle, signal vide, chargement, gabarit, retour dans le passé sans contrat) ; rupture de l'arc Cohésion vers Texte ; curseur au trackpad risqué ; routes, primitives, formats et contraste non spécifiés. Mise en page proposée en dix lignes, reprise telle quelle dans les lignes P4 à P7.

```
DESIGN LITMUS SCORECARD (v1 → v2, Codex indisponible)
  1. Hiérarchie de l'information        4/10 → 8/10   amendements au centre, synthèse en tête, paires par défaut
  2. États (vide, chargement, erreur)   2/10 → 8/10   index des fiches, couverture par bloc, useData avec statut
  3. Parcours de démo                   5/10 → 8/10   préréglages du curseur, pont signal → Texte, pivot_demo
  4. Spécificité                        3/10 → 8/10   dix lignes de mise en page, routes, formats
  5. Cohérence entre vues               2/10 → 8/10   cinq primitives et tokens livrés par P4 à 13 h 30
  6. Lisibilité projecteur              3/10 → 7/10   contraste 7:1, 16 px, traits 3 px
  7. Accessibilité clavier              non traité     hors périmètre démo
```

### Phase 3, ingénierie

**Voix ingénierie (sous-agent Claude)**, résumé : deux critiques d'architecture (repli par copie de fichiers casse la propriété ; aucun propriétaire pour lockfile, routeur, dépendances), symlink fragile, `data/raw/` volumineux, A1 à A3 lancées sur de faux identifiants ; deux critiques de contrats (formats intermédiaires absents, retour dans le passé sans contrat) ; nullabilité, enums dupliqués, `sujet_id` répété ; règle précise du vérificateur (sinon toutes les fiches tombent en gabarit) ; complexité cachée des auditions, orateurs, pagination ; cinq tests minimum. Tout est intégré dans la v2.

```
ENG DUAL VOICES — CONSENSUS TABLE (Codex indisponible)
  1. Architecture saine ?               OUI après corrections C1, C2, H1
  2. Tests suffisants ?                 OUI avec les 5 tests de 13 h 15
  3. Performance ?                      N/A (statique local) ; coût API mesuré à 12 h 55
  4. Sécurité ?                         clé API en variable d'environnement, jamais commitée ; données publiques
  5. Chemins d'erreur ?                 OUI : nullabilité, index des fiches, mode gabarit, 404 Orcet
  6. Risque de déploiement ?            nul, démo locale
```

**Architecture**

```
config.json ──► pipeline/collecte (P1) ──► data/raw/*, groupes, deputes, <dossier>/hatvp
                        │
                        ├─► pipeline/cohesion (P2) ──► cohesion.json
                        └─► pipeline/pivots   (P3) ──► <dossier>/texte.json, pivots.json
                                                              │ (liste de PA)
          open data AN ─► auditions (A1), debats (A2), amendements (A3) ──► <dossier>/{auditions,debats,amendements}/<PA>.json
                                                              │
                        pipeline/fiches (A4) + prompts (X3) + lib/llm, lib/verif (P8) ──► <dossier>/fiches/*.json, index.json
                        pipeline/note (P8) ──► <dossier>/note.json
contracts/ (zod) ──► types du front ──► web/ (P4 socle ; P5, P6, P7, X2 vues) ◄── data/ ou contracts/fixtures selon config.dataset
```

**Diagramme de tests** (plan écrit dans `~/.gstack/projects/aaxxeell09-Legiscope/ilan-main-test-plan-*.md`)

| Chemin | Test | Qui | Quand |
|---|---|---|---|
| Chaque fichier de `data/` et des fixtures | validation zod | `bun run check` | 13 h 15, puis toutes les 30 min |
| Références croisées (groupe, député, pivot → fiche, dossier_id) | intégrité | idem | idem |
| Vérificateur de chiffres | 8 cas | tests unitaires P8 | 13 h 15 |
| Cinq routes, fixtures puis live | fumée navigateur, zéro erreur console, `data-testid="meta"` | P0 | 15 h, 16 h 30 |
| Bascule `dataset: fixtures` | les trois précédents | P0 | 16 h 30 |

### Phase 3.5, expérience développeur (en ligne, chef d'orchestre)

Les développeurs sont les quinze sessions et, pour le README, le jury. Temps jusqu'au premier résultat : cloner, `bun install`, coller `prompts/<session>.md` : moins de 5 minutes, à condition que `bun run check` et `bun run dev` marchent sur un clone frais à 12 h 55. Messages d'erreur : `bun run check` doit nommer le fichier, le champ et la valeur fautive ; le vérificateur renvoie le jeton fautif. Nommage : une commande par session, `bun run <session>`. Pas de voix indépendante sur cette phase.

### Thèmes transverses (signal fort, trois voix indépendantes)

- **La fiche d'approche est le produit** : CEO (centre de gravité), design (synthèse en tête, pivot_demo), ingénierie (A4 dès 13 h sur fixtures, formats intermédiaires).
- **Les états vides sont la démo réelle** : design (sept états), ingénierie (nullabilité, couverture par producteur), CEO (13 fiches sur 15 sans audition).
- **Mesurer avant 13 h 30** : CEO (cinq prémisses), ingénierie (coût d'un appel, pivots provisoires), design (préréglages vérifiés).

### Reporté (TODOS.md, lundi)

- Produit réel : quelle valeur défendable sans l'API du concurrent (extraction de documents non structurés).
- Validation des quatre questions avec un client.
- Sénat, alertes, autres textes.
- Accessibilité clavier.

### Journal des décisions

| # | Phase | Décision | Classe | Principe | Justification | Écarté |
|---|---|---|---|---|---|---|
| 1 | CEO | Quatre vues, deux dossiers (aujourd'hui + petits colis complet) | goût → porte | P1 | Chaque couche existe à coup sûr sur petits colis | Petits colis en simple retour dans le passé |
| 2 | CEO | Orcet testé sur un amendement à 12 h 55 avant toute collecte | mécanique | P6 | 50 crédits pour lever la prémisse la plus coûteuse | Attendre 13 h 15 |
| 3 | CEO | Comptage des faux décrochages à 13 h 15 | mécanique | P1 | Sans faux positifs la courbe n'est pas un signal | Juger à l'œil |
| 4 | CEO | Bloc HATVP dans la fiche (1 crédit par lecture) | mécanique | P2 | Dans le rayon, un fichier, c'est le croisement demandé | Reporter |
| 5 | CEO | Axel pose la question Atlas avant 12 h 55 | mécanique | P6 | 70 minutes de construction sur une hypothèse sinon | X4 à 14 h |
| 6 | CEO | 16 sessions au lieu de 20 | défi à Ilan → porte | P3 | Ilan a fixé 10/5/5 ; l'attention est la contrainte | 20 |
| 7 | CEO | Ordre de démo Texte, Fiche, Cohésion, Note | goût → porte | P1 | Une fiche complète retient mieux que quatre vues en 45 s | Ordre d'Axel |
| 8 | CEO | Positionnement « couche au-dessus de l'API » | mécanique | P6 | Ne jamais affirmer ce qu'Atlas ne fait pas | Face à Atlas |
| 9 | CEO | Produit réel reporté à lundi | mécanique | P3 | Hors périmètre du jour | Décider aujourd'hui |
| 10 | Design | Amendements au centre, synthèse en tête, paires par défaut | mécanique | P5 | Hiérarchie du lecteur, pas du pipeline | Ordre v1 |
| 11 | Design | Sept états spécifiés (index fiches, couverture par bloc, prédiction nulle, signal vide, chargement, gabarit, passé) | mécanique | P1 | Un écran blanc en démo | Laisser à l'implémenteur |
| 12 | Design | Trois préréglages du curseur | mécanique | P5 | Trackpad devant un jury | Slider seul |
| 13 | Design | Routes, cinq primitives, tokens, formats livrés par P4 à 13 h 30 | mécanique | P5 | Quatre vues en parallèle = quatre produits sinon | Chacun invente |
| 14 | Design | Contraste 7:1, 16 px, traits 3 px | mécanique | P1 | Projecteur | Thème sombre fin |
| 15 | Design | `pivot_demo` choisi à 15 h sur données réelles | mécanique | P6 | Le rang 1 peut être un inconnu vide | Rang 1 |
| 16 | Eng | Repli par `config.dataset`, pas de copie | mécanique | P5 | La copie casse la propriété des chemins | A5 copie |
| 17 | Eng | P0 possède la racine, dépendances préinstallées, `bun add` interdit | mécanique | P5 | 60 push par heure sur un lockfile | Chacun ajoute |
| 18 | Eng | `publicDir` vers `../data`, pas de symlink | mécanique | P5 | Symlink pendant sur clone frais | Symlink |
| 19 | Eng | `data/raw/` un fichier par scrutin, P1 seul | mécanique | P5 | Dizaines de Mo sinon | Un gros fichier |
| 20 | Eng | Pivots provisoires à 13 h 30, A1 à A3 en scripts rejouables | mécanique | P1 | Sinon ils travaillent sur de faux identifiants | Fixtures jusqu'à 14 h 30 |
| 21 | Eng | Formats intermédiaires 5.7 à 5.10, A4 fusion pure | mécanique | P5 | Trois producteurs, un assembleur | Fiche seule |
| 22 | Eng | Nullabilité, enums unifiés, `dossier_id` dans config seul | mécanique | P5 | Dérive garantie sinon | v1 |
| 23 | Eng | Règle du vérificateur en 5 points, 8 tests | mécanique | P1 | Sinon toute fiche tombe en gabarit sur « 3 novembre » | Regex naïve |
| 24 | Eng | Cinq tests à 13 h 15 | mécanique | P1 | La bascule de 15 h se fait à l'aveugle sinon | Tests à la fin |
| 25 | Eng | Suppression de P9 et A5, X4 devient Axel en personne | mécanique | P3 | Redondants avec P0 et les fixtures | Garder |
| 26 | Annexe | `proba_pour` = moyenne de probabilités individuelles, affiché tel quel | mécanique | P5 | C'est ce qu'Orcet renvoie, ne pas le travestir | « probabilité d'adoption » |
| 27 | Annexe | A1 et A2 sur HTML et syceron, pas sur l'API | mécanique | P1 | L'API n'expose ni rapports ni débats | Chercher un endpoint |
| 28 | Annexe | `Qwen/Qwen3.8-27B`, sortie par tool calling | mécanique | P5 | Seul mode structuré documenté natif | `json_schema` |

### Tâches d'implémentation (P0, avant 12 h 55)

- [ ] **T1 (P1, CC 15 min)** `contracts/` : 12 schémas zod, 12 fixtures, types exportés.
- [ ] **T2 (P1, CC 10 min)** racine : `package.json` avec 15 scripts, dépendances, `vite.config.ts`, `App.tsx` et cinq routes vers des composants vides, `tokens.css` minimal.
- [ ] **T3 (P1, CC 10 min)** `qa/check.ts` : validation, intégrité croisée ; `bun run check` vert sur fixtures.
- [ ] **T4 (P1, CC 15 min)** `prompts/` : 15 prompts, chacun avec chemins possédés, format attendu, heure de livraison, cycle git, règle `status/`.
- [ ] **T5 (P2, CC 5 min)** `README.md` de lancement par machine (clone, `bun install`, `bun run dev`, `bun run check`), ensuite propriété de X2.
STATUS: APPROVED 12:40
