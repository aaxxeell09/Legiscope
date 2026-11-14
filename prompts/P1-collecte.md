# Session P1 : collecte Hémicycle (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 5, 6 (ligne P1), 9 et l'annexe A.

Tu es la **seule** session qui appelle l'API Hémicycle. Clé dans `.env` (`HEMICYCLE_API_KEY`, préfixe `hmc_live_`). Base `https://api.hemicycle.ai/v1`, en-têtes `Authorization: Bearer` et `Hemicycle-Version: 2026-10-01`. Pages de 100 maximum, chaque page facturée. Lis `X-Credits-Cost` et `X-Credits-Remaining` à chaque réponse et tiens un compteur dans `status/P1.md`. Plafond : si `X-Credits-Remaining` passe sous 150, tu t'arrêtes et tu l'écris.

## Tu possèdes
`pipeline/collecte/`, `data/raw/`, `data/groupes.json`, `data/deputes.json`, `data/<dossier>/hatvp.json`.

## Livrables, dans cet ordre
1. **12 h 55, mesure** (avant toute collecte en volume) : un appel de chaque type et son coût réel écrit dans `status/P1.md` : `GET /scrutins?limit=1`, `GET /scrutins/{id}/votes` sur un scrutin complet (combien de pages, combien de crédits), `POST /agregats/accord-groupes` sur un mois, `POST /agregats/loyaute-deputes` sur un groupe, `GET /amendements?texte=<texte_id du dossier en cours>&sort=...` et le **nombre d'amendements en attente** sur le sujet de `config.json`, `POST /orcet/predictions` sur un amendement en attente de ce sujet (répond-il, avec quelle valeur). Vérifie aussi que le texte 3210 est toujours en première lecture à l'Assemblée. Tout va dans `status/P1.md` avant 13 h 05 : P0 décide à 13 h 15 avec ces chiffres.
2. `data/groupes.json` et `data/deputes.json` (`GET /organes?type=...`, `GET /acteurs`, groupe_id null pour les non-inscrits). Format : section 5.2 et 5.3.
3. `data/raw/scrutins/<id>.json` : tous les scrutins depuis le 1er juillet 2024 avec leurs votes nominatifs, **un fichier par scrutin** (réponse brute de l'API, plus le résultat par groupe). Si le coût mesuré en 1 dépasse 600 crédits pour l'ensemble, réduis à 12 mois puis à 100 scrutins et écris-le.
4. `data/raw/accord-groupes/<YYYY-MM>.json` : `POST /agregats/accord-groupes` par mois depuis juillet 2024. `data/raw/loyaute/<groupe>.json` : loyauté par groupe sur 12 mois.
5. Pour chaque dossier de `config.json` : `data/raw/<dossier>/texte.json`, `data/raw/<dossier>/amendements.json` (tous les amendements du texte filtrés sur les mots-clés du sujet, pages suivantes jusqu'à `has_more: false`), `data/raw/<dossier>/orcet/<amendement>.json` pour chaque amendement en attente (404 = pas de prédiction, non facturé, écris un fichier `{"prediction": null}`), et les scrutins liés au sujet (recherche `GET /recherche?q=<mots-clés>&types=scrutin`).
6. `data/<dossier>/hatvp.json` : `GET /entreprises?q=<mots-clés du sujet>` et lecture des fiches HATVP qui déclarent une activité sur le texte. Format section 5.10.

## Fini quand
Tous les fichiers ci-dessus existent, `bun run check` passe sur `data/groupes.json`, `data/deputes.json` et `data/*/hatvp.json`, le compteur de crédits est à jour, et `status/P1.md` contient les chiffres de la mesure de 12 h 55. Heure cible : 14 h.
