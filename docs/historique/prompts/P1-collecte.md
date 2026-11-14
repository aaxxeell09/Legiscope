# Session P1 : collecte Hémicycle (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 5, 6 (ligne P1), 9 et l'annexe A.

Tu es la **seule** session qui appelle l'API Hémicycle. Clé dans `.env` (`HEMICYCLE_API_KEY`, préfixe `hmc_live_`). Base `https://api.hemicycle.ai/v1`, en-têtes `Authorization: Bearer` et `Hemicycle-Version: 2026-10-01`. Pages de 100 maximum, chaque page facturée. Lis `X-Credits-Cost` et `X-Credits-Remaining` à chaque réponse et tiens un compteur dans `status/P1.md`. Plafond : si `X-Credits-Remaining` passe sous 150, tu t'arrêtes et tu l'écris.

## Tu possèdes
`pipeline/collecte/`, `data/raw/`, `data/groupes.json`, `data/deputes.json`, `data/<dossier>/hatvp.json`.

## Livrables, dans cet ordre
1. **13 h 20, mesure** (avant toute collecte en volume) : un appel de chaque type et son coût réel écrit dans `status/P1.md` : `GET /scrutins?limit=1`, `GET /scrutins/{id}/votes` sur un scrutin complet (combien de pages, combien de crédits), `POST /agregats/accord-groupes` sur un mois, `POST /agregats/loyaute-deputes` sur un groupe, `GET /amendements?texte=<texte_id du dossier vivant>` et le **nombre d'amendements du sujet** (mots-clés de `config.json`) par sort, `POST /orcet/predictions` sur un amendement en attente de ce sujet (répond-il, avec quelle valeur), et si la réponse d'un amendement contient les **avis du rapporteur et du gouvernement** (écris les noms de champs). Fait connu : la première partie du PLF 2027 a été rejetée par l'Assemblée le 4 novembre 2026 (scrutin VTANR5L17V9759) ; confirme-le avec `GET /scrutins/VTANR5L17V9759` et `GET /textes/PRJLANR5L17B3210`, et note l'étape actuelle du texte. Tout va dans `status/P1.md` avant 13 h 30 : P0 décide à 13 h 35 avec ces chiffres.
2. `data/groupes.json` et `data/deputes.json` (`GET /organes?type=...`, `GET /acteurs`, groupe_id null pour les non-inscrits). Format : section 5.2 et 5.3.
3. `data/raw/scrutins/<id>.json` : tous les scrutins depuis le 1er juillet 2024 avec leurs votes nominatifs, **un fichier par scrutin** (réponse brute de l'API, plus le résultat par groupe). Si le coût mesuré en 1 dépasse 600 crédits pour l'ensemble, réduis à 12 mois puis à 100 scrutins et écris-le.
4. `data/raw/accord-groupes/<YYYY-MM>.json` : `POST /agregats/accord-groupes` par mois depuis juillet 2024. `data/raw/loyaute/<groupe>.json` : loyauté par groupe sur 12 mois.
5. Pour chaque dossier de `config.json` : `data/raw/<dossier>/texte.json`, `data/raw/<dossier>/amendements.json` (tous les amendements du texte filtrés sur les mots-clés du sujet, pages suivantes jusqu'à `has_more: false`), `data/raw/<dossier>/orcet/<amendement>.json` pour chaque amendement en attente (404 = pas de prédiction, non facturé, écris un fichier `{"prediction": null}`), et les scrutins liés au sujet (recherche `GET /recherche?q=<mots-clés>&types=scrutin`).
6. `data/<dossier>/hatvp.json` : `GET /entreprises?q=<mots-clés du sujet>` et lecture des fiches HATVP qui déclarent une activité sur le texte. Format section 5.10. Pour le dossier vivant, vérifie que le client de `config.json` (Afep) a bien une fiche d'activité sur le sujet ; sinon propose dans `status/P1.md` l'organisation déclarée la plus évidente (Medef, Afep, France Invest...) et P0 change la config.
7. Agenda : télécharge `https://data.assemblee-nationale.fr/static/openData/repository/17/vp/reunions/Agenda.json.zip` dans `data/raw/opendata/` (non commité) pour P2 (échéances). Pour le dossier rejoué (petits colis, texte PRJLANR5L17B1906, date de référence 19 novembre 2025) : collecte le texte, ses amendements du sujet (`expose` inclus), les scrutins des 19 et 20 novembre 2025 (V3987 à V3997, V4022, V4205) avec votes nominatifs.

## Fini quand
Tous les fichiers ci-dessus existent, `bun run check` passe sur `data/groupes.json`, `data/deputes.json` et `data/*/hatvp.json`, le compteur de crédits est à jour, et `status/P1.md` contient les chiffres de la mesure de 12 h 55. Heure cible : 14 h.
