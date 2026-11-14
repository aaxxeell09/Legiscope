# Script de démo : trois minutes, quatre temps

Version 1, 14 novembre 2026, 13 h 20. Écrite à partir de `rendu-final.md`, de `PLAN.md` (sections 1, 2, 8, 9, annexe B) et des fixtures. Écrite **avant** la décision de 13 h 35 et **avant** les données réelles : toutes les variantes prévues sont en bas. À relire à 15 h 15 (données réelles, `pivot_demo`), puis aux répétitions de 17 h 15 et 17 h 40.

## Comment lire ce script

- Une ligne qui commence par `>` : ce qu'on dit, mot pour mot.
- **Clic** : ce que fait la main.
- **[ÉCRAN]** : on lit ce que l'écran affiche à cet endroit. On ne récite pas de mémoire.
- **[À REMPLIR ...]** : emplacement vide tant que la donnée réelle n'existe pas. On ne monte pas sur scène avec un emplacement vide : on le remplit ou on prend la variante.
- Deux personnes : une voix, une main. La voix ne touche pas le trackpad.
- Nom du produit : « Bascule » (valeur de `config.json`). Il se tranche à 17 h : si le nom change, il change à un seul endroit, la deuxième phrase de l'ouverture.

## Avant de monter sur scène

1. `bun run dev` tourne. Onglet 1 : `http://localhost:5173/dossier/petits-colis`, en haut de page.
2. Onglet 2 : `http://localhost:5173/dossier/plf2027-holdings`, en haut de page, déjà chargé.
3. Onglet 3 (secours) : la fiche du député de démo, `http://localhost:5173/dossier/petits-colis/depute/[À REMPLIR 15 h 15 : identifiant pivot_demo]`. Sur les fixtures : `PA721578`.
4. Zoom du navigateur réglé pour le projecteur. Aucune autre fenêtre ouverte.
5. On n'ouvre jamais un lien de source pendant la démo (il part sur le site de l'Assemblée, donc sur le réseau). On ouvre le panneau « pourquoi », on montre que le lien est là, on ferme.
6. Captures d'écran de secours des cinq blocs et de la fiche, dans l'ordre du script (gel de 16 h 45).
7. Un chronomètre visible par la voix.

## Le script

### Temps 0. Ouverture (0:00 à 0:11)

Écran : onglet 1, en-tête du dossier petits colis.

> Un cabinet d'affaires publiques vend un jugement : où en est le dossier de mon client, et sur qui agir. Bascule prépare ce jugement, et montre ses preuves.

### Temps 1. Dossier rejoué, Verdict (0:11 à 1:01)

Écran : en-tête (Client, Dossier, Mesure, Objectif, À défaut, « vu au 19 nov. 2025 »), puis bloc Verdict, onglet de l'objectif principal.

> Le client : Alibaba. La mesure : la taxe de 2 euros sur les petits colis. L'objectif : empêcher qu'elle soit votée. À défaut, réduire son montant. À défaut, repousser son application.

> Nous sommes le 19 novembre 2025, la veille du vote.

La main montre le bandeau du Verdict. **[ÉCRAN]** : situation, tendance, confiance.

> Verdict proposé : défavorable, en dégradation. Confiance élevée sur les groupes. Et une inconnue, affichée : le vote de LFI.

> Ce qui marche : le RN a déposé un amendement de suppression.

**Clic** : « pourquoi » sur cette ligne. Le panneau s'ouvre (raisonnement, lien vers l'amendement).

> Pourquoi ? La source, sur le site de l'Assemblée, et le raisonnement. Ce bouton est sur chaque ligne.

**Clic** : Échap.

> Ce qui coince : le gouvernement prépare un compromis sur le mode de paiement, qui lève la réserve de LFI. C'est cet événement qui a fait bouger le verdict.

La main montre « Ce qui a fait bouger le verdict ».

### Temps 2. Action, puis un député (1:01 à 1:53)

**Clic** : défilement jusqu'au bloc Action (on passe Nouveautés et Suite sans s'arrêter).

> Action. Ceux qui décident : le gouvernement, le rapporteur général, chacun avec sa position.

> Puis trois groupes de députés : sur qui agir encore, les alliés à protéger, les perdus. Un député n'est classé que sur ce qu'il a dit, déposé ou voté. Jamais sur son groupe seul.

La main descend aux arguments. **[ÉCRAN]** : premier argument de chaque colonne. Si l'écran affiche autre chose que la phrase ci-dessous, on lit l'écran.

> Les arguments entendus. Contre la taxe : elle pèse sur les ménages modestes. Pour : environ 500 millions d'euros de recettes. Et les contre-arguments à amener.

**Clic** : la ligne du député de démo, **[À REMPLIR 15 h 15 : nom du pivot_demo et colonne où il se trouve]**. Sa fiche s'ouvre.

> J'ouvre un député. Les organisations qu'il a entendues en audition. Ce qu'il a dit en séance. Ses amendements, et avec qui ils ont été travaillés.

> Ce que l'API ne structure pas, nous l'extrayons de l'open data de l'Assemblée, et nous le rendons ici.

### Temps 3. Compte rendu (1:53 à 2:06)

**Clic** : retour au dossier, défilement jusqu'au bloc Compte rendu.

> Compte rendu : quelques lignes à reprendre pour le client. Chaque chiffre est vérifié.

**Clic** : bouton « Copier ».

> Copié. Le cabinet l'adapte : le message final reste le sien.

### Temps 4. La chute, puis le dossier vivant (2:06 à 2:48)

La main ne bouge pas. La voix regarde la salle. Ce chiffre n'est pas à l'écran : le dossier est rejoué au 19 novembre, rien de postérieur n'y figure. C'est voulu.

> Ce qui s'est passé le lendemain : l'article est adopté, 208 voix contre 87. Le RN, seul groupe contre. La veille, l'outil disait défavorable.

Option, à dire seulement si le chronomètre affiche moins de 2:00 au début de la chute :

> Et l'Assemblée n'était pas la fin : le Sénat a porté la taxe de 2 à 5 euros. D'où les objectifs de repli.

**Clic** : onglet 2 (dossier vivant), bloc Verdict.

> Même outil sur un dossier en cours : la taxe sur les holdings, budget 2027. L'Assemblée a rejeté la première partie le 4 novembre. Le dossier n'est pas clos : la suite se joue au Sénat, puis en nouvelle lecture.

**[ÉCRAN]** : la main montre la situation du Verdict, puis « Dernière occasion d'agir » dans le bloc Suite. La voix ne lit pas de chiffre.

> Voici le verdict aujourd'hui, et la dernière occasion d'agir.

Seulement si une prédiction Orcet est visible à l'écran sur ce dossier (voir variante A) :

> Les prédictions Orcet nourrissent ce verdict et cette suite.

> On part du client et de son objectif. Chaque information a son pourquoi. L'outil propose, le cabinet tranche.

Fin. On ne dit rien de plus. On attend la première question.

## Chronométrage

Méthode : comptage des mots des lignes `>` à 150 mots par minute (un nombre compte pour deux ou trois mots), plus le temps des clics. Ce n'est pas un chronométrage à voix haute : celui-ci se fait à 17 h 15 et 17 h 40 sur l'app réelle.

| Temps | Mots dits | Voix | Clics | Total | Cumul |
|---|---|---|---|---|---|
| 0. Ouverture | 27 | 11 s | 0 s | 11 s | 0:11 |
| 1. Verdict | 117 | 47 s | 3 s | 50 s | 1:01 |
| 2. Action et député | 116 | 46 s | 6 s | 52 s | 1:53 |
| 3. Compte rendu | 23 | 9 s | 4 s | 13 s | 2:06 |
| 4. Chute et dossier vivant, sans les deux options | 94 | 38 s | 4 s | 42 s | 2:48 |
| Total sans option | 377 | 151 s | 17 s | 168 s | 2:48 |
| Option Sénat | 24 | 10 s | 0 s | 10 s | |
| Option Orcet | 9 | 4 s | 0 s | 4 s | |
| Total avec les deux options | 410 | 164 s | 17 s | 181 s | 3:01 |

Lecture : sans option, 12 secondes de marge. Avec l'option Orcet seule, 2:52. Avec l'option Sénat seule, 2:58. Avec les deux, on dépasse. Règle : une seule option au maximum, et l'option Sénat seulement si on est en avance.

## Ce qui est sourcé, ce qui se lit à l'écran

Les phrases du script ne contiennent que des éléments de `rendu-final.md` (section 6) et de `PLAN.md` (annexe B). Tout le reste se lit à l'écran.

| Ce qu'on dit | D'où ça vient | À vérifier sur l'app réelle |
|---|---|---|
| Taxe de 2 euros, petits colis, objectifs d'Alibaba | `rendu-final.md` sections 2.1 et 6, `config.json` | En-tête du dossier |
| « Défavorable, en dégradation, confiance élevée sur les groupes, inconnue sur LFI » | `rendu-final.md` section 6 ; test de référence du plan (section 9) | Le bandeau du Verdict doit dire la même chose, sinon variante I |
| Amendement de suppression du RN | `rendu-final.md` section 6, amendement n° 806, URL réelle | Ligne présente dans « Ce qui marche », « pourquoi » ouvre |
| Compromis du gouvernement sur le mode de paiement | `rendu-final.md` section 6 | Ligne présente dans « Ce qui coince » et dans « Ce qui a fait bouger le verdict » |
| Ménages modestes ; environ 500 millions d'euros | `rendu-final.md` section 6 | Arguments réellement extraits par A2, sinon variante B |
| 208 voix contre 87, RN seul groupe contre | `rendu-final.md` section 6, source LCP : https://lcp.fr/actualites/budget-2026-les-deputes-approuvent-la-taxe-de-deux-euros-sur-les-petits-colis-417170 | Dit à l'oral, pas à l'écran |
| Sénat : de 2 à 5 euros | `rendu-final.md` section 6, source KPMG : https://kpmg.com/av/fr/avocats/eclairages/2025/12/plf-2026-mesures-adoptees-au-senat-en-1e-lecture.html | Dit à l'oral, pas à l'écran |
| Première partie du budget 2027 rejetée le 4 novembre | `PLAN.md` annexe B (scrutin VTANR5L17V9759) | Événement présent dans Nouveautés ou Verdict du dossier vivant |
| « La suite se joue au Sénat, puis en nouvelle lecture » | `PLAN.md` sections 1 et 2 ; dates non vérifiées (section 11) | Bloc Suite de P2 ; ne citer aucune date qui n'est pas à l'écran |

Valeurs affichées par les fixtures (jeu de repli, **députés et numéros fictifs**, sauf le n° 806) et emplacements pour les données réelles :

| Élément | Fixtures | Données réelles |
|---|---|---|
| Petits colis, objectif 1 : situation | Défavorable | [À REMPLIR 15 h 15] |
| Petits colis, objectif 1 : score | 12 % (le plan donnait 18 % en exemple) | [À REMPLIR 15 h 15] |
| Petits colis, objectif 1 : tendance | en dégradation | [À REMPLIR 15 h 15] |
| Petits colis, objectif 1 : confiance | élevée ; inconnu : vote de LFI | [À REMPLIR 15 h 15] |
| Petits colis : décideurs | gouvernement (pour), rapporteur général (pour), chef de file RN (contre), président de commission (position inconnue) | [À REMPLIR 15 h 15] |
| Petits colis : député de démo | `PA721578`, « Député Test B », colonne « Alliés à protéger », 2 auditions, 3 citations, 2 amendements, 2 organisations HATVP | [À REMPLIR 15 h 15 : livrable 3] |
| Petits colis : compte rendu | badge « vérifié » | [À REMPLIR 15 h 45] |
| Holdings, objectif 1 : situation | Favorable, en amélioration, confiance moyenne | [À REMPLIR 15 h 15] |
| Holdings : dernière occasion d'agir | nouvelle lecture à l'Assemblée, date non fixée | [À REMPLIR 15 h 15] |
| Holdings : Orcet visible | non dans Suite (aucune prédiction) ; cité dans un « pourquoi » du Verdict | [À REMPLIR 15 h 15] |

Le score ne se dit pas à l'oral. Raison : il n'est pas connu avant 15 h 15, et un pourcentage dit vite s'entend comme « la probabilité que la loi passe », ce qu'il n'est pas. Si le jury le demande : réponse dans `demo/jury.md`.

## Variantes

`status/P0.md` ne contient pas encore la décision de 13 h 35. Chaque cas prévu a sa variante. À 13 h 35, on barre celles qui ne s'appliquent pas.

### A. Orcet absent (pas de prédiction sur les amendements sans scrutin, ou service indisponible)

Repli du plan : Verdict et Suite sans Orcet, sur les positions des groupes et les amendements.

- Temps 4 : on ne dit pas la phrase Orcet. On dit à la place :

> Ce verdict s'appuie sur les votes des groupes et sur les amendements déposés.

- On ne dit jamais « Orcet ne sait pas faire ». Si le jury demande : « Nous n'avons pas obtenu de prédiction sur ces amendements aujourd'hui. Le verdict tient sans, et il le dit dans sa confiance. »
- Le centre de la démo reste le dossier rejoué. Le dossier vivant se réduit à ses deux premières phrases et au geste sur le Verdict.
- Si une ligne de Suite affiche « sans prédiction », on ne la cache pas : c'est la règle « on écrit ce qu'on ignore ».

### B. Arguments pauvres (peu d'arguments extraits, ou mal classés pour et contre)

Repli du plan : ne garder que les arguments avec citation et orateur identifié.

- S'il reste au moins un argument de chaque côté : le script ne change pas, on lit l'écran.
- S'il reste un seul côté, ou un seul argument : on remplace la phrase des arguments par :

> Un argument entendu en séance, avec sa citation, son orateur et sa source.

  **Clic** : « pourquoi » sur cet argument, puis Échap. On ne parle pas des contre-arguments.
- S'il ne reste aucun argument : on supprime la phrase. On gagne dix secondes pour la fiche du député.

### C. Fiche vide (le député de démo n'a ni audition ni citation, ou peu d'auditions partout)

- On change de député : la fiche avec le plus de blocs remplis et au moins une audition ou une citation (livrable 3, 15 h 15). À égalité, on prend un député de la colonne « Sur qui agir encore ».
- Si aucune fiche n'a d'audition : on ne parle pas d'auditions. On dit :

> J'ouvre un député. Ce qu'il a dit en séance. Ses amendements, et avec qui ils ont été travaillés. Et ce que la fiche n'a pas trouvé, elle l'écrit.

  La main montre la ligne de couverture du bloc vide.
- Si aucune fiche n'est présentable : on ne clique pas. On reste dans le bloc Action, **clic** « pourquoi » sur un député de « Sur qui agir encore », et on dit :

> Pourquoi ce député est ici : ce qu'il a lui-même voté ou déposé, avec la source.

  On supprime la phrase sur l'API.
- Un député grisé (« fiche en cours ») ne se clique jamais.

### D. Pas d'avis du rapporteur ni du gouvernement dans l'API

- Temps 2 : on garde « chacun avec sa position » seulement si une position est affichée pour les deux. Sinon :

> Action. Ceux qui décident : le gouvernement, le rapporteur général. Quand leur position n'est pas connue, c'est écrit.

### E. Décideurs incomplets (chef de file par groupe introuvable)

- La phrase du script ne cite que le gouvernement et le rapporteur général : elle ne change pas. On ne dit pas « chef de file » si la ligne n'est pas à l'écran.

### F. Le front n'est pas prêt (un bloc vide ou en erreur à 16 h 45)

Repli du plan : démo sur Verdict et Action, le reste en captures.

- Bloc Compte rendu absent : on supprime le temps 3. On passe du député à la chute.
- Fiche du député absente : variante C, troisième cas.
- Dossier vivant absent : après la chute, on reste sur le dossier rejoué et on conclut. On dit :

> Le même tableau de bord tourne sur un dossier en cours, la taxe sur les holdings du budget 2027 : il est dans le dépôt.

  Seulement si c'est vrai à 16 h 45.
- Une capture se présente comme une capture : « capture de 16 h 45 ».

### G. Featherless indisponible (textes en gabarit)

- Les badges affichent « gabarit » au lieu de « vérifié ». Temps 3 : on dit « chaque chiffre est vérifié » seulement si le badge « vérifié » est à l'écran. Sinon :

> Compte rendu : quelques lignes à reprendre pour le client, ici produites par un gabarit.

- On ne dit jamais « rédigé par le modèle » devant un badge « gabarit ».

### H. Démo sur les fixtures (la bascule sur données réelles n'a pas eu lieu)

- Les députés s'appellent « Député Test » et leurs citations sont inventées. On le dit dès l'ouverture, après la deuxième phrase :

> Les données à l'écran sont un jeu de démonstration : les députés et les citations sont fictifs. Le vote, lui, est réel.

- On ne lit aucune citation à voix haute. On ne cite aucun numéro d'amendement, sauf le n° 806 qui est réel.
- La chute reste vraie et se dit telle quelle.

### I. Le Verdict du dossier rejoué ne dit pas « défavorable »

Risque du plan : verdict mécanique contre-intuitif, ajustement par P3 avant 15 h 15.

- On lit l'écran, pas le script. La dernière phrase de la chute devient : « La veille, l'outil disait [ÉCRAN]. »
- Si l'écran dit « incertaine » ou « pas assez d'information », on ne dit pas que l'outil avait vu juste. On dit :

> La veille, l'outil ne tranchait pas, et il écrivait pourquoi.

- Si l'écran dit « favorable » : on ne fait pas la chute. On le signale à P0 avant 16 h 45.

### J. Dossier vivant : aucun scrutin nominatif sur le sujet, ou verdict « pas assez d'information »

- On ne s'excuse pas. On dit :

> Ici l'outil répond : pas assez d'information pour conclure. Il a le droit de le dire, et il dit ce qui manque.

### K. Client du dossier vivant non confirmé

- Le script ne nomme pas le client du dossier vivant. Si le jury demande : on lit l'en-tête. On précise que c'est un client d'exemple, choisi parmi les organisations déclarées à la HATVP sur le sujet.

## Coupes si le chronomètre dépasse

Dans cet ordre, chacune gagne environ dix secondes :

1. L'option Sénat (jamais dite si on est en retard).
2. La phrase sur les arguments entendus.
3. Le clic « Copier » et sa phrase : on montre le bloc, on dit la première phrase seulement.
4. La phrase « Ceux qui décident ».

On ne coupe jamais : le « pourquoi » du temps 1, la fiche du député, la chute, la dernière phrase.

Repère : la chute commence à 2:06 et il reste 42 secondes après elle. Si le chronomètre dépasse 2:15 au début de la chute, on ne dit pas « Voici le verdict aujourd'hui » : la main montre le Verdict et la Suite pendant la phrase sur le Sénat, et on conclut.

## Ce qu'on ne dit jamais à l'oral

- « Probabilité que la loi passe » pour un score ou pour une prédiction d'amendement. Orcet donne la moyenne des probabilités individuelles de voter pour, pas une probabilité d'adoption.
- « Adopté » pour un vote en commission.
- « C'est fini » après un vote de l'Assemblée : il reste le Sénat et la nouvelle lecture.
- « Rejeté » pour un amendement retiré, tombé, non soutenu ou irrecevable. On lit le sort affiché.
- « Influençable », « retournable ». On dit « sur qui agir encore », et pourquoi.
- Une phrase sur ce qu'Atlas ne fait pas. On parle de ce que nous faisons. Si `demo/terrain.md` contient une réponse de l'équipe Hémicycle, on peut la citer comme telle : « vous nous avez dit ce matin que ».
- Si `demo/terrain.md` ou P1 contredit la phrase « ce que l'API ne structure pas », on la remplace par :

> Tout cela vient de l'open data de l'Assemblée : rapports, comptes rendus, amendements.

## Ordre de démo

Ordre de la section 8 du plan, inchangé : Verdict, Action, député, Compte rendu sur le dossier rejoué ; chute ; Verdict du dossier vivant. À confirmer ou ajuster à 15 h 15 sur les données réelles (livrable 3).
