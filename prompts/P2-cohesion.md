# Session P2 : cohésion (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 5.1, 5.4, 6 (ligne P2), 9.

## Tu possèdes
`pipeline/cohesion/`, `data/cohesion.json`.

## Tu lis
`data/raw/scrutins/*.json` et `data/raw/accord-groupes/*.json` produits par P1 (en attendant, développe sur `contracts/fixtures/` et sur quelques scrutins que P1 aura déjà écrits : regarde `status/P1.md`).

## Livrables
1. `pipeline/cohesion/run.ts` : pour chaque paire de groupes (hors non-inscrits), mois par mois depuis juillet 2024, `accord` = part des scrutins du mois où les deux groupes ont une position majoritaire non nulle et identique, `n_scrutins` = ce dénominateur, `accord: null` si 0. Position majoritaire d'un groupe sur un scrutin = la position (pour, contre, abstention) la plus fréquente parmi ses membres ayant voté ; null si moins de 5 votants. Le groupe d'un député est celui au moment du vote (`groupe` du vote), pas celui d'aujourd'hui.
2. `events` : les censures (4 décembre 2024, gouvernement Barnier ; vérifie la date de la censure Bayrou dans les scrutins et écris la source), dissolution, nominations, et l'événement `vote` de la taxe petits colis (`dossier_id: "petits-colis"`). Chaque événement a une URL.
3. `signals` : tout décrochage de plus de 0,15 d'un mois sur l'autre pour une paire de `config.cohesion.paires_demo`, avec `suivi_de_censure: true` si une censure survient dans les 60 jours.
4. **13 h 15, réponse écrite dans `status/P2.md`** : « la courbe décroche-t-elle avant les censures ? » avec, pour les paires de démo, le nombre de décrochages suivis d'une censure et le nombre non suivis. Vérifie aussi les dates des trois préréglages de `config.cohesion.curseur_presets` et corrige-les dans `status/` si elles sont fausses (P0 modifie config).

## Fini quand
`data/cohesion.json` passe `bun run check`, 3 paires de démo au moins, 28 mois, signaux listés, réponse de 13 h 15 écrite. Heure cible : 14 h 30.
