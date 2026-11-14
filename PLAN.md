<!-- /autoplan restore point: /Users/ilansainte-agathe/.gstack/projects/aaxxeell09-Legiscope/main-autoplan-restore-20261114-122731.md -->
# Plan Bascule : construire en une après-midi, à trois machines

Version 2, 14 novembre 2026, 12 h 35. Version 1 écrite à 12 h 25 puis passée en revue (stratégie, design, ingénierie, voir le rapport en fin de fichier). Démo à 18 h.

## 0. Ce qui est demandé, ce qui ne l'est pas

Demandé : un plan exécutable qui répartit le travail sur trois machines (MacBook Pro Ilan, jusqu'à 10 sessions ; MacBook Air Ilan, 5 ; MacBook Pro Axel, 5), fixe les formats JSON avant tout lancement pour que les sessions ne se bloquent jamais, et aboutit à une démo des quatre vues à 18 h.

Pas demandé : coder avant validation de ce plan, trancher le nom, parler prix, décider du produit réel après le hackathon.

## 1. Ce qu'on livre à 18 h

Un site statique servi en local, quatre vues lues depuis des fichiers JSON, sur **deux dossiers** :

- **Dossier « aujourd'hui »** : un sujet du budget 2027 (PLF, projet de loi n° 3210), amendements en attente, prédictions Orcet.
- **Dossier « passé »** : la taxe petits colis du budget 2026, vote nominatif connu (208 contre 87), fiche HATVP d'Alibaba, débats et amendements complets. Il sert à montrer la chaîne entière sans dépendre d'une prédiction, et à reculer dans le temps.

Les quatre vues :

1. **Texte** : position dominante de chaque groupe, amendements avec le sort prédit par Orcet au centre, les pivots (députés les moins prévisibles des groupes divisés) à droite, cliquables.
2. **Fiche d'approche** : synthèse en tête (position probable, argument à présenter, badge vérifié), puis trois colonnes : auditions menées (organisations entendues), interventions en séance et commission (citation et lien), amendements déposés ou cosignés avec la mention « travaillé avec » ; un quatrième bloc « organisations inscrites à la HATVP ayant déclaré une action sur ce texte ». Couverture chiffrée en pied.
3. **Cohésion** : courbe d'accord entre 1 à 3 paires de groupes, mois par mois depuis juillet 2024, censures en traits verticaux, curseur temporel avec trois positions préréglées.
4. **Note** : 150 mots d'analyste, chaque nombre vérifié souligné, sources numérotées, bouton Copier.

Chaque écran porte sa source, sa date de génération et ses limites. Aucun chiffre non sourcé ne passe.

## 2. Décisions

### Prises dans ce plan (révisables à la porte de validation)

| # | Décision | Choix | Pourquoi |
|---|---|---|---|
| D1 | Version minimale ou complète | **Complète, quatre vues** | Seize sessions disponibles. La fiche d'approche est le croisement de sources que le jury dit chercher ; les trois autres vues existent déjà chez Atlas, on les garde comme contexte, pas comme argument. |
| D2 | Sujet « aujourd'hui » | **Le sujet du PLF 2027 qui a le plus de données** (décision d'Ilan à 12 h 40) : amendements, amendements en attente, scrutins publics, rapports et comptes rendus, organisations HATVP. Mesure en cours sur l'open data (facturation électronique, cryptoactifs, petits colis et jusqu'à trois sujets révélés par les données), résultat écrit en annexe B et dans `config.json`. P1 confirme à 12 h 55 qu'Orcet répond sur un amendement en attente du sujet retenu. | On choisit sur des chiffres, pas sur une intuition. Le dossier petits colis reste le dossier « passé » quoi qu'il arrive. |
| D3 | Dossier « passé » | **Taxe petits colis, construit intégralement** (texte, pivots, fiches) | Seul dossier où chaque couche existe à coup sûr. Coût : la même chaîne tourne deux fois, sur une liste de dossiers, ce qui est le prix d'un paramètre. |
| D4 | Nombre de sessions | **16 sessions et une tâche humaine** (détail section 6) | Voir la porte de validation : 20 était la capacité, pas le besoin. Chaque session en moins rend du temps d'attention à Ilan. |

### Tranché par Ilan à la porte de validation (12 h 40)

- Périmètre : quatre vues, deux dossiers. Validé.
- Ordre de la démo : Texte, Fiche, Cohésion, Note. Validé.
- 16 sessions. Validé.
- Sujet : celui qui a le plus de données (D2 ci-dessus).
- Le nom se tranche à 17 h : une chaîne dans `config.json`.

## 3. Architecture

Pas de serveur. Trois couches qui ne se parlent que par des fichiers JSON dont le format est fixé en section 5.

```
Hémicycle API (MCP ou REST) ──┐
                              ├─► pipeline/ (TypeScript, Bun) ──► data/<dossier>/*.json ──► web/ (Vite + React + TS)
Open data AN (rapports, CR) ──┤                                   data/cohesion.json
                              │                                        ▲
Featherless (extraction,      │                                        │
  rédaction) ─────────────────┘         contracts/ (schémas zod + fixtures), seule dépendance entre sessions
```

- `contracts/` : un schéma zod par fichier, une fixture complète et réaliste par fichier, les types TypeScript du front inférés de ces schémas (zéro type manuel). Possédé par P0 seul, figé à 12 h 50. Les fixtures sont le jeu de repli de la démo : `config.json` porte `"dataset": "live" | "fixtures"`, le front charge l'un ou l'autre, personne ne copie jamais de fichiers dans `data/`.
- `data/` : `cohesion.json`, `groupes.json`, `deputes.json`, `config.json`, et un dossier par dossier législatif (`data/plf2027-facturation/`, `data/petits-colis/`) contenant `texte.json`, `pivots.json`, `auditions/<PA>.json`, `debats/<PA>.json`, `amendements/<PA>.json`, `hatvp.json`, `fiches/<PA>.json`, `fiches/index.json`, `note.json`. `data/raw/` contient les réponses brutes de l'API, un fichier par scrutin, régénérées par P1 seul.
- `pipeline/` : un sous-dossier par session, un `run.ts`, qui lit `config.json` pour connaître les dossiers et sujets, et itère sur la liste de pivots reçue. Scripts rejouables, jamais de travail à la main.
- `web/` : Vite, React, TypeScript, react-router, Recharts. `vite.config.ts` sert `../data` via `publicDir`, pas de lien symbolique. P4 livre avant 13 h 30 : `tokens.css`, `Meta`, `GroupeTag`, `Proba`, `Panel`, `Table`, `useData<T>()` avec statut `loading | ok | error`, et `App.tsx` avec les cinq routes pointant sur des composants vides déjà créés dans chaque dossier de vue.
- `status/<session>.md` : fait, en cours, bloqué, dépendance demandée. P0 ne lit que ce dossier.
- `prompts/<session>.md` : le prompt de lancement, versionné.

Règles tenues par construction :
- le modèle de langage ne voit jamais un vote : il reçoit des chiffres et des citations, et `pipeline/lib/verif.ts` rejette tout nombre absent de la liste autorisée (règle en section 5.12), trois tentatives à température 0,2 puis gabarit, avec `mode: "gabarit"` écrit dans le fichier ;
- une seule session (P1) appelle l'API Hémicycle, mesure le coût réel d'un appel de chaque type à 12 h 55 avant toute collecte en volume, tient un compteur dans `status/P1.md` ;
- uniquement des élus dans l'exercice de leur mandat ; non-inscrits exclus des agrégats ;
- chaque prédiction est une probabilité datée.

## 4. Git : seize sessions sur une branche sans conflit

- Tout le monde sur `main`. Chaque session ne touche que les chemins qu'elle possède. Deux sessions ne possèdent jamais le même chemin.
- P0 possède la racine : `package.json`, `bun.lock`, `tsconfig.json`, `.gitignore`, `vite.config.ts`, `web/src/App.tsx`. Toutes les dépendances sont installées à 12 h 50 (zod, openai, recharts, react-router-dom, cheerio, fast-xml-parser). **Interdiction de `bun add`** : besoin d'une dépendance, l'écrire dans `status/`, P0 l'ajoute en moins de 5 minutes.
- Cycle de chaque session : `git pull --rebase && git add <ses chemins> && git commit -m "<session>: ..." && git push`, à chaque livrable et au moins toutes les 20 minutes. Conflit : la session ne résout jamais elle-même, elle écrit dans `status/` et P0 arbitre.
- Pas de `git add -A`. Pas de force push. Pas de branche avant le gel de 16 h 30 ; après, seul P0 fusionne.
- Chaque machine clone dans `~/Legiscope`, `bun install`, puis ouvre chaque session Claude Code dans ce dossier avec `prompts/<session>.md` comme premier message.

## 5. Formats JSON (figés à 12 h 55)

Chaque fichier porte un bloc `meta` :

```json
"meta": {
  "generated_at": "2026-11-14T14:02:11+01:00",
  "sources": [{"label": "Hémicycle API scrutins", "url": "https://api.hemicycle.ai/v1/..."}],
  "limits": "Scrutins publics uniquement.",
  "producer": "pipeline/cohesion",
  "dossier_id": "plf2027-facturation"
}
```

Conventions : identifiants des assemblées en chaînes libres (`PA...`, `PO...`, `VTANR5L17V...`, `PRJLANR5L17B3210`), le schéma impose `string`, pas un motif, car Hémicycle peut renvoyer les siens. Dates ISO 8601. Probabilités entre 0 et 1. `dossier_id` et `sujet` ne sont écrits qu'une fois, dans `config.json` : chaque pipeline les lit, le front refuse un fichier dont `meta.dossier_id` diffère du dossier demandé.

Un seul vocabulaire pour les sorts et les votes, partout :
- `sort` ∈ `en_attente | adopte | rejete | retire | tombe | non_examine`
- `vote` ∈ `pour | contre | abstention | non_votant`
- `position` ∈ `pour | contre | abstention | divise | null` (null = pas de position majoritaire)
- `role_audition` ∈ `rapporteur | rapporteur_general | rapporteur_avis | president | membre`
- `lieu` ∈ `seance | commission`
- `type_organisation` ∈ `entreprise | federation | cabinet | association | administration | syndicat | autre`
- `mode` (texte rédigé) ∈ `llm | gabarit`

### 5.1 `data/config.json`
```json
{"produit": {"nom": "Bascule", "accroche": "Bascule vous dit quel vote peut basculer, et grâce à qui."},
 "dataset": "live",
 "dossiers": [
   {"id": "plf2027-facturation", "label": "PLF 2027, facturation électronique", "texte_id": "PRJLANR5L17B3210",
    "etat": "en_cours", "sujet": {"label": "Facturation électronique", "mots_cles": ["facturation électronique", "facture électronique", "e-invoicing"]},
    "pivot_demo": null},
   {"id": "petits-colis", "label": "PLF 2026, taxe petits colis", "texte_id": "PRJLANR5L17B...",
    "etat": "clos", "sujet": {"label": "Taxe sur les petits colis", "mots_cles": ["petits colis", "colis", "franchise douanière"]},
    "pivot_demo": "PA..."}
 ],
 "dossier_demo": "plf2027-facturation",
 "cohesion": {"paires_demo": [["PO845401", "PO800490"]], "curseur_presets": [
   {"label": "Avant la censure Barnier", "date": "2024-11-15"},
   {"label": "Avant la censure Bayrou", "date": "2025-08-25"},
   {"label": "Aujourd'hui", "date": "2026-11-14"}]}}
```
`pivot_demo` est rempli par X1 à 15 h avec la fiche la plus riche. Les dates des préréglages sont vérifiées par P2.

### 5.2 `data/groupes.json`
```json
{"meta": {...}, "groupes": [
  {"id": "PO845401", "sigle": "RN", "nom": "Rassemblement National", "couleur": "#0D378A", "effectif": 123}
]}
```

### 5.3 `data/deputes.json`
```json
{"meta": {...}, "deputes": [
  {"id": "PA720892", "nom": "Dupont", "prenom": "Marie", "groupe_id": "PO845401", "departement": "75", "circonscription": 3, "commissions": ["PO59048"]}
]}
```
`groupe_id` nullable (non-inscrits). Instantané du jour.

### 5.4 `data/cohesion.json`
```json
{"meta": {...},
 "periode": {"from": "2024-07", "to": "2026-11"},
 "pairs": [
   {"a": "PO845401", "b": "PO800490", "series": [
     {"month": "2024-07", "accord": 0.63, "n_scrutins": 41},
     {"month": "2024-08", "accord": null, "n_scrutins": 0}
   ]}
 ],
 "events": [
   {"date": "2024-12-04", "type": "censure", "label": "Censure du gouvernement Barnier", "url": "https://..."},
   {"date": "2025-11-20", "type": "vote", "label": "Taxe petits colis adoptée 208 contre 87", "url": "https://...", "dossier_id": "petits-colis"}
 ],
 "signals": [
   {"date": "2024-11-30", "pair": ["PO845401", "PO800490"], "drop": -0.21, "label": "Décrochage RN et bloc central, avant la censure Barnier", "suivi_de_censure": true}
 ]}
```
`accord` = part des scrutins du mois où les deux groupes ont une position majoritaire non nulle et identique ; `n_scrutins` est ce dénominateur ; `accord` est `null` si `n_scrutins` vaut 0. `events.type` ∈ `censure | 49-3 | dissolution | nomination | vote`. Les dates sont au jour, le front place les marqueurs au jour. P2 livre à 13 h 15 le nombre de décrochages de plus de 0,15 suivis et non suivis d'une censure.

### 5.5 `data/<dossier>/texte.json`
```json
{"meta": {...},
 "texte": {"id": "PRJLANR5L17B3210", "titre": "Projet de loi de finances pour 2027", "etape": "Première lecture, Assemblée nationale, séance publique", "url": "https://..."},
 "positions": [
   {"groupe_id": "PO845401", "position": "contre", "confiance": 0.8, "base": "3 scrutins liés, 12 amendements", "n_scrutins_sujet": 3}
 ],
 "amendements": [
   {"id": "AMANR5L17PO59048B3210P1D1N003426", "numero": "3426", "url": "https://...",
    "auteur_id": "PA720892", "cosignataires_ids": ["PA..."], "groupe_id": "PO845401",
    "resume": "Dispense les microentreprises et PME de l'obligation.",
    "sort": "en_attente",
    "prediction": {"proba_pour": 0.23, "confiance": 0.71, "modele": "orcet-v2", "date": "2026-11-14"}}
 ]}
```
`prediction` nullable (Orcet répond 404 sans facturer quand il n'a pas de prédiction ; affiché « Orcet : pas de prédiction », trié en bas, exclu des comptes de la note). `proba_pour` est la **moyenne des probabilités individuelles de voter pour**, pas une probabilité d'adoption : l'écran dit « 23 % de votes pour prédits », jamais « 23 % de chances d'adoption ». Le front dérive le sort probable : `proba_pour` > 0,5 = « adoption probable », sinon « rejet probable ». `n_scrutins_sujet` à 0 pour tous les groupes signifie que les positions viennent des amendements seuls, et l'écran le dit.

### 5.6 `data/<dossier>/pivots.json`
```json
{"meta": {...}, "deputes": [
   {"id": "PA720892", "groupe_id": "PO845401", "rang": 1, "score_imprevisibilite": 0.34, "loyaute_12m": 0.66,
    "base": "sujet",
    "ecarts": [
      {"scrutin_id": "VTANR5L17V1234", "date": "2026-10-21", "titre": "Amendement n° 12 au PLF 2027", "vote": "pour", "position_groupe": "contre", "groupe_id_au_vote": "PO845401", "url": "https://..."}
    ]}
 ]}
```
Entre 5 et 15 députés, triés par `rang`. `base` ∈ `sujet | general` : `sujet` quand il existe des scrutins nominatifs liés au sujet, `general` sinon (loyauté sur 12 mois), et l'écran l'affiche. `position_groupe` nullable. P3 publie une liste provisoire (`base: general`) à 13 h 30 pour que A1 à A3 tournent sur de vrais identifiants.

### 5.7 `data/<dossier>/auditions/<PA>.json` (produit par A1)
```json
{"meta": {...}, "depute_id": "PA720892",
 "auditions": [
   {"texte_id": "PRJLANR5L17B3210", "rapport_url": "https://...", "date": "2026-10-15", "role": "rapporteur_general",
    "organisations": [{"nom": "Fédération du e-commerce et de la vente à distance", "type": "federation", "hatvp_id": "812604106"}]}
 ],
 "couverture": {"rapports_total": 4, "rapports_avec_liste": 2}}
```
`hatvp_id` et `rapport_url` nullables. Les rapports de la commission des finances sur le PLF sont rattachés à chaque pivot membre de la commission, pas seulement aux rapporteurs.

### 5.8 `data/<dossier>/debats/<PA>.json` (produit par A2)
```json
{"meta": {...}, "depute_id": "PA720892",
 "debats": [
   {"date": "2026-11-03", "lieu": "seance", "texte_id": "PRJLANR5L17B3210",
    "citation": "Nous ne pouvons pas imposer cette charge aux plus petites entreprises.", "url": "https://..."}
 ],
 "couverture": {"comptes_rendus_lus": 9}}
```
Uniquement les interventions portant un identifiant d'orateur `PA...`.

### 5.9 `data/<dossier>/amendements/<PA>.json` (produit par A3)
```json
{"meta": {...}, "depute_id": "PA720892",
 "amendements": [
   {"id": "AMANR5L17...", "texte_id": "PRJLANR5L17B3210", "role": "cosignataire", "resume": "...", "sort": "adopte",
    "travaille_avec": ["CPME"], "url": "https://..."}
 ]}
```
`role` ∈ `auteur | cosignataire`.

### 5.10 `data/<dossier>/hatvp.json` (produit par P1)
```json
{"meta": {...}, "organisations": [
   {"hatvp_id": "812604106", "nom": "Alibaba France", "type": "entreprise", "fiche_url": "https://...", "objet": "Taxe sur les petits colis, PLF 2026", "actions": ["rencontre", "transmission d'expertise"]}
 ]}
```

### 5.11 `data/<dossier>/fiches/<PA>.json` et `fiches/index.json` (produits par A4)
La fiche est la fusion pure des trois fichiers précédents (mêmes blocs, mêmes champs) plus :
```json
"hatvp": [ ...organisations de hatvp.json... ],
"synthese": {
   "position_probable": "Favorable à la dispense pour les PME, hostile à tout report général.",
   "argument": "Présenter le coût de mise en conformité pour les entreprises de moins de 10 salariés de sa circonscription.",
   "chiffres_utilises": ["10"], "mode": "llm", "modele": "Qwen3-...", "verifie": true, "date": "2026-11-14"
},
"couverture": {"rapports_total": 4, "rapports_avec_liste": 2, "comptes_rendus_lus": 9}
```
`synthese` nullable tant qu'elle n'est pas produite. `fiches/index.json` liste les `PA` disponibles ; le front grise un pivot sans fiche et ne plante jamais sur une fiche absente.

### 5.12 `data/<dossier>/note.json` (produit par P8)
```json
{"meta": {...}, "texte": "150 mots...", "chiffres_utilises": ["0.71", "15", "3"],
 "sources": [{"label": "...", "url": "..."}], "limites": "Prédictions Orcet du 14 novembre.",
 "mode": "llm", "modele": "Qwen3-...", "verifie": true}
```

### 5.13 Règle du vérificateur de chiffres (`pipeline/lib/verif.ts`, P8)
1. Normaliser : espaces fines et insécables supprimés dans les nombres (« 1 200 » devient 1200), virgule décimale en point.
2. Extraire `\d+(\.\d+)?` et les ordinaux `\d+(er|e|ème)`, comparés sur la partie numérique.
3. Liste autorisée construite automatiquement depuis l'entrée JSON : tout nombre présent (numéros, effectifs, années des identifiants), chaque probabilité `p` sous trois formes (`0.71`, `71`, `71 %`), chaque date ISO éclatée en jour, mois, année ; les années 2024 à 2027 toujours permises.
4. Nombres en lettres : le prompt impose les chiffres ; tout mot de `deux … vingt, trente … cent, mille, million, milliard` est rejeté sauf s'il correspond à une valeur autorisée (`un`, `une` tolérés).
5. Tout jeton hors liste = rejet, le jeton fautif est écrit dans `status/`.
Tests obligatoires : nombre absent, « 71 % » d'une proba, date, année, ordinal, « trois », « n° 3426 », espace fine.

## 6. Répartition par machine et par session

Seize sessions et une tâche humaine. Chaque ligne : ce qu'elle possède, ce qu'elle lit, ce qu'elle livre, le critère de fini.

### MacBook Pro Ilan, 9 sessions : données et front

| Session | Possède | Lit | Livre | Fini quand |
|---|---|---|---|---|
| **P0 Chef d'orchestre** (cette session) | racine du dépôt, `contracts/`, `prompts/`, `data/config.json`, `qa/` | `status/*` | Schémas, fixtures, dépendances, `App.tsx` et routes, 5 tests (`bun run check`), prompts ; go/no-go de 13 h 15 ; captures de secours à 16 h 30 ; fusion | La démo tourne à 17 h sur données réelles, tests verts |
| **P1 Collecte Hémicycle** (seule session qui appelle l'API) | `pipeline/collecte/`, `data/raw/`, `data/groupes.json`, `data/deputes.json`, `data/*/hatvp.json` | `contracts/`, `config.json`, annexe A | REST avec une clé `hmc_live_` (une clé `hmc_test_` ne coûte rien mais 100 requêtes par jour : pour découvrir les schémas seulement). Pages de 100 maximum, chaque page facturée, en-têtes `X-Credits-Cost` et `X-Credits-Remaining` lus à chaque appel. 12 h 55 : un appel de chaque type (dont `POST /orcet/predictions` sur un amendement en attente de la facturation électronique, et le coût réel d'un `GET /scrutins/{id}/votes` complet) publié dans `status/P1.md`. Puis : groupes, députés, scrutins et votes nominatifs depuis juillet 2024 (un fichier par scrutin), accord entre groupes, loyauté, texte 3210 et amendements du sujet, prédictions Orcet, texte et scrutins des petits colis, fiches HATVP des deux dossiers | Fichiers bruts validés, compteur de crédits à jour |
| **P2 Cohésion** | `pipeline/cohesion/`, `data/cohesion.json` | `data/raw/` | `cohesion.json`, et à 13 h 15 : « la courbe décroche-t-elle avant les censures ? » avec le nombre de décrochages > 0,15 suivis et non suivis d'une censure ; dates des préréglages vérifiées | Fichier valide, signaux listés, réponse écrite |
| **P3 Texte et pivots** | `pipeline/pivots/`, `data/*/texte.json`, `data/*/pivots.json` | `data/raw/`, `config.json` | 13 h 30 : pivots provisoires (`base: general`) pour les deux dossiers ; 14 h 30 : `texte.json` et `pivots.json` définitifs, nombre de scrutins nominatifs liés au sujet publié | Deux dossiers, 5 à 15 pivots chacun |
| **P4 Front socle** | `web/` sauf `web/src/views/` | `contracts/` | 13 h 30 : `tokens.css` (fond sombre, contraste 7:1, police mono, 16 px minimum, traits 3 px), `Meta`, `GroupeTag`, `Proba` (« 71 % », seuils de couleur), `Panel`, `Table`, `useData`, barre haute (nom, quatre onglets, sélecteur de dossier), formats (dates « 3 nov. 2026 », « Marie Dupont ») | Les cinq routes s'ouvrent sur les fixtures, zéro erreur console |
| **P5 Vue Cohésion** | `web/src/views/cohesion/` | fixtures | Gauche 75 % : courbe Recharts, x mois, y 0 à 100 %, 1 à 3 paires par puces, trait vertical rouge et libellé par censure, pointillé au curseur ; dessous : trois boutons préréglés et curseur ; droite 25 % : panneau « À cette date » avec les signaux antérieurs au curseur, décrochage en gros chiffre, lien vers Texte quand le curseur est sur aujourd'hui ; « Aucun signal à cette date » sinon | Conforme à cette description sur fixtures puis données réelles |
| **P6 Vue Texte** | `web/src/views/texte/` | fixtures | En-tête : titre, étape, sujet, état du dossier ; gauche 30 % positions (sigle coloré, position, barre de confiance, base ; `divise` en orange) ; centre 40 % amendements triés par probabilité décroissante (numéro, résumé, auteur et groupe, sort, probabilité en gros ou « pas de prédiction » en bas) ; droite 30 % pivots (rang, nom, groupe, score, base, dernier écart), ligne cliquable vers `/fiche/:dossier/:id`, grisée sans fiche | Clic sur un pivot ouvre sa fiche |
| **P7 Vues Fiche et Note** | `web/src/views/fiche/`, `web/src/views/note/` | fixtures | Fiche : en-tête (nom, groupe, circonscription, score, retour), bandeau synthèse (position, argument, badge vérifié ou « gabarit », modèle, date), trois colonnes auditions, débats, amendements, bloc HATVP, pied couverture ; chaque bloc vide affiche sa couverture (« 0 audition, 4 rapports lus »). Note : colonne 60 % texte avec nombres vérifiés soulignés, droite sources numérotées puis limites, bouton Copier (texte et sources), badge vérifié | Chaque citation a un lien qui s'ouvre, fiche absente = message, pas d'écran blanc |
| **P8 Rédaction et vérificateur** | `pipeline/lib/llm.ts`, `pipeline/lib/verif.ts`, `pipeline/note/`, `data/*/note.json` | `texte.json`, `pivots.json`, `cohesion.json`, prompts de X3 | 13 h 15 : client Featherless (`https://api.featherless.ai/v1`, modèle `Qwen/Qwen3.8-27B`, sortie structurée par `tools` avec schéma strict puisque seul le tool calling est documenté natif, thinking désactivé, 2 unités de concurrence par appel) et vérificateur avec ses 8 tests ; 15 h 30 : une note par dossier | Les notes passent le vérificateur, un test montre un rejet |

### MacBook Air Ilan, 4 sessions : open data brut

| Session | Possède | Lit | Livre | Fini quand |
|---|---|---|---|---|
| **A1 Auditions** | `pipeline/auditions/`, `data/*/auditions/` | `contracts/`, `pivots.json` (provisoire à 13 h 30) | Script rejouable sur la liste des pivots. Source : l'API Hémicycle n'expose pas les rapports ; le dump `Dossiers_Legislatifs.json.zip` (11 Mo, métadonnées : rapporteurs, numéros, URL) donne la liste des rapports de la commission des finances sur le texte, le HTML de chaque rapport sur assemblee-nationale.fr donne l'annexe « personnes entendues », extraite via Featherless (`Qwen/Qwen3.8-27B`, tool calling, thinking désactivé). Un fichier par pivot avec couverture ; 13 h 30 : nombre de pivots ayant au moins un rapport | Un fichier par pivot et par dossier |
| **A2 Débats** | `pipeline/debats/`, `data/*/debats/` | idem | Séance : le fichier unique `syseron.xml.zip` (62 Mo, tous les comptes rendus de la législature), filtré par mots-clés du sujet avant lecture, interventions des pivots avec `acteurRef`. Commission : pas d'export en masse, les comptes rendus de la commission des finances sur le PLF sont lus en HTML sur assemblee-nationale.fr. Citation exacte et lien | Un fichier par pivot, chaque citation a une URL |
| **A3 Amendements par député** | `pipeline/amendements/`, `data/*/amendements/` | idem, `data/raw/` | Amendements du sujet déposés ou cosignés, sort, mention « travaillé avec » extraite de l'exposé des motifs | Un fichier par pivot |
| **A4 Assemblage fiches** | `pipeline/fiches/`, `data/*/fiches/` | les trois précédents, `hatvp.json`, `pipeline/lib/llm.ts`, prompts de X3 | Dès 13 h sur fixtures : fusion, synthèse via les prompts de X3, vérificateur, `index.json`. À 15 h : la fiche `pivot_demo` de chaque dossier en premier, puis les autres | Fiches valides, synthèses passées au vérificateur ou en `mode: gabarit` |

### MacBook Pro Axel, 3 sessions et Axel en personne

| Session | Possède | Lit | Livre | Fini quand |
|---|---|---|---|---|
| **X1 Script, pitch, jury** | `demo/` | `PLAN.md`, l'app | Séquence en quatre temps, trois minutes chronométrées, phrases exactes, ce qu'on clique ; choisit `pivot_demo` à 15 h sur données réelles ; joue le jury (clarté, source visible, crédibilité, objections et réponses) ; deux répétitions chronométrées. Positionnement : « ce que l'API ne structure pas encore, on l'extrait de l'open data et on vous le rend », jamais une affirmation sur ce qu'Atlas ne fait pas | Deux répétitions notées à 17 h et 17 h 30 |
| **X2 README et page Sources** | `README.md`, `web/src/views/sources/` | tout | README publiable ; page « Sources et limites » dans l'app | Un inconnu lance la démo en suivant le README |
| **X3 Prompts et gabarits** | `pipeline/fiches/prompts/`, `pipeline/note/prompts/` | `contracts/`, `pipeline/lib/llm.ts` | Avant 13 h 15 : gabarits de secours (synthèse, argument, note) ; puis prompts de synthèse et d'argument testés sur 3 fiches, prompt de la note | A4 et P8 les utilisent sans retouche |
| **Axel, en personne, avant 12 h 50** | `demo/terrain.md` | rien | Question à l'équipe Hémicycle : Atlas extrait-il les auditions des rapports ? Orcet prédit-il des amendements sans scrutin ? Crédits supplémentaires obtenus. Grille du jury telle qu'annoncée. Disponibilité des noms | Réponses écrites avant 13 h |

## 7. Horaires

| Heure | Jalon | Qui |
|---|---|---|
| 12 h 50 | `contracts/`, fixtures, dépendances, `App.tsx`, 15 prompts commités. Les trois machines clonent et installent. Axel a posé ses questions. | P0, Axel |
| 12 h 55 | Lancement des 15 sessions. P1 mesure un appel de chaque type, dont Orcet sur un amendement en attente. | Ilan, Axel |
| 13 h 15 | **Go/no-go** : cohésion (P2, décrochages vrais et faux), sujet (P1, Orcet et amendements en attente), coût réel de la collecte (P1), 5 tests en place (P0), gabarits (X3), client et vérificateur (P8) | P0 décide, écrit dans `status/P0.md` |
| 13 h 30 | Pivots provisoires (P3). Primitives du front (P4). Couverture auditions annoncée (A1). | |
| 14 h 00 | Données brutes complètes (P1). | |
| 14 h 30 | `cohesion.json`, `texte.json`, `pivots.json` définitifs, deux dossiers | P2, P3 |
| 15 h 00 | Les quatre vues tournent sur fixtures ; bascule sur `dataset: live` ; `pivot_demo` choisi | P4 à P7, X1 |
| 15 h 30 | Auditions, débats, amendements par pivot ; notes | A1 à A3, P8 |
| 16 h 00 | Fiches `pivot_demo` puis les autres, synthèses vérifiées | A4 |
| 16 h 30 | Gel du code. Tests verts sur `live` et sur `fixtures`. Captures de secours. | P0 |
| 17 h 00 | Répétition 1 | X1 |
| 17 h 30 | Répétition 2, nom tranché | tous |
| 18 h 00 | Démo | Ilan ou Axel |

## 8. La démo

Ordre validé par Ilan :

1. **Texte** sur le dossier d'aujourd'hui : « bloc central divisé sur la facturation électronique, 3 groupes sans position dominante, voici les amendements et leur sort prédit, voici les quinze députés qui peuvent faire basculer le vote ».
2. **Fiche d'approche** du `pivot_demo` : « il a entendu la Fevad et la CPME, il a cosigné le 3426 travaillé avec la CPME, il a dit ceci le 3 novembre, voici l'argument à lui présenter ». Une seule fiche, vérifiée à la main, chaîne complète.
3. **Cohésion** : curseur sur « avant la censure Barnier », l'accord décroche, le gouvernement tombe trois semaines après ; curseur sur aujourd'hui, le panneau pointe vers le texte en cours.
4. **Note** : « cette note part au client », bouton Copier.

L'ordre du cadrage d'Axel (Cohésion d'abord) est écarté : il dépend du décrochage avant censure, qu'on ne connaît qu'à 13 h 15.

Arguments pour le jury : on lui montre ce que son API permet en une journée ; Orcet au centre de l'écran Texte ; une trajectoire dans le temps ; l'IA est vérifiable ; et ce que l'API ne structure pas encore (annexes d'auditions, exposés des motifs, orateurs des comptes rendus), on l'extrait de l'open data.

## 9. Risques et replis

| Risque | Comment on le sait | Repli |
|---|---|---|
| Orcet ne prédit pas des amendements sans scrutin | P1 à 12 h 55, Axel avant 12 h 50 | La vue Texte affiche les positions et les amendements sans probabilité ; la démo s'appuie sur le dossier petits colis et la fiche |
| La courbe ne décroche pas avant les censures, ou autant de faux décrochages | P2 à 13 h 15 | Cohésion passe en troisième position ou devient un encart ; la démo s'ouvre sur Texte et Fiche |
| Zéro scrutin nominatif sur le sujet | P3 à 13 h 30 | Pivots en `base: general`, affiché ; ou changement de sujet vers un article du PLF avec vote nominatif |
| Peu de rapports avec liste d'auditions, pivots jamais rapporteurs | A1 à 13 h 30 | Rapports de la commission des finances rattachés aux membres ; couverture affichée ; la fiche vit sur débats, amendements et HATVP |
| Pagination fine, collecte trop chère | P1 à 12 h 55 | 12 mois de scrutins, 100 scrutins nominatifs ; crédits via Axel |
| Le front n'est pas prêt à 16 h 30 | tests de P0 | Démo sur ce qui passe les tests, le reste en captures |
| Une session meurt | `status/` muet 30 min | Relance avec `prompts/<session>.md` |
| Featherless indisponible | P8 | Gabarits de X3, `mode: gabarit` affiché |
| PLF 2027 n'est plus en première lecture à l'AN | P1 à 12 h 55 | Dossier petits colis seul, vue Texte en mode « clos » |
| Le jury dit « vous avez refait Atlas » | X1 | Positionnement couche au-dessus de l'API, fiche et extraction open data en tête |

## 10. Ce qui n'est pas dans le périmètre

Déploiement en ligne (démo locale, dépôt public à la fin). Comptes, abonnement, prix. Sénat. Alertes temps réel. Presse. Autres sujets que les deux dossiers. Le produit réel après le hackathon : un outil dont trois vues viennent de l'API du concurrent n'est pas une entreprise, la seule valeur défendable est l'extraction de documents non structurés ; cette question se traite lundi, pas aujourd'hui.

## 11. Ce qui n'a pas été vérifié au moment d'écrire

- Le format de réponse réel de `/scrutins/{id}/votes`, `/agregats/accord-groupes`, `/agregats/loyaute-deputes`, `/agregats/positions-groupes` : aucun schéma de réponse dans l'OpenAPI, rien testé avec une clé. P1 à 12 h 55.
- Si le dump `Dossiers_Legislatifs` contient le texte des rapports ou seulement leurs métadonnées (A1 ouvre l'archive à 13 h).
- Si Featherless accepte `chat_template_kwargs` pour désactiver le thinking de `Qwen/Qwen3.8-27B` (P8 à 13 h).
- Orcet sur des amendements sans scrutin (la doc dit « le sort probable d'un amendement », P1 le mesure).
- Le nombre d'amendements en attente par sujet et le nombre de scrutins nominatifs liés.
- L'état d'avancement du PLF 2027 ce samedi.

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
