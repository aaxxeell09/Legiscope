# Script de démo : trois minutes, quatre temps

Version 2, 14 novembre 2026, 14 h 30. Réécrite sur les données réelles de `data/` (front en `dataset: live`), après les corrections d'Axel de 14 h 05. Valeurs relevées dans les fichiers du dépôt à 14 h 25 : `verdict.json`, `etat.json`, `suite.json`, `nouveautes.json`, `action.json`, `note.json`, `fiches/`. X1 n'a pas pu ouvrir l'app : tout ce qui est marqué **[ÉCRAN]** se relit sur l'app réelle aux répétitions de 17 h 15 et 17 h 40.

## Comment lire ce script

- Une ligne qui commence par `>` : ce qu'on dit, mot pour mot.
- **Clic** : ce que fait la main.
- **[ÉCRAN]** : on lit ce que l'écran affiche à cet endroit. Si l'écran dit autre chose que le script, l'écran a raison.
- Deux personnes : une voix, une main. La voix ne touche pas le trackpad.
- Nom du produit : « Bascule » (valeur de `config.json`). S'il change à 17 h, il change à un seul endroit, la deuxième phrase de l'ouverture.

## Avant de monter sur scène

1. `bun run dev` tourne. Onglet 1 : `http://localhost:5173/dossier/petits-colis`, en haut de page.
2. Onglet 2 : `http://localhost:5173/dossier/plf2027-holdings`, en haut de page, déjà chargé.
3. Onglet 3 (secours) : la fiche du député de démo, `http://localhost:5173/dossier/petits-colis/depute/PA794118` (Antoine Vermorel).
4. Zoom du navigateur réglé pour le projecteur. Aucune autre fenêtre ouverte.
5. On n'ouvre jamais un lien de source pendant la démo (il part sur le site de l'Assemblée, donc sur le réseau). On ouvre le panneau « pourquoi », on montre que le lien est là, on ferme.
6. Captures d'écran de secours des cinq blocs et de la fiche, dans l'ordre du script (gel de 16 h 45).
7. Un chronomètre visible par la voix.
8. Trois contrôles à 16 h 45, sur l'app : où se trouve la ligne Antoine Vermorel dans le bloc Action (temps 2), la synthèse de sa fiche (variante C), le texte du Compte rendu (variante E).

## Le script

### Temps 0. Ouverture (0:00 à 0:11)

Écran : onglet 1, en-tête du dossier petits colis.

> Un cabinet d'affaires publiques vend un jugement : où en est le dossier de mon client, et sur qui agir. Bascule prépare ce jugement, et montre ses preuves.

### Temps 1. Dossier rejoué, Verdict (0:11 à 0:58)

Écran : en-tête (client Alibaba France, mesure, objectif, replis, « vu au 18 nov. 2025 »), puis bloc Verdict, onglet de l'objectif principal.

> Le client : Alibaba France. La mesure : la taxe de 2 euros sur les petits colis. L'objectif : empêcher qu'elle soit votée. À défaut, réduire son montant ou repousser son application.

> Nous sommes le 18 novembre 2025, la veille de l'examen en séance.

La main montre le bandeau du Verdict. **[ÉCRAN]** : situation, tendance, confiance. On ne lit pas le chiffre affiché à côté de « Défavorable ».

> Verdict proposé : défavorable, tendance stable. La raison : le gouvernement porte la mesure, sept groupes la soutiennent, un seul est contre.

> Confiance moyenne. Et ce que l'outil ignore est écrit : la position de trois groupes, dont LFI.

La main montre la colonne « Ce qui marche », première ligne (amendement n° 806).

> Ce qui marche : le RN a déposé un amendement de suppression.

**Clic** : « pourquoi » sur cette ligne. Le panneau s'ouvre (raisonnement, lien vers l'amendement).

> Pourquoi ? La source, sur le site de l'Assemblée, et le raisonnement. Ce bouton est sur chaque ligne.

**Clic** : Échap. La main passe sur la colonne « Ce qui coince » sans s'arrêter (gouvernement auteur de la mesure, sept groupes, rapporteur général). La voix n'ajoute rien.

On ne montre pas la ligne « Ce qui a fait bouger le verdict » : la tendance affichée est « stable ».

### Temps 2. Action, puis un député (0:58 à 1:46)

**Clic** : défilement jusqu'au bloc Action (on passe Nouveautés et Suite sans s'arrêter).

**[ÉCRAN]** : « Ceux qui décident ». Relevé : gouvernement, pour ; rapporteur général Philippe Juvin, pour ; président de la commission, position inconnue.

> Action. Ceux qui décident : le gouvernement et le rapporteur général, tous deux pour la mesure.

> Puis les députés : sur qui agir encore, les alliés, les perdus. Chacun est classé sur ce qu'il a lui-même dit, déposé ou voté.

La main descend aux arguments. **[ÉCRAN]** : premier argument de la colonne « Arguments entendus contre la mesure » (Anthony Boulogne, RN, commission des finances du 22 octobre 2025). La citation se lit à l'écran, pas de mémoire.

> Les arguments entendus, avec la citation exacte. Contre la taxe : « une double peine, injuste socialement et inutile économiquement ».

**Clic** : la ligne Antoine Vermorel dans le bloc Action (au relevé de 14 h 25 : colonne « Sur qui agir encore », dixième ligne). P3 revoit cette colonne avant le gel (`status/P0.md`, 14 h 35) : à 16 h 45, on repère où est sa ligne. Si elle n'est plus cliquable dans le bloc, la main passe sur l'onglet 3, déjà chargé. Sa fiche s'ouvre. La main descend aux colonnes Débats et Amendements. La voix ne lit pas la synthèse (variante C).

> J'ouvre Antoine Vermorel, le plus actif de son groupe sur la mesure. Ce qu'il a dit en commission, mot pour mot. Ses amendements : l'un porte la taxe à 5 euros. Et les organisations entendues par les rapporteurs de sa commission.

La main montre, dans l'ordre : la première citation de la colonne Débats, l'amendement n° 938 dans la colonne Amendements, la ligne repliée « Entendues par les rapporteurs de sa commission » dans la colonne Auditions. On ne déplie pas.

> Tout cela vient de l'open data de l'Assemblée.

### Temps 3. Compte rendu (1:46 à 1:58)

**Clic** : retour au dossier, défilement jusqu'au bloc Compte rendu. La voix ne lit pas le texte du compte rendu (variante E).

> Compte rendu : quelques lignes à reprendre pour le client.

**Clic** : bouton « Copier ».

> Copié. Le cabinet l'adapte : le message final reste le sien.

### Temps 4. La chute, puis le dossier vivant (1:58 à 2:52)

La main ne bouge pas. La voix regarde la salle. Rien de ce qui suit n'est à l'écran : le dossier est rejoué au 18 novembre 2025, rien de postérieur n'y figure. C'est voulu.

> La suite. Le lendemain, en séance, l'article 22 est adopté : 208 voix contre 87. Le RN, seul groupe contre.

État du texte, à distinguer de l'état de la mesure. Source : scrutin n° 4241 du 21 novembre 2025, vérifié par P3 dans l'open data et par P0 dans la base Hémicycle (`status/P3.md`, `status/P0.md`), https://www.assemblee-nationale.fr/dyn/17/scrutins/4241

> Deux jours plus tard, l'Assemblée rejette la première partie du budget. Article adopté, projet rejeté en première lecture : deux états distincts.

> Puis le Sénat porte la taxe de 2 à 5 euros. Voilà pourquoi nous suivons la mesure, pas le texte.

**Clic** : onglet 2 (dossier vivant), bloc Verdict. **[ÉCRAN]** : en tête du Verdict, deux lignes séparées, « Mesure : absente du texte » et « Texte : [...] première partie rejetée ». La main les montre pendant la phrase.

> Même outil sur un dossier en cours : la taxe sur les holdings, budget 2027. L'Assemblée a rejeté le projet le 4 novembre. La suite se joue au Sénat.

**[ÉCRAN]** : la main montre la situation du Verdict (relevé : favorable, tendance stable, confiance élevée), puis « Dernière occasion d'agir » dans le bloc Suite (relevé : examen au Sénat, date non publiée). La voix ne lit aucun chiffre.

> Verdict proposé pour le client : favorable. Dernière occasion d'agir : l'examen au Sénat.

> On part du client et de son objectif. Chaque information a son pourquoi. L'outil propose, le cabinet tranche.

Fin. On ne dit rien de plus. On attend la première question.

## Chronométrage

Méthode : comptage des mots des lignes `>` à 150 mots par minute (un nombre compte pour le nombre de mots qu'on prononce : « 2025 » vaut quatre mots, « 208 » trois), plus le temps des clics. Ce n'est pas un chronométrage à voix haute : celui-ci se fait à 17 h 15 et 17 h 40 sur l'app réelle.

| Temps | Mots dits | Voix | Clics | Total | Cumul |
|---|---|---|---|---|---|
| 0. Ouverture | 27 | 11 s | 0 s | 11 s | 0:11 |
| 1. Verdict | 109 | 44 s | 3 s | 47 s | 0:58 |
| 2. Action et député | 104 | 42 s | 6 s | 48 s | 1:46 |
| 3. Compte rendu | 19 | 8 s | 4 s | 12 s | 1:58 |
| 4. Chute et dossier vivant | 126 | 50 s | 4 s | 54 s | 2:52 |
| Total | 385 | 155 s | 17 s | 172 s | 2:52 |

Lecture : 2:52, soit 8 secondes de marge. Avec la chute courte de la variante D : 2:46. Aucune option ne s'ajoute. Si une répétition dépasse 3:00, on applique les coupes plus bas.

## Ce qui est sourcé, ce qui se lit à l'écran

Chaque phrase du script vient d'un fichier du dépôt. Relevé de 14 h 25 : les sessions P3, A4 et P8 régénèrent encore leurs fichiers jusqu'au gel de 16 h 45, donc tout se relit à l'écran.

| Ce qu'on dit | D'où ça vient | À vérifier sur l'app réelle |
|---|---|---|
| Alibaba France, taxe de 2 euros, objectifs | `data/config.json` | En-tête du dossier |
| « Le 18 novembre 2025, la veille de l'examen en séance » | `config.json` (`date_reference: 2025-11-18`) ; `suite.json`, dernière occasion d'agir : séance du 19 novembre 2025, examen de l'article 22 | « vu au 18 nov. 2025 » dans l'en-tête |
| « Défavorable, tendance stable » | `petits-colis/verdict.json`, objectif 1 | Bandeau du Verdict, sinon variante I |
| « Le gouvernement porte la mesure, sept groupes la soutiennent, un seul est contre » | `verdict.json`, lecture vérifiée et « Ce qui coince » : SOC, DR, DEM, EPR, HOR, LIOT, ECOS pour ; RN contre | Texte de lecture sous le bandeau |
| « Confiance moyenne », « la position de trois groupes, dont LFI » | `verdict.json`, confiance : positions lues sur les amendements, aucun scrutin public lié avant le 18 ; inconnu : LFI-NFP, UDR, GDR | Lignes « établi » et « inconnu » |
| Amendement de suppression du RN | `verdict.json`, « Ce qui marche » : amendement n° 806 d'Anthony Boulogne, déposé le 21 octobre 2025, en attente au 18 novembre | « pourquoi » ouvre, lien vers l'amendement |
| Gouvernement et rapporteur général pour la mesure | `petits-colis/action.json`, décideurs : gouvernement « pour », Philippe Juvin « pour » | « Ceux qui décident », sinon variante D2 |
| « Une double peine, injuste socialement et inutile économiquement » | `action.json`, premier argument contre : Anthony Boulogne (RN), commission des finances, 22 octobre 2025, citation recopiée du compte rendu | Même citation à l'écran, sinon variante B |
| Antoine Vermorel, « le plus actif de son groupe sur la mesure » | `action.json`, décideurs : auteur de 9 amendements du sujet, le plus actif du groupe DR (déduction, pas une désignation publiée) | Sa ligne est cliquable dans « Sur qui agir encore » |
| « Ce qu'il a dit en commission » | `fiches/PA794118.json` : 4 citations, commission des finances du 22 octobre 2025 | Colonne Débats |
| « L'un porte la taxe à 5 euros » | `fiches/PA794118.json`, amendement n° 938, auteur, en attente au 18 novembre | Colonne Amendements |
| « Entendues par les rapporteurs de sa commission » | `fiches/PA794118.json` : 9 rapports, tous en rôle « membre », aucun comme rapporteur | Ligne repliée de la colonne Auditions |
| 208 voix contre 87, RN seul groupe contre | `rendu-final.md` section 6 (source LCP : https://lcp.fr/actualites/budget-2026-les-deputes-approuvent-la-taxe-de-deux-euros-sur-les-petits-colis-417170) ; `status/P2.md` et `status/P3.md` : scrutin n° 3999 (VTANR5L17V3999), 19 novembre 2025, 208 pour, 87 contre, vérifié dans l'open data | Dit à l'oral, pas à l'écran |
| Première partie du budget 2026 rejetée le 21 novembre 2025 ; « article adopté, projet rejeté en première lecture » | `status/P3.md` (14 h 22) et `status/P0.md` (14 h 35), vérifié dans l'open data des scrutins et dans la base Hémicycle : scrutin n° 4241 (VTANR5L17V4241), https://www.assemblee-nationale.fr/dyn/17/scrutins/4241, première partie non adoptée, 1 pour, 404 contre, 84 abstentions ; article 22 adopté le 19 novembre 2025, scrutin n° 3999, 208 pour, 87 contre. Le rejet de la première partie vaut rejet du texte en première lecture, pas la fin de la procédure (`plf2027-holdings/etat.json`, même règle) | Dit à l'oral, pas à l'écran : `petits-colis/etat.json` s'arrête au 18 novembre (« en discussion ») |
| Sénat : de 2 à 5 euros | `rendu-final.md` section 6 (source KPMG : https://kpmg.com/av/fr/avocats/eclairages/2025/12/plf-2026-mesures-adoptees-au-senat-en-1e-lecture.html) | Dit à l'oral, pas à l'écran |
| Budget 2027 rejeté par l'Assemblée le 4 novembre | `plf2027-holdings/etat.json`, `texte_etat` : première partie rejetée le 4 novembre 2026, scrutin n° 9759 ; mesure « absente du texte » | Lignes « Mesure » et « Texte » en tête du Verdict du dossier vivant |
| « La suite se joue au Sénat » | `plf2027-holdings/etat.json` : Sénat, première lecture, en cours, date non publiée | Bloc Suite ; ne citer aucune date |
| Holdings : « favorable », dernière occasion « l'examen au Sénat » | `plf2027-holdings/verdict.json`, objectif 1 ; `suite.json`, dernière occasion d'agir | Bandeau du Verdict et bloc Suite, sinon variante J |

Ce qui a été retiré de la version 1, et pourquoi :

- Le compromis du gouvernement sur le mode de paiement. Il a été déposé et adopté le 19 novembre 2025 (`status/P1.md` et `status/P3.md`, amendement n° 4086), donc après la date de rejeu. Il n'est pas dans les données au 18 novembre.
- « En dégradation » et « confiance élevée ». Les données disent « stable » et « moyenne » (`status/P3.md`).
- « Environ 500 millions d'euros de recettes » et « ménages modestes ». Ces deux arguments ne sont pas dans `action.json`.
- « Avec qui ils ont été travaillés ». Le champ est vide sur toutes les fiches.
- Les phrases sur Orcet. Il n'y a de prédiction Orcet sur aucun des deux dossiers (`status/P2.md`, `status/P3.md`).
- Tout pourcentage. Le chiffre à côté du verdict est une part de sièges, pas une probabilité : on ne le dit pas. Si le jury le demande, réponse dans `demo/jury.md`.

## Variantes

### A. Orcet

Le script ne cite pas Orcet. Si le jury demande : « Il n'y a pas de prédiction Orcet sur ces deux mesures aujourd'hui. Le verdict s'appuie sur les positions des groupes, lues sur leurs votes et leurs amendements, et il le dit dans sa confiance. »

### B. Les arguments à l'écran ne sont pas ceux du script

- Si le premier argument contre a changé : on lit la citation affichée, avec « Contre la taxe : », sans la commenter.
- S'il n'y a plus d'argument contre : on remplace la phrase par :

> Un argument entendu, avec sa citation, son orateur et sa source.

- S'il ne reste aucun argument : on supprime la phrase.

### C. La fiche du député

Contrôle de 16 h 45. Au relevé de 14 h 25, la synthèse de la fiche d'Antoine Vermorel dit « probablement favorable à la taxe », en accord avec le bloc Action (8 actes pour la mesure). Une version précédente disait l'inverse : on relit la synthèse sur l'app avant de monter sur scène.

- Si la synthèse et le bloc Action disent la même chose : rien ne change. La voix ne lit pas la synthèse, elle montre les preuves en dessous.
- Si elles se contredisent : on le signale à P0. Si le jury le relève : « La synthèse est rédigée par le modèle. Ici elle se trompe, et les actes juste en dessous le montrent : c'est pour cela que chaque fiche garde les preuves sous la synthèse. »
- Fiche de secours si celle de Vermorel n'ouvre pas : David Taupiac (`PA793796`), même colonne. Elle a une audition comme rapporteur pour avis, donc la section « a entendu ». On dit alors :

> J'ouvre David Taupiac. Les organisations qu'il a entendues comme rapporteur. À part, celles entendues par les rapporteurs de sa commission. Et son amendement.

- Dans tous les cas : « a entendu » seulement pour un rapporteur. Pour un membre de commission : « entendues par les rapporteurs de sa commission ».
- Le bloc HATVP de la fiche liste les organisations déclarées sur le texte. On ne dit jamais que le député les a rencontrées.
- Un député grisé (« fiche en cours ») ne se clique jamais.

### D. Chute courte (si le chronomètre dépasse 2:05 au début de la chute)

On saute la phrase du 21 novembre. La chute ne s'arrête jamais à « 208 contre 87 » :

> La suite. Le lendemain, en séance, l'article 22 est adopté : 208 voix contre 87. Le RN, seul groupe contre.

> Et l'Assemblée n'était pas la fin : le Sénat porte la taxe de 2 à 5 euros. Voilà pourquoi nous suivons la mesure, pas le texte.

Si le jury demande ce qu'est devenu le texte : « L'Assemblée a rejeté la première partie du budget deux jours plus tard, le 21 novembre, par 404 voix contre et une pour. L'article était adopté, le projet rejeté en première lecture. »

### D2. « Ceux qui décident » affiche autre chose

On lit l'écran. Si une position est « inconnue » :

> Action. Ceux qui décident : le gouvernement, le rapporteur général. Quand une position n'est pas connue, c'est écrit.

### E. Le texte du Compte rendu

Contrôle de 16 h 45. La voix ne lit jamais ce texte. Si l'écran affiche « chances », « probabilité » ou un pourcentage sans « des sièges favorables à l'objectif » : on ne défile pas jusqu'au texte, on montre le haut du bloc et le bouton « Copier », et on le signale à P0.

- Badge « gabarit » à l'écran : on dit seulement la première phrase et la dernière. On ne dit pas « rédigé par le modèle ».

### F. Le front n'est pas prêt (un bloc vide ou en erreur à 16 h 45)

- Bloc Compte rendu absent : on supprime le temps 3.
- Fiche du député absente : on reste dans le bloc Action, **clic** « pourquoi » sur un député de « Sur qui agir encore », et on dit :

> Pourquoi ce député est ici : ce qu'il a lui-même déposé ou dit, avec la source.

- Dossier vivant absent : après la chute, on conclut sur le dossier rejoué.
- Une capture se présente comme une capture : « capture de 16 h 45 ».

### I. Le Verdict du dossier rejoué a changé

P3 régénère encore `verdict.json`. On lit l'écran, pas le script.

- Tendance autre que « stable » : on dit la tendance affichée.
- Situation « incertaine » : la raison se lit dans le texte sous le bandeau.
- Situation « favorable » : on le signale à P0 avant 16 h 45 et on ne fait pas la chute sur le vote.

### J. Dossier vivant : le Verdict a changé

On lit la situation affichée. Si l'écran dit « pas assez d'information » :

> Ici l'outil répond : pas assez d'information pour conclure. Il a le droit de le dire, et il dit ce qui manque.

On ne nomme pas le client du dossier vivant à l'oral. Si le jury demande : on lit l'en-tête (Afep), client d'exemple choisi parmi les organisations déclarées à la HATVP sur le sujet.

On n'ouvre aucune fiche de député sur le dossier vivant pendant la démo (voir `status/X1.md`, pivot de démo).

On ne lit pas le libellé de mesure de l'en-tête du dossier vivant (« article 3 », « n° 3140 ») : l'état de la mesure dit « absente du texte du gouvernement » (`status/P3.md`, signalé à P0). On ne lit pas non plus la phrase de lecture sous le bandeau : elle dit « Au Sénat » en comptant des groupes de l'Assemblée.

## Coupes si le chronomètre dépasse

Dans cet ordre :

1. La phrase « Tout cela vient de l'open data de l'Assemblée. »
2. Le clic « Copier » et sa phrase : on montre le bloc, on dit la première phrase seulement.
3. La phrase « Ceux qui décident ».
4. La phrase sur les arguments entendus.

On ne coupe jamais : le « pourquoi » du temps 1, la fiche du député, la chute complète, la dernière phrase.

Repère : la chute commence à 1:58. Si le chronomètre dépasse 2:05 à ce moment : chute courte (variante D). S'il dépasse 2:10 : en plus, on ne dit pas « Verdict proposé pour le client », la main montre le Verdict et la Suite pendant la phrase sur le Sénat, et on conclut.

## Ce qu'on ne dit jamais à l'oral

- Un pourcentage pour le verdict. Ni « 26 % », ni « chances », ni « probabilité ». On dit la situation, la tendance et la raison. Si on doit citer le chiffre : « part des sièges favorables à l'objectif ».
- « Probabilité que la loi passe », pour quoi que ce soit.
- « Adopté » pour un vote en commission. Sur la fiche Vermorel, le n° 719 est « adopté en commission ».
- « C'est fini » après un vote de l'Assemblée : il reste le Sénat et la nouvelle lecture.
- « Rejeté » pour un amendement retiré, tombé, non soutenu ou irrecevable. On lit le sort affiché.
- « A auditionné ». Rapporteur : « a entendu ». Membre de commission : « entendues par les rapporteurs de sa commission ».
- « Il a rencontré » à propos d'une organisation du bloc HATVP.
- « Chef de file » comme un fait : c'est une déduction de l'outil. On dit « le plus actif de son groupe sur la mesure ».
- « Influençable », « retournable ». On dit « sur qui agir encore », et pourquoi.
- Une information postérieure au 18 novembre 2025 avant la chute. Le compromis du gouvernement, le vote, le Sénat : après « La suite », jamais avant.
- « La courbe annonce une censure. » On n'ouvre pas le panneau « Tendance » du Verdict pendant la démo.
- Rien sur Atlas. On parle de ce que nous faisons.

## Ordre de démo

Confirmé sur les données réelles : Verdict, Action, député, Compte rendu sur le dossier rejoué ; chute ; Verdict et Suite du dossier vivant. Le dossier rejoué reste le centre : c'est le seul dont la fiche de démo a des citations, et le seul où la chute compare le verdict proposé à ce qui s'est passé.
