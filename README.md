# Bascule

Bascule est un tableau de bord pour les cabinets d'affaires publiques : un tableau de bord par dossier, c'est-à-dire un client, un sujet et un objectif.
Sur chaque dossier, il suit la mesure qui peut toucher le client et se lit en cinq blocs : Verdict, Nouveautés, Suite, Action, Compte rendu.
Chaque information porte un bouton « pourquoi » qui donne sa source et le raisonnement : l'outil propose, le cabinet tranche.

Projet construit le 14 novembre 2026 pendant le Hackathon Open Data (swanbase et Hémicycle, Paris).

## Capture

> **Capture à venir.** Emplacement réservé : l'image du tableau de bord sera déposée dans `qa/captures/` puis insérée ici. Aucune image n'est jointe pour l'instant.

<!-- CAPTURE : remplacer le bloc ci-dessus par ![Tableau de bord Bascule](qa/captures/NOM_DU_FICHIER.png) quand la capture existe. -->

## Lancer la démo

Il faut [Bun](https://bun.sh) installé. Quatre commandes :

```sh
git clone https://github.com/aaxxeell09/Legiscope.git && cd Legiscope
cp .env.example .env
bun install
bun run dev
```

Ouvrir ensuite http://localhost:5173 : la page d'accueil mène au dossier de démonstration.

- Les clés du fichier `.env` (`HEMICYCLE_API_KEY`, `FEATHERLESS_API_KEY`) ne servent qu'à régénérer les données. Le site s'ouvre sans elles.
- Sans dossier `data/`, le site lit le jeu d'exemple de `contracts/fixtures/` : mêmes écrans, députés fictifs.
- `bun run check` valide tous les fichiers de données. `bun run build` produit le site statique dans `dist/`.

## Ce qu'on voit

Un dossier commence par son en-tête : le client, la mesure suivie, l'objectif principal, puis les objectifs de repli (« à défaut »).

| Bloc | Question du cabinet | Ce qu'il lit |
|---|---|---|
| Verdict | Est-ce en bonne voie ? | Pour chaque objectif : la situation, la tendance, la confiance, ce qui marche, ce qui coince, et l'événement qui a fait bouger le verdict |
| Nouveautés | Que s'est-il passé, et qu'est-ce qui compte ? | Les événements qui touchent la mesure, triés par importance, avec leur effet sur le verdict |
| Suite | Quelles sont les prochaines dates ? | Les échéances, la dernière occasion d'agir, ce qui a le plus de chances de se produire |
| Action | Qui décide, et sur qui agir ? | Ceux qui décident, trois groupes de députés (sur qui agir, alliés, perdus), les arguments entendus, les contre-arguments |
| Compte rendu | Que puis-je reprendre pour mon client ? | Quelques lignes de synthèse, chiffres vérifiés |

En fond : l'état de la mesure, la base complète des articles et des amendements, la fiche des députés cités quand elle existe, et une page « Sources et limites ».

| Adresse | Page |
|---|---|
| `/dossier/:id` | Tableau de bord du dossier |
| `/dossier/:id/depute/:pa` | Fiche d'un député sur ce dossier |
| `/dossier/:id/base` | État de la mesure, articles, amendements |
| `/sources` | Sources et limites de chaque fichier chargé |

Deux dossiers de démonstration :

- **Taxe sur les petits colis, budget 2026.** Dossier rejoué : tout est vu à la date du 19 novembre 2025, veille du vote à l'Assemblée. Rien de postérieur n'est utilisé.
- **Taxe sur les holdings et la fortune improductive, projet de loi de finances 2027.** Dossier en cours.

Les clients affichés sont des exemples choisis pour la démonstration. Aucune de ces organisations n'est cliente du projet ni associée à lui.

## Comment c'est fait

Pas de serveur. Trois couches qui ne se parlent que par des fichiers JSON.

```
API Hémicycle ─────────────┐
Open data de l'Assemblée ──┼─► pipeline/ (TypeScript, Bun) ─► data/<dossier>/*.json ─► web/ (Vite, React)
HATVP ─────────────────────┤
Featherless ───────────────┘        contracts/ : schémas zod et jeu d'exemple
```

- `contracts/` : un schéma par fichier JSON et un jeu d'exemple complet. Voir `contracts/README.md`.
- `pipeline/` : les scripts qui produisent `data/`. Ils sont rejouables.
- `web/` : le site statique. Voir `web/README.md`.
- Chaque fichier de données porte un bloc `meta` : ses sources, sa date de génération, ses limites. Chaque élément affiché porte une preuve : fait publié, déduction de l'outil ou inconnue.

## Sources de données

| Source | Ce qu'on en tire | Licence ou conditions |
|---|---|---|
| [API Hémicycle](https://hemicycle.ai/api) ([données](https://hemicycle.ai/donnees)) | Scrutins et votes nominatifs, textes et amendements, députés et groupes, accord entre groupes, loyauté des députés, prédictions Orcet | Service à clé, conditions d'utilisation d'Hémicycle |
| [Open data de l'Assemblée nationale](https://data.assemblee-nationale.fr) | Dossiers législatifs et rapporteurs, comptes rendus de séance, agenda. Les rapports et les comptes rendus de commission sont lus sur [assemblee-nationale.fr](https://www.assemblee-nationale.fr) | [Licence Ouverte](https://data.assemblee-nationale.fr/licence-ouverte-open-licence) (Etalab) |
| [HATVP](https://www.hatvp.fr), [répertoire des représentants d'intérêts](https://www.data.gouv.fr/datasets/repertoire-des-representants-dinterets) | Organisations ayant déclaré une action de représentation d'intérêts sur le texte | Licence Ouverte (Etalab) |
| [Featherless](https://featherless.ai) | Accès à un modèle de langage ouvert, pour l'extraction et la rédaction (`Qwen/Qwen3.8-27B` par défaut, le modèle réellement utilisé est affiché sur `/sources`) | Service à clé |

Dans l'application, la page `/sources` donne pour chaque fichier chargé ses sources, sa date et ses limites.

## Ce que le modèle de langage voit et ne voit pas

Il voit :

- des chiffres déjà calculés par le pipeline et des citations avec leur source, pour rédiger la lecture du verdict, les synthèses, les contre-arguments et le compte rendu ;
- les annexes des rapports parlementaires, pour en extraire la liste des personnes entendues ;
- les interventions en séance et en commission, pour les classer pour ou contre la mesure.

Il ne voit pas et ne fait pas :

- il ne voit jamais un vote ;
- il ne calcule aucun chiffre : le verdict et le classement des députés sont mécaniques ;
- il ne peut pas introduire un nombre. Un vérificateur rejette tout texte contenant un nombre absent de la liste fournie. Après trois essais rejetés, le texte est produit par un gabarit sans modèle, et l'application le signale.

## Limites

- **L'outil propose, le cabinet décide.** Le verdict est une proposition avec ses raisons. Il peut dire « pas assez d'information pour conclure ».
- **Une prédiction Orcet n'est pas une probabilité d'adoption.** C'est la moyenne des probabilités individuelles de voter pour un amendement. Sans prédiction, rien n'est affiché.
- **L'Assemblée n'est pas l'issue finale.** Un vote en commission n'est pas une adoption. Les votes et les débats du Sénat ne sont pas analysés.
- **Un député n'est classé que sur ce qu'il a lui-même dit, déposé ou voté.** Quand sa position n'est pas connue, c'est écrit.
- **Auditions : couverture partielle.** Tous les rapports n'ont pas de liste de personnes entendues. La couverture est affichée.
- **Débats.** Seules les interventions dont l'orateur est identifié sont gardées. Les comptes rendus de commission sont lus page par page.
- **HATVP.** Les données sont déclaratives. Le filtre par mots-clés peut retenir une organisation à tort.
- **La mesure est déclarée à la main** dans `config.json` et suivie par ses mots-clés. Son repérage automatique dans les textes n'est pas fait.
- **Jeu d'exemple.** Dans `contracts/fixtures/`, les députés sont fictifs, et les numéros et probabilités ne sont pas réels.
- **Hors périmètre.** Vue sur plusieurs dossiers, presse, alertes en temps réel, mise en ligne.
- **Projet de hackathon**, construit en une journée. Il n'a pas été audité.

## Crédits

- [Hémicycle](https://hemicycle.ai) : API de données parlementaires et modèle Orcet. Organisateur du hackathon avec swanbase.
- [Featherless](https://featherless.ai) : accès aux modèles de langage ouverts.
- [Assemblée nationale](https://data.assemblee-nationale.fr) : données ouvertes de la 17e législature.
- [Haute Autorité pour la transparence de la vie publique](https://www.hatvp.fr) : répertoire des représentants d'intérêts.

## Équipe

Axel et Ilan. Construit en une après-midi, sur trois ordinateurs, avec des sessions Claude Code en parallèle.
