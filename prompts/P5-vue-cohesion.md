# Session P5 : vue Cohésion (MacBook Pro Ilan)

Lis d'abord `prompts/_commun.md`, puis `PLAN.md` sections 5.1, 5.4, 6 (ligne P5), 8, le rapport design, `contracts/README.md`, `web/README.md`.

## Tu possèdes
`web/src/views/cohesion/` uniquement. Tu utilises les primitives de `web/src/components/` (P4) ; si une primitive te manque, écris-le dans `status/P5.md` et fais un composant local provisoire dans ton dossier.

## Mise en page (route `/cohesion`)
- Gauche 75 % : courbe Recharts, axe x mois (juillet 2024 à aujourd'hui), axe y 0 à 100 %, 1 à 3 paires choisies par puces en haut (défaut : `config.cohesion.paires_demo`), une couleur par paire, traits 3 px, mois à `accord: null` laissés vides (pas de 0). Trait vertical rouge et libellé pour chaque événement de type `censure`, trait gris pour les autres, placés au jour. Trait pointillé à la date du curseur.
- Sous la courbe : le `Curseur` (trois boutons préréglés + slider).
- Droite 25 % : panneau « À cette date » : les signaux dont la date est antérieure ou égale au curseur, le dernier en gros chiffre (« −21 pts »), son libellé, et si `suivi_de_censure` la mention « censure 3 semaines plus tard » calculée depuis les événements. Aucun signal : « Aucun signal à cette date ». Curseur sur aujourd'hui : un lien « Voir le texte en cours » vers `/texte/<dossier_demo>`.
- Pied : `Meta` du fichier.

## Données
`useData("cohesion")`. Développe sur `contracts/fixtures/cohesion.json` ; à 15 h bascule sur live sans changer une ligne.

## Fini quand
La vue correspond à la description sur fixtures, puis sur données réelles, zéro erreur console, le curseur fonctionne au clavier et à la souris. Heure cible : 15 h.
