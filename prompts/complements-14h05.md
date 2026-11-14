# Compléments d'Axel (relecture des status de 14 h 05)

Arbitré par Ilan à 14 h 10. Chaque session concernée lit **sa section** ci-dessous, fait ses changements en petits commits sur `main` (ses chemins seulement, règles de `prompts/_commun.md`), met à jour son `status/`, sans poser de question. Tout est fini **avant 15 h 45** (le gel reste à 16 h 45).

Reprise sur une machine : `git pull`, puis coller dans la session concernée : « Lis `prompts/complements-14h05.md`, fais ta section, commit, push, status. »

## Les 7 compléments en une ligne

| # | Complément | Sessions |
|---|---|---|
| 1 | Auditions : « a entendu » seulement si rapporteur ; membre = « entendues par les rapporteurs de sa commission », à part et moins fort ; jamais « a auditionné » | A1, A4, P7 |
| 2 | Amendements du gouvernement et de la commission dans `texte.json` et la page Base, auteur « Gouvernement » ou « Commission » ; le compromis du gouvernement sur les petits colis visible dès sa date de dépôt, dans la limite de `date_reference` | P3, P6 (P1 en appui) |
| 3 | Nature de chaque amendement vis-à-vis de la mesure : `supprime`, `reduit`, `reporte`, `aggrave`, `autre` ; sert au verdict des objectifs de repli et à l'effet des nouveautés | P3, A4 |
| 4 | Le score du verdict est un rapport de forces : libellé « part des sièges favorables à l'objectif » partout, jamais un pourcentage seul à côté de Favorable ou Défavorable | P3, P5, P8 |
| 5 | Bloc Action : alliés, actionnables, perdus seulement sur un acte personnel lié à la mesure (dit, déposé, voté) ; sinon liste « position inconnue » avec la position du groupe en contexte | P3, A4, P7 |
| 6 | Distinguer l'état de la mesure et l'état du texte (`etat.json`, verdict) ; chute de démo : vérifier dans l'open data le rejet de la première partie du budget 2026 le 21 novembre 2025 et le dire après « 208 contre 87 » | P3, X1 |
| 7 | `qa/check.ts` : contrôle croisé, un même fait a la même valeur dans tous les fichiers d'un dossier | P0 |

## Formats : noms de champs fixés maintenant (P0 les ajoute aux schémas, en optionnels)

Tout le monde code tout de suite contre ces noms ; P0 les ajoute dans `contracts/` en premier (cible 14 h 25), optionnels pour ne rien casser.

- `texte.json`, chaque amendement :
  - `auteur_type`: `"depute" | "gouvernement" | "commission"` ;
  - `auteur_libelle`: chaîne affichée (« Gouvernement », « Commission des finances », ou le nom du député) ;
  - `auteur_id` vaut `"GOUVERNEMENT"` ou l'identifiant de l'organe de la commission quand l'auteur n'est pas un député ;
  - `nature`: `"supprime" | "reduit" | "reporte" | "aggrave" | "autre"` ;
  - `nature_mode`: `"regle" | "llm" | "defaut"`.
- `groupes-action.json` et `action.json` : nouvelle liste `position_inconnue`: `[{depute_id, groupe_id, position_groupe, preuve}]`. `allies`, `actionnables`, `perdus` n'acceptent plus qu'un député avec `fondement` non vide (acte personnel lié à la mesure).
- `etat.json` : nouveau bloc `texte_etat`: `{statut: "en_discussion" | "adopte" | "rejete" | "retire", libelle, date, url, preuve}`, distinct de `mesure` (qui garde `dans_le_texte`, `redaction_actuelle`, `modifications`).
- `verdict.json`, chaque verdict : `score_libelle`: `"part des sièges favorables à l'objectif"` (le `score` ne change pas de sens).

## Par machine et par session

### MacBook Pro Ilan

**P0 (chef d'orchestre)**
1. D'abord (cible 14 h 25) : ajouter les champs ci-dessus aux schémas zod, en optionnels, et régénérer les fixtures concernées.
2. Complément 7 : dans `qa/check.ts`, contrôle croisé par dossier. Au minimum : sort et nature d'un amendement identiques dans `texte.json`, `nouveautes.json`, `fiches/`, `amendements/` ; situation et score d'un objectif identiques dans `verdict.json`, `note.json` et `action.json` ; groupe d'un député identique partout ; `dans_le_texte` et statut du texte identiques entre `etat.json`, `verdict.json` et `note.json`. Message d'erreur : fichier A, fichier B, champ, deux valeurs.

**P1 (collecte)**, en appui du complément 2 : si les amendements du gouvernement et de la commission du texte petits colis (PRJLANR5L17B1906, dont le compromis du gouvernement sur l'article 22) ne sont pas dans `data/raw/petits-colis/amendements.json`, les collecter (open data d'abord, API ensuite) et prévenir P3 dans `status/P1.md`.

**P3 (état, pivots, verdict)** : compléments 2, 3, 4, 5, 6.
- 2 : inclure dans `texte.json` les amendements dont l'auteur est le gouvernement ou une commission (`auteur_type`, `auteur_libelle`), datés, filtrés par `date_reference` (déposé après = absent, sort postérieur = `en_attente`). Le compromis du gouvernement sur les petits colis doit apparaître dès sa date de dépôt.
- 3 : `nature` pour chaque amendement. Règle d'abord : dispositif « Supprimer cet article » (ou « supprimer l'alinéa » qui porte la mesure) = `supprime`, `nature_mode: "regle"`. Le reste par `appelStructure` (P8) avec contrôle ; en cas de doute ou de refus du contrôle, `autre`, `nature_mode: "defaut"`. S'en servir pour le verdict des objectifs de repli (réduire = amendements `reduit`, repousser = `reporte`, `aggrave` compte contre le client).
- 4 : `score_libelle` sur chaque verdict ; la lecture rédigée ne dit jamais « X % » seul, elle dit « X % des sièges favorables à l'objectif ».
- 5 : `groupes-action.json` : un député n'entre dans alliés, actionnables ou perdus que sur un acte personnel lié à la mesure (a dit, a déposé, a voté sur la mesure) ; sinon `position_inconnue`, avec `position_groupe` en contexte.
- 6 : `texte_etat` dans `etat.json` (petits colis : première partie du budget 2026 rejetée le 21 novembre 2025, à vérifier dans `Scrutins.json` ; holdings : PLF 2027 première partie rejetée le 4 novembre 2026, V9759). Le verdict cite les deux états séparément quand ils diffèrent.

**P5 (blocs Verdict et Suite)**, complément 4 : afficher le score avec son libellé (« 18 % des sièges favorables à l'objectif »), jamais un pourcentage seul à côté de Favorable ou Défavorable. Lire `score_libelle` s'il est présent, sinon ce texte en dur. Afficher l'état du texte (`texte_etat`) à côté de l'état de la mesure dans l'en-tête du verdict, quand il existe.

**P6 (Nouveautés, Base)**, complément 2 : la table des amendements de la page Base montre les amendements du gouvernement et de la commission, avec `auteur_libelle` dans la colonne auteur (pas de groupe), et la colonne `nature` (supprime, réduit, reporte, aggrave, autre). Filtre « Gouvernement et commission ». Sur l'état : afficher `texte_etat` à part de l'état de la mesure.

**P7 (Action, Député, Compte rendu)**, compléments 1 et 5.
- 1 : page Député, auditions : rôle rapporteur = « a entendu <organisation> » ; rôle membre = section séparée « Entendues par les rapporteurs de sa commission », en style secondaire, après. Le mot « auditionné » n'apparaît nulle part (grep sur `web/src`).
- 5 : bloc Action : quatrième liste « Position inconnue » (nom, groupe, « position de son groupe : … » en contexte), après alliés, actionnables, perdus. Rien dans les trois premières sans fondement.

**P8 (rédaction)**, complément 4 : le compte rendu et ses garde-fous : tout pourcentage du verdict s'écrit « X % des sièges favorables à l'objectif » ; ajouter « probabilité », « chances » et un pourcentage seul suivi de favorable ou défavorable aux formulations interdites ; régénérer les deux `note.json` après les commits de P3.

### MacBook Air Ilan

**A1 (auditions)**, complément 1 : dans `auditions/<PA>.json`, `role` exact par audition (`rapporteur` seulement si le député est rapporteur du rapport ; sinon `membre`). Aucun libellé « a auditionné ».

**A4 (fiches, nouveautés, action)**, compléments 1, 3, 5.
- 1 : synthèses des fiches (prompt X3 et gabarits) : rapporteur = « a entendu » ; membre = « entendues par les rapporteurs de sa commission », dans une phrase séparée et après ; jamais « a auditionné ».
- 3 : `nouveautes.json` : l'`effet` d'un dépôt ou d'un sort d'amendement se déduit de sa `nature` (dans `texte.json`) et de l'objectif du client : `supprime` = renforce si le client veut empêcher la mesure ; `reduit` renforce l'objectif « réduire » ; `reporte` renforce « repousser » ; `aggrave` affaiblit ; `autre` = neutre.
- 5 : `action.json` : recopier `position_inconnue` de `groupes-action.json` ; ne jamais remonter un député sans fondement dans alliés, actionnables ou perdus.

**A4, relance demandée à 14 h 55** : `bun run check` échoue sur le contrôle croisé : les `fiches/<PA>.json` de petits-colis (PA721110, PA721336, PA718838, PA720976…) ont des auditions et une couverture qui diffèrent de `auditions/<PA>.json` (A1 a relancé). Régénère les fiches des deux dossiers sur les auditions actuelles, `bun run check` vert, commit, push.

**A2, A3** : rien de nouveau. A2 : `data/plf2027-holdings/arguments.json` manque toujours (seule erreur de `bun run check` à 14 h 03).

### MacBook Pro Axel

**X1 (démo)**, complément 6 : chute petits colis : « 208 contre 87 », puis, après vérification dans l'open data (scrutin de la première partie du budget 2026, 21 novembre 2025, P3 confirme le numéro dans `status/P3.md`), « et la première partie du budget a été rejetée le 21 novembre ». Dans le script, ne plus annoncer de prédictions Orcet sur le dossier holdings : elles ont été retirées à 14 h 03 (hors sujet, voir `status/P2.md` et `status/P3.md`).

**X3 (prompts)**, compléments 1 et 4 : prompts synthèse et lecture du verdict : « a entendu » / « entendues par les rapporteurs de sa commission », jamais « a auditionné » ; score toujours dit « part des sièges favorables à l'objectif ».

**X2** : rien de nouveau.

## Décision de 14 h 57 : date de référence petits colis = matin du 19 novembre 2025

Arbitré par Ilan. Le compromis du gouvernement (I-4086, article 22) est déposé le 19 novembre 2025, jour du vote. Avec la date au 18 il est invisible ; au 19 « plein », le vote 208 contre 87 entre et la chute de la démo est dévoilée. On retient le **matin du 19**.

Règle, valable pour tous les producteurs (`date_reference` est lue comme le matin de ce jour) :
- connu : tout ce qui est **déposé, publié ou annoncé au plus tard ce jour-là** (amendements déposés le 19 inclus) ;
- pas connu : tout **sort, scrutin, séance ou décision daté de ce jour-là ou après** (sort = `en_attente`, scrutin absent, intervention en séance du 19 absente).

À faire :
- **P0** : `data/config.json`, petits-colis `date_reference: "2025-11-19"` ; adapter la règle de date de `qa/check.ts` (dépôt ≤ date, sort/scrutin/séance < date).
- **P3** : appliquer la règle dans `pipeline/pivots/` (dépôts ≤, sorts et scrutins <), relancer `bun run pivots` après le commit de P0. I-4086 doit apparaître, auteur « Gouvernement », sort `en_attente`.
- **P2** (suite), **A2** (débats, arguments), **A3** (amendements), **A4** (nouveautés, fiches, action) : même règle, relance après le commit de P0. Aucun élément du 19 qui soit un vote ou une intervention en séance.
- **P8** : régénérer les deux `note.json` après P3.
- **X1** : le script garde « ce qui coince : le compromis du gouvernement » ; la chute reste « 208 contre 87 » puis le rejet de la première partie le 21 novembre.

## 15 h 05 : relance A4 après la date au matin du 19

P3 a recalculé petits colis au matin du 19 (88b178f). `bun run check` ne bloque plus que sur `data/petits-colis/fiches/index.json` : PA842029 et PA608416 y sont listés mais ne sont plus dans `pivots.json` ni `groupes-action.json`. **A4** : `git pull`, régénère fiches, `index.json`, `nouveautes.json` et `action.json` des deux dossiers sur les fichiers actuels de P3, `bun run check` vert, commit, push.

## 15 h 15 : relance A4 (index des fiches)

P3 a relancé le verdict (6486a95, cause de l'objectif 1 de petits colis = dépôt du compromis I-4086). Sa relance précédente (5b49763) a sorti PA942 des alliés de petits colis après la mise à jour des arguments par A2 ; `data/petits-colis/fiches/index.json` le liste encore, `bun run check` est rouge. **A4** : `git pull`, `bun run fiches` sur les deux dossiers, `bun run check` vert, commit, push.
