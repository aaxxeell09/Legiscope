# Session A4 : fiches, Nouveautés, Action (MacBook Air Ilan)

Lis d'abord `prompts/_commun.md`, puis `rendu-final.md` (blocs 2 et 4, section 6), `PLAN.md` sections 5.7 à 5.11, 5.13, 5.16, 5.18, 5.19, 6 (ligne A4), 8.

## Tu possèdes
`pipeline/fiches/run.ts`, `pipeline/fiches/lib/` (pas `pipeline/fiches/prompts/`, à X3), `data/<dossier>/fiches/`, `data/<dossier>/nouveautes.json`, `data/<dossier>/action.json`.

## Tu lis
`auditions/`, `debats/`, `amendements/` (A1, A2, A3), `arguments.json` (A2), `hatvp.json` (P1), `texte.json`, `etat.json`, `groupes-action.json` (P3), `data/raw/scrutins/`, `data/raw/opendata/Agenda.json.zip` (P1), `pipeline/lib/llm.ts` (P8), `pipeline/fiches/prompts/` et `pipeline/action/prompts/` (X3).

## Méthode
1. **Dès 13 h 20 sur les fixtures**, `bun run fiches` fait trois choses, rejouables :
   - **Fiches** (5.11) : fusion pure des trois fichiers intermédiaires + `hatvp` + `couverture` ; `synthese` via `redigerVerifie` avec le prompt de X3 (chiffres et citations du député, jamais un vote brut) ; `mode: gabarit` après 3 échecs, jetons fautifs dans `status/A4.md` ; `fiches/index.json` (`disponibles`, `absents` avec raison). Tu n'inventes rien.
   - **Nouveautés** (5.16) : événements du dossier assemblés depuis `texte.json` (dépôts et sorts d'amendements), `data/raw/scrutins/` (scrutins liés), `auditions/` (rapports, auditions), `debats/` (séances et commissions où le sujet a été abordé), `hatvp.json` (déclarations), agenda (réunions passées liées au texte). Importance : 3 = scrutin, sort d'un amendement du client ou d'un allié, avis du gouvernement ; 2 = rapport, audition, dépôt d'amendement de groupe ; 1 = le reste. Rien après `date_reference`. Chaque événement a une URL et un `preuve`.
   - **Action** (5.19) : `groupes` recopiés de `groupes-action.json` avec `fiche: true|false` selon `index.json` ; `arguments` recopiés de `arguments.json` ; `contre_arguments` = pour chaque argument « pour la mesure » (le camp opposé à `position_cible` ; inverse si le client est pour), un contre-argument rédigé via `redigerVerifie` avec le prompt de X3 (`pipeline/action/prompts/contre-argument.md`) à partir des arguments « contre » entendus et des chiffres du dossier, `repond_a` = l'argument visé, vérifié ou gabarit.
2. **15 h 15** : la fiche `config.dossiers[].pivot_demo` de chaque dossier en premier, relue à la main (chaque lien ouvert), puis les autres.
3. Dossier rejoué petits colis : `nouveautes.json` doit contenir le dépôt de l'amendement de suppression du RN (n° 806) en importance 3 et le compromis du gouvernement s'il est trouvé ; `action.json` : alliés = RN, contre-arguments aux arguments « protéger le commerce » et « 500 M€ ».

## Fini quand
Fiches, `index.json`, `nouveautes.json`, `action.json` des deux dossiers passent `bun run check` ; synthèses et contre-arguments vérifiés ou en gabarit ; fiche de démo relue. Heure cible : 16 h 15.
