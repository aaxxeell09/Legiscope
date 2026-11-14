# Idée du projet Axel

Document de cadrage, rédigé le samedi 14 novembre 2026 à 12 h 20, pendant le Hackathon Open Data (swanbase et Hémicycle, Paris 2e, 10 h à 19 h).

But de ce document : qu'Ilan et Axel soient au clair sur ce qu'on fait, comment, pourquoi et jusqu'où on va, avant d'écrire le plan et de coder. Il rassemble le plan « Terminal Parlement » déjà rédigé dans l'équipe et les compléments issus des recherches d'Axel de ce matin.

Nom du produit : **LegiSpot**. Nom du dépôt : Legiscope. Nom du plan initial : Terminal Parlement.

---

## 1. Le projet en une phrase

Un outil d'analyse pour les professionnels des affaires publiques qui dit, sur un texte en cours à l'Assemblée nationale, si ça va passer, si la majorité craque, quels députés peuvent faire basculer le vote, et pour chacun pourquoi lui et comment l'aborder.

Phrase de pitch proposée : « LegiSpot vous dit quel vote peut basculer, et grâce à qui. »

---

## 2. Le cadre du hackathon

- Une journée pour coder un outil d'IA sur la donnée publique française, démonstration devant toute la salle en fin de journée. Source : https://hemicycle.ai/hackathon
- Deux briques imposées : l'API Hémicycle (données) et Featherless (modèles ouverts).
- Récompenses : 1 000 € de crédits Hémicycle, 300 $ de crédits Featherless, accès à TheNest (7 jours d'accompagnement swanbase).
- Le jury est composé des organisateurs. Hémicycle vend Atlas, un logiciel d'affaires publiques, aux mêmes clients que ceux que nous visons.
- Les organisateurs disent chercher « le croisement de sources que personne ne lit ensemble » et demandent que chaque signal montre sa source. Source : https://hemicycle.ai/hackathon
- Moyens de l'équipe : trois ordinateurs, plusieurs comptes, sessions Claude Code en parallèle. Le temps de développement n'est pas la contrainte.

---

## 3. Le client

### 3.1 Qui il est

Un professionnel des affaires publiques. Trois profils, qui ont le même besoin :
- le cabinet de conseil, qui suit plusieurs dossiers pour plusieurs clients ;
- la direction des affaires publiques d'une entreprise ;
- la fédération professionnelle.

### 3.2 Le marché en chiffres

- Environ 3 500 représentants d'intérêts inscrits au répertoire de la HATVP mi-2025, en hausse de 9 % sur un an. Source : https://vie-publique.fr/en-bref/300182-transparence-de-la-vie-publique-le-bilan-2024-de-la-hatvp
- 15 823 fiches d'activité déclarées pour 2024. Même source.
- Budget annuel du lobbying autour de 215 M€ et près de 5 000 lobbyistes par an, selon une étude universitaire sur les données HATVP. Source : https://droit.cairn.info/revue-francaise-d-administration-publique-2024-2-page-433?lang=fr
- Les cabinets pèsent moins de 10 % des inscrits. Les fédérations et les entreprises en font environ les deux tiers (ordre de grandeur, bilan HATVP 2024). Source : https://www.hatvp.fr/wordpress/wp-content/uploads/2025/09/HATVP_BILAN_RRI-2024_web.pdf
- Un cabinet dépose en moyenne 19 fiches par an, contre 8,6 tous déclarants confondus. Même source.

### 3.3 Comment le lobbying fonctionne

Une grande entreprise utilise trois canaux en même temps : son équipe interne, ses fédérations, et des cabinets en renfort.
- ENGIE SA a déclaré entre 2,25 et 2,5 M€ de dépenses de lobbying en France pour 2024, et sept filiales déclarent séparément. Source : https://www.engie.com/en/about-engie/governance/acting-according-to-a-responsible-governance/influence-policy/
- Alibaba France est inscrite au répertoire depuis avril 2022, déclare en propre une fiche sur la taxe petits colis du budget 2026, et est rattachée à la Fevad et au Medef. Source : https://www.hatvp.fr/fiche-organisation/?organisation=812604106
- Le recours d'Alibaba au cabinet APCO a été avancé dans nos échanges mais n'a pas été vérifié.

Ce que les lobbyistes font concrètement (bilan HATVP 2024) : transmettre de l'expertise (25 % des actions), rencontrer un décideur en tête-à-tête (23,5 %), proposer une rédaction (18,5 %), entretenir une correspondance (15,3 %). Le Parlement est cité dans environ six fiches sur dix.

Le moment décisif est la commission : le rapporteur y arbitre, et ce qui se dit en audition annonce les amendements des semaines suivantes. Source : https://www.polyfact.com/guides/comment-faire-une-veille-parlementaire

### 3.4 Ses quatre questions pendant l'examen d'un texte

1. Ce texte ou cet amendement va-t-il passer ?
2. Est-ce que quelque chose craque dans la majorité, avant que ce soit dans la presse ?
3. Quels députés peuvent encore changer le résultat ?
4. Pour chacun d'eux : pourquoi lui, et comment l'aborder ?

Les trois premières viennent du plan Terminal Parlement. La quatrième est le complément d'Axel : c'est la suite logique, une fois les députés identifiés.

---

## 4. Ce qui existe déjà

Constat : les outils du marché vendent tous la même chose, de l'open data gratuit reconditionné en alertes, réponses sourcées et livrables. Ils disent ce qui a été déposé, pas ce qui va se passer ni quoi faire.

| Outil | Ce qu'il fait | Prix public |
|---|---|---|
| Legiwatch | IA parlementaire française, transcriptions, cartographie, rédaction d'amendements, conseil. Lancé début 2026, plus de 30 structures clientes. | 450 €/mois solo, 380 € par siège |
| Dixit | Veille, recherche, et un module Stratégie qui repère les parlementaires engagés. Dominante européenne. | Licence annuelle dès 5 400 € |
| Follaw | Veilles préconfigurées, volet réseaux sociaux. | 0, 99 et 299 €/mois |
| Polyfact | Vidéos indexées, citation à la seconde. | Non public |
| Contexte | Média professionnel avec outils de veille. | Sur devis |
| Atlas (Hémicycle) | Veille, cartographie des rapports de force, prédiction des votes, rédaction de notes. | Non relevé |

Sources : https://www.legiwatch.fr/tarifs , https://www.dixitplatform.com/fr/blog/article/cout-solution-veille-parlementaire , https://www.polyfact.com/en/best-public-affairs-monitoring-tools (comparatif publié par Polyfact, donc par un concurrent).

Côté open source, les projets repérés s'adressent au citoyen (Datan, NosDéputés, etc.). Une centaine de dépôts ont été passés en revue ce matin pour le plan Terminal Parlement, aucun ne répond aux questions du client. Un second scan GitHub, plus large, est en cours dans une autre fenêtre.

Ce qu'on reprend du marché : le modèle par abonnement. On ne parle pas de prix dans la démo.

---

## 5. Le produit : quatre vues

Un écran d'analyse à la manière d'un terminal financier. Chaque vue répond à une question.

### 5.1 Cohésion (est-ce que ça craque ?)

- Une courbe par paire de groupes politiques, mois par mois depuis juillet 2024 : la part des scrutins où les deux groupes votent dans le même sens.
- Les censures sont posées sur la courbe.
- Un curseur temporel permet de se placer à une date et de voir ce que l'outil aurait signalé.

### 5.2 Texte (ça passe ? qui peut basculer ?)

Pour un texte en cours d'examen :
- la position dominante de chaque groupe ;
- la liste des amendements en attente, avec le sort prédit par Orcet, le modèle de prédiction d'Hémicycle ;
- les quinze députés les moins prévisibles dans les groupes divisés, avec leurs écarts récents.

### 5.3 Fiche d'approche (pourquoi lui, comment l'aborder ?)

Un clic sur un député de la vue Texte ouvre sa fiche, construite sur toutes les données de l'Assemblée filtrées sur le sujet :
- **Auditions** : qui il a entendu comme rapporteur, sur quels textes. Information extraite des annexes « personnes entendues » des rapports parlementaires.
- **Débats** : ce qu'il a dit en séance et en commission sur le sujet, avec la citation et le lien.
- **Amendements** : ceux qu'il a déposés ou cosignés sur le sujet, et leur sort. Quand l'exposé des motifs indique que l'amendement a été travaillé avec une organisation, on le relève.
- **Synthèse** : sa position probable et l'argument à lui présenter, rédigés par le modèle et vérifiés.

Axel tient à ce que les auditions et les débats soient dans le produit : c'est ce qui apporte le plus par rapport à une simple liste de noms.

### 5.4 Note (ce que le client transmet)

Une note d'analyste de 150 mots, rédigée par un modèle de langage ouvert à partir des chiffres des autres vues, avec ses sources et ses limites.

---

## 6. Les données

Tout part des données de l'Assemblée nationale, qu'on traite ensuite en se concentrant sur un sujet.

### 6.1 Hémicycle

- Base : textes, amendements (17e législature), scrutins et votes nominatifs depuis 2012, Sénat depuis octobre 2023, dossiers législatifs depuis 1986, Journal officiel, HATVP, débats transcrits, presse de 620 médias. Synchronisation chaque nuit. Source : https://hemicycle.ai/donnees
- Les identifiants sont ceux des assemblées (acteur PA..., organe PO..., scrutin VTANR5L17V...).
- API REST : `https://api.hemicycle.ai/v1`, en-têtes `Authorization: Bearer` et `Hemicycle-Version: 2026-10-01`. Source : https://hemicycle.ai/api
- Serveur MCP : `https://api.hemicycle.ai/mcp`, branchable dans Claude Code. Source : https://hemicycle.ai/mcp

Coût des appels en crédits :

| Appel | Crédits |
|---|---|
| Lecture ou page de liste (textes, amendements, scrutins, votes, acteurs) | 1 |
| Recherche plein texte | 2 |
| Agrégats : accord entre groupes, loyauté des députés, classement des auteurs | 5 |
| Positions des groupes sur des scrutins | 1 |
| Prédiction Orcet | 50 |
| Question à Marianne | 50 |
| Exposition d'une entreprise | 1 000 |
| Livrable rédigé | 2 500 |

1 000 crédits sont offerts par compte. Axel indique pouvoir en obtenir autant que nécessaire, donc les crédits ne sont plus une contrainte.

### 6.2 Open data brut de l'Assemblée

Pour le volume et pour ce que l'API ne structure pas : rapports parlementaires et leurs annexes d'auditions, comptes rendus de séance et de commission. Source : https://data.assemblee-nationale.fr

Point d'attention sur les auditions : tous les rapports n'ont pas de liste. Une étude de 2011 en comptait 62 % sans liste. La couverture sera donc partielle et il faut l'afficher. Source : https://www.regardscitoyens.org/transparence-france/etude-lobbying/images/Analyse_Etude_lobbying_RegardsCitoyens_TIFrance.pdf

### 6.3 Featherless

- API compatible OpenAI : `https://api.featherless.ai/v1`.
- 25 $ de crédits par participant, contexte jusqu'à 256K, sans limite de taille de modèle (information des organisateurs).
- Le tool calling natif est documenté pour la famille Qwen 3. Source : https://docs.openclaw.ai/providers/featherless
- Rôles : extraire les auditions des annexes de rapports, rédiger la note, les titres d'alerte et les fiches d'approche.

---

## 7. La technique

Reprise de l'architecture du plan Terminal Parlement, étendue.

- Pas de serveur. Chaque session écrit des fichiers JSON sur disque, aux formats fixés à l'avance avec des exemples. Le front est un site statique qui lit ces fichiers. Les sessions travaillent donc en parallèle sans se bloquer.
- Le modèle de langage ne voit jamais un vote. Il reçoit une liste de chiffres et de citations, et un vérificateur mécanique rejette tout texte qui contient un chiffre absent de la liste. Température basse, sortie JSON, trois tentatives puis texte de secours par gabarit.
- Une seule session appelle l'API payante, avec un garde-fou sur le solde.
- Règles tenues par construction : uniquement des élus dans l'exercice de leur mandat, chaque écran porte sa source, sa date et ses limites, chaque prédiction est une probabilité datée.

### Les sessions

| N° | Session | Livre | Origine |
|---|---|---|---|
| 1 | Collecte | Données brutes réelles en JSON | Terminal Parlement |
| 2 | Analyse | Courbe de cohésion, pivots, amendements prédits | Terminal Parlement |
| 3 | Auditions | Organisations entendues par rapporteur et par texte | Complément Axel |
| 4 | Débats et amendements par député | Citations, liens, amendements sur le sujet | Complément Axel |
| 5 | Rédaction | Note et fiches d'approche, chiffres vérifiés | Terminal Parlement, étendu |
| 6 | Front | Les quatre vues | Terminal Parlement, étendu |
| 7 | Démo | Script, pitch, README publiable | Terminal Parlement |

Les sessions 3 et 4 écrivent dans les formats JSON existants pour que le front les lise sans retouche. Elles ont besoin du format de la liste des députés pivots (identifiants PA...).

### Budget de crédits du plan initial (pour mémoire)

| Poste | Crédits |
|---|---|
| Accord entre groupes, 24 mois | 120 |
| Votes nominatifs de 200 scrutins | 200 |
| Orcet sur 8 amendements | 400 |
| Loyauté, positions, recherches | environ 70 |
| Total | environ 790 sur 1 000 |

### Horaires du plan initial (à recaler)

Collecte 14 h, analyse et note 15 h, front 16 h, fusion 16 h, deux répétitions à 17 h, démo à 18 h.

---

## 8. La démo

Séquence proposée :
1. On recule le curseur de la vue Cohésion avant une censure : l'accord entre groupes décroche, le gouvernement tombe quelques semaines après.
2. On revient sur un texte du jour : positions des groupes, amendements en attente et leur sort prédit.
3. On ouvre la fiche d'approche d'un député pivot : ses auditions, ce qu'il a dit, ses amendements, l'argument à lui présenter.
4. On termine sur la note de 150 mots, prête à transmettre.

Arguments pour le jury, repris du plan Terminal Parlement :
- le jury est le client : on lui montre ce que son API permet de construire en une journée ;
- Orcet est au centre de l'écran principal ;
- on montre une trajectoire dans le temps, pas un état ;
- l'IA est vérifiable : aucun chiffre non sourcé ne passe.

### Le texte de démo : options

Le budget 2027 (projet de loi n° 3210) est en première lecture à l'Assemblée en ce moment. La vue Texte a besoin d'amendements encore en attente pour Orcet, donc d'un sujet de ce budget. Deux sujets simples et récents :
- **Cryptoactifs** : un amendement adopté le 3 novembre 2026 rend obligatoire leur déclaration annuelle. Source : https://www.assemblee-nationale.fr/dyn/17/comptes-rendus/seance/session-ordinaire-de-2026-2027/deuxieme-seance-du-mardi-03-novembre-2026
- **Facturation électronique** : un amendement adopté le même jour en dispense les microentreprises et les PME. Source : https://www.assemblee-nationale.fr/dyn/17/amendements/3210A/AN/3426

Pour illustrer un dossier complet du début à la fin, la **taxe petits colis** du budget 2026 : adoptée à l'Assemblée dans la nuit du 19 au 20 novembre 2025 par 208 voix contre 87, relevée de 2 à 5 euros au Sénat, en vigueur du 1er mars au 1er juillet 2026 puis remplacée par un droit européen. Source : https://lcp.fr/actualites/budget-2026-les-deputes-approuvent-la-taxe-de-deux-euros-sur-les-petits-colis-417170 . Ce dossier est clos : il sert au retour dans le passé, pas à la prédiction.

---

## 9. Ce qui a été écarté, et pourquoi

- **Une application sur les dépenses des députés** (idée de départ d'Axel) : les données n'existent pas. Aucune ventilation individuelle n'est publiée et la demande d'accès de Regards Citoyens a été rejetée par le Conseil d'État en 2019. Source : https://acteurspublics.fr/articles/transparence-sur-les-frais-des-deputes-le-conseil-detat-rejette-la-demande-dune-association/
- **Le croisement lobbying et marchés publics** : la donnée intéresse les équipes commerciales, pas les lobbyistes.
- **Ce que font les autres lobbies** : jugé non important par Axel.
- **Le mode de livraison** (mail, plateforme) : à voir une fois l'outil construit.
- **Le prix** : on vend un abonnement, sans en parler.
- **La vitesse des alertes** comme différence : les concurrents alertent déjà en moins de 30 minutes, et la base Hémicycle se met à jour la nuit.

---

## 10. Risques et replis

| Risque | Repli |
|---|---|
| La courbe de cohésion ne décroche pas avant les censures (on le sait à 13 h). | La démo s'ouvre sur la vue Texte, la courbe devient un instrument de veille. |
| Orcet n'a pas de prédiction sur le texte choisi. | Changer de texte. |
| Peu de rapports avec une liste d'auditions sur le sujet choisi. | Élargir à la commission compétente, afficher la couverture réelle. |
| Les citations de débats sont mal attribuées. | Ne garder que les interventions avec identifiant d'orateur. |
| Le front n'est pas prêt à 16 h. | Démo sur Cohésion et Note, le reste en capture. |
| Le jury trouve l'outil trop proche d'Atlas. | Mettre en avant la fiche d'approche et les auditions, qui croisent des sources que l'API ne structure pas. |

---

## 11. Points à trancher avec Ilan

1. **Jusqu'où on va.** Version minimale : vues Cohésion, Texte et Note. Version complète : les quatre vues, avec auditions et débats. Axel veut la version complète.
2. **Le texte de démo.** Cryptoactifs, facturation électronique, ou un autre sujet du budget 2027. Et garde-t-on la taxe petits colis pour le retour dans le passé ?
3. **Les formats JSON.** Les fixer avant de lancer les sessions, surtout celui des députés pivots.
4. **Qui fait quoi** sur les trois ordinateurs, et quelle session unique appelle l'API payante.
5. **Le modèle Featherless.** Le plan cite « Qwen 3.8 27B » : à vérifier dans le catalogue avant de s'appuyer dessus.
6. **La courbe de cohésion.** Décision à 13 h selon ce que montrent les données.
7. **Le nom.** Le produit s'appelle LegiSpot ; le dépôt conserve le nom Legiscope.
8. **La question à poser à l'équipe Hémicycle.** Atlas extrait-il déjà les auditions des rapports ? Deux minutes avec eux suffisent.

---

## 12. Ce qui n'a pas été vérifié

- La description précise d'Orcet (moyenne des probabilités individuelles, évaluation sur 1 592 scrutins masqués).
- L'existence du modèle « Qwen 3.8 27B » chez Featherless.
- Le fait que « l'IA de confiance » soit le thème officiel du hackathon : la page de l'événement ne le dit pas.
- Le lien entre Alibaba et le cabinet APCO.
- Le contenu exact d'Atlas : seule sa présentation publique a été lue.
- La taille des pages renvoyées par l'API Hémicycle, donc le coût réel d'une collecte en volume.
- La disponibilité de ces noms de produit.
