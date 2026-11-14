# Fixtures : jeu de repli de la démo

Miroir complet de `data/`, généré par `bun contracts/generer-fixtures.ts` (déterministe, ne pas éditer à la main : modifier le générateur puis relancer). Validé par `bun qa/check.ts --root contracts/fixtures`.

## Ce qui est réel

- **Groupes** : les 11 groupes de la 17e législature avec leurs identifiants `PO` réels, lus le 14 novembre 2026 sur la page « Effectif des groupes politiques » de l'Assemblée (`www2.assemblee-nationale.fr/instances/liste/groupes_politiques/effectif`, liens `OMC_PO...`) : RN PO845401, EPR PO845407, LFI-NFP PO845413, SOC PO845419, DR PO845425, EcoS PO845439, DEM PO845454, HOR PO845470, LIOT PO845485, GDR PO845514, UDR PO872880. Effectifs = colonne « Total » de cette page (apparentés inclus). Le plan citait `PO800490` pour le bloc central : c'est un identifiant d'une autre législature, les fixtures utilisent `PO845407` (EPR).
- **Censures** (`cohesion.json`, `events`) : 4 décembre 2024, motion de censure contre le gouvernement Barnier adoptée (331 voix) ; 8 septembre 2025, confiance refusée au gouvernement Bayrou (364 contre 194). Vérifié par recherche web le 14 novembre 2026 (info.gouv.fr, datan.fr, presse). Le second épisode est un vote de confiance (article 49-1), pas une motion de censure : il est typé `censure` pour le front, le libellé le dit.
- **Nominations** (Barnier 5 septembre 2024, Bayrou 13 décembre 2024, Lecornu 9 septembre 2025) : de mémoire, non vérifiées par recherche.
- **Petits colis** : amendement de suppression du RN n° 806, URL réelle (`AMANR5L17PO838901B1906P1D1N000806`, rendu-final.md section 6) ; vote du 20 novembre 2025, 208 contre 87 ; texte PLF 2026 n° 1906.
- **PLF 2027** : texte n° 3210 ; rejet de la première partie le 4 novembre 2026, scrutin `VTANR5L17V9759` (donné par le coordinateur, non vérifié).
- **Organisations** : Fevad, CPME, Medef, Adan, Alibaba France, Afep, France Invest, DGFiP, douane, Conseil des prélèvements obligatoires sont réelles. Leurs identifiants HATVP (9 chiffres) sont plausibles, **non vérifiés**.

## Ce qui est inventé

- **Députés** : 35 députés fictifs (« Député Test A » à « Député Test AI »), identifiants `PA` de forme réaliste mais sans correspondance ; 2 non-inscrits (`groupe_id: null`). Aucune citation n'est attribuée à une personne réelle.
- Les autres numéros d'amendements, de scrutins, de rapports, les URL de comptes rendus et les probabilités Orcet sont plausibles, pas réels.

## Cas limites couverts (pour le front)

| Cas | Où |
|---|---|
| `accord: null` quand `n_scrutins` vaut 0 | `cohesion.json`, août 2024 et août 2025, 3 paires, 24 mois (2024-07 à 2026-06) |
| Signal suivi d'une censure et faux signal | `cohesion.json`, `signals` |
| Pivot sans fiche (grisé) | 2 pivots sur 6 par dossier, listés dans `fiches/index.json` → `absents` |
| Pivot sans audition, couverture 0 | rang 5 de chaque dossier |
| Prédiction Orcet `null` | n° 3602 (holdings), n° 2601 (petits colis) |
| Amendement d'un non-inscrit (`groupe_id: null`) | n° 3550, n° 2733 |
| Synthèse en `mode: "gabarit"` (`modele: null`) | fiche de rang 3 de chaque dossier |
| Synthèse `null` (pas encore produite) | fiche de rang 4 de chaque dossier |
| `position_groupe: null` dans un écart | pivot de rang 4 |
| Position de groupe `null` et `divise` | `texte.json`, `positions` |
| Verdict « insuffisant » (`score: null`) | objectif 2 petits colis, objectif 3 holdings |
| Lecture de verdict en gabarit | objectif 3 holdings |
| `cause_du_changement: null` | objectifs 2 |
| Échéance et dernière occasion sans date (`null`) | `plf2027-holdings/suite.json` |
| `proba: null` dans les probables | holdings (tous), petits colis (Sénat) |
| Député à position non connue (`fondement: []`) | `plf2027-holdings/action.json`, actionnables |
| Décideur sans identifiant (gouvernement) | `action.json`, `decideurs` |
| Preuve `fait`, `deduction`, `inconnue` | partout |
| `date_reference` posée (rejeu à la veille du vote) | `petits-colis` (2025-11-19) ; `plf2027-holdings` à `null` |
| `pivot_demo: null` | `plf2027-holdings` |
| Nombre avec espace fine dans un texte vérifié | `plf2027-holdings/action.json`, premier contre-argument (« 4 000 ») |

Limite connue : les deux dossiers ont `base: "sujet"` dans `pivots.json` ; le cas `base: "general"` (aucun scrutin nominatif sur le sujet) n'est pas illustré.
