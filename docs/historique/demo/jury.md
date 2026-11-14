> Document de préparation de la démonstration (14 novembre 2026). Des dates et des chiffres ont pu évoluer depuis : la référence est le [README](../../../README.md).

# Jury joué : notes, objections, réponses

Version 2, 14 novembre 2026, 14 h 35. On joue le jury Hémicycle : des organisateurs qui vendent Atlas aux mêmes cabinets, et qui connaissent leurs propres données mieux que nous.

**Statut : notes faites sur les fichiers réels, pas sur l'app.** X1 n'a pas pu ouvrir l'app. Les notes portent sur ce que les blocs affichent d'après les fichiers de `data/` (relevé de 14 h 25, front en `dataset: live`) et d'après le code des blocs dans `web/src/`. La mise en page, la lisibilité au projecteur et les clics ne sont pas jugés ici : ils le seront aux répétitions de 17 h 15 et 17 h 40 (section 8). Les sessions P3, A4 et P8 régénèrent encore leurs fichiers : un défaut noté ici peut avoir disparu à 16 h 45.

## 1. Notes par bloc (1 à 5)

| Bloc | Clarté | Source visible | Crédibilité |
|---|---|---|---|
| Verdict | 4 | 4 | 3 |
| Nouveautés | 3 | 4 | 2 |
| Suite | 4 | 3 | 4 |
| Action (avec la fiche d'un député) | 3 | 5 | 3 |
| Compte rendu | 3 | 4 | 3 |
| En fond : état de la mesure, base | 4 | 4 | 4 |

### Verdict : 4, 4, 3

Lu dans `verdict.json` et `etat.json` des deux dossiers.

- Clarté : le bandeau dit la situation, la tendance, la confiance, avec deux listes « établi » et « inconnu ». Le chiffre porte son libellé : « 26 % des sièges favorables à l'objectif ». En tête, deux lignes séparées : l'état de la mesure et l'état du texte. Une phrase de lecture, vérifiée.
- Source visible : chaque raison a sa preuve. L'amendement n° 806 ouvre sa page sur le site de l'Assemblée. Point faible : les positions des groupes (« 7 groupes pour la mesure ») renvoient à l'archive complète des amendements, pas à une liste précise. Un professionnel ne peut pas l'ouvrir.
- Crédibilité, points forts : la confiance « moyenne » est honnête (aucun scrutin public sur la mesure avant le 18 novembre) et les trois groupes sans position lisible sont écrits (LFI-NFP, UDR, GDR).
- Crédibilité, points faibles :
  1. Petits colis : la ligne « Ce qui a fait bouger le verdict » (dépôt du n° 974) s'affiche alors que la tendance est « stable ». On ne la montre pas pendant la démo.
  2. Petits colis : EPR est compté parmi les 7 groupes pour la mesure, alors que son chef de file présumé est « contre » dans le bloc Action et qu'un amendement EPR (n° 460) figure dans « Ce qui marche » de l'objectif de repli.
  3. Petits colis, objectif 3 : la lecture dit que la mesure « s'oppose à 7 groupes ». La phrase est à l'envers.
  4. Holdings : la lecture commence par « Au Sénat, en première lecture » et compte ensuite 7 groupes contre 4. Ce sont des groupes de l'Assemblée. Elle dit aussi « la mesure est favorable à l'Afep » au lieu de « la situation ».
- Ce qui ferait monter la note : un lien vers la liste des amendements de chaque groupe, et la lecture holdings corrigée.

### Nouveautés : 3, 4, 2

Lu dans `nouveautes.json`. Ce bloc n'est pas montré dans la démo.

- Clarté : tri par importance, effet sur le verdict en un mot. Petits colis : 70 événements, 5 qui comptent. Quatre de ces cinq sont des dépôts d'amendements de suppression identiques : le haut de la liste se répète.
- Source visible : un lien précis par événement.
- Crédibilité : **les dates.** Sur les petits colis, les dépôts et les sorts importants sont tous datés du 18 novembre 2025, par repli. Or `texte.json` donne maintenant la vraie date : le n° 806 est déposé le 21 octobre, le n° 974 le 17 octobre. Un bloc qui répond à « que s'est-il passé hier » avec une date fausse d'un mois, c'est ce qu'un professionnel voit en premier.
- Holdings : 84 événements, 4 qui comptent, chacun avec son scrutin et sa date. Nettement mieux.
- Si on nous y emmène : « l'événement est publié, l'effet est notre lecture, et le pourquoi le dit ».

### Suite : 4, 3, 4

Lu dans `suite.json`.

- Clarté : dernière occasion d'agir en tête (petits colis : séance du 19 novembre 2025, examen de l'article 22), puis les échéances, puis ce qui a le plus de chances d'arriver.
- Source visible : les échéances viennent de l'agenda de l'Assemblée, avec l'identifiant de la réunion dans le raisonnement. Le lien, lui, pointe vers le dossier ou vers l'archive, pas vers la réunion.
- Crédibilité : en nette hausse depuis la version 1. Les issues probables sont dites en mots, avec « sièges des groupes selon leur position, pas une probabilité ». Plus aucun pourcentage converti. Les dates inconnues du Sénat et de la commission mixte paritaire sont écrites comme inconnues.
- Point faible : sur les petits colis, l'échéance du 19 novembre cite comme source le scrutin n° 3987, daté du 19. Dans un dossier vu au 18, ce lien mène au résultat du vote. On n'ouvre pas ce « pourquoi » pendant la démo.
- Holdings : dernière occasion d'agir = examen au Sénat, date non publiée. Trois échéances sans date. C'est maigre, mais c'est vrai.

### Action et fiche d'un député : 3, 5, 3

Lu dans `action.json`, `groupes-action.json` et `fiches/`.

- Clarté : 11 décideurs, trois colonnes de 15, 13 et 15 députés, 17 arguments, 9 contre-arguments. Lisible si la voix guide, dense sinon.
- Source visible : le meilleur bloc. Chaque argument a sa citation exacte, son orateur, sa date, son lieu, son compte rendu. Chaque classement a ses amendements en preuve.
- Crédibilité, points faibles :
  1. **« Sur qui agir encore ».** Les 15 députés de cette colonne ont tous agi pour la mesure. Ils y sont parce que leur loyauté à leur groupe est sous 0,85, pas pour un acte en faveur du client. On y trouve le rapporteur général et Michel Barnier. C'est le point le plus exposé du bloc (objection 2).
  2. « Alliés à protéger » : la colonne contient des députés qui sont contre la taxe parce qu'ils la jugent trop faible ou mal conçue. Contre la mesure ne veut pas dire allié du client.
  3. « Chef de file » : c'est une déduction (l'auteur le plus actif de son groupe sur le sujet), pas une désignation publiée. Le « pourquoi » le dit, le libellé non.
  4. Contre-arguments : ils reprennent tous les deux mêmes idées. L'un finit par une phrase sans rapport sur l'amendement n° 191.
  5. Arguments : un argument « pour » est daté d'avril 2025, avant le projet de loi. Un autre a un libellé que sa citation ne dit pas.
  6. « Position inconnue » : 410 députés dans `groupes-action.json`, aucun dans `action.json`. La quatrième liste reste vide à l'écran.
- Fiche d'Antoine Vermorel (`PA794118`), la fiche de démo :
  - Synthèse : « probablement favorable à la taxe ». Cohérente avec ses actes.
  - Débats : 4 citations exactes, commission des finances du 22 octobre 2025.
  - Amendements : 11, avec six sorts différents affichés tels quels (adopté, rejeté, tombé, retiré, en attente, non examiné). C'est une bonne preuve qu'on ne mélange pas les sorts. Attention : le n° 719 est affiché « adopté », et c'est un vote en commission. Si le jury le relève : « Adopté en commission des finances le 22 octobre, sans effet sur le texte examiné en séance : l'état de la mesure le dit. »
  - Auditions : 9 rapports, tous en rôle « membre ». La liste est repliée sous « Entendues par les rapporteurs de sa commission ». Ces auditions portent sur le budget, pas sur les petits colis. On ne dit jamais qu'il les a entendues.
  - HATVP : 34 organisations déclarées sur le texte, la même liste sur toutes les fiches. On ne dit jamais qu'il les a rencontrées.

### Compte rendu : 3, 4, 3

Lu dans `note.json`.

- Petits colis (rédigé par le modèle, vérifié, 130 mots) : le score est écrit « 26 % des sièges favorables », plus aucune « chance » ni « probabilité ». Trois défauts : « tendance stable » puis « la situation s'est dégradée le 18 novembre 2025 » dans la phrase suivante ; cette date est une date de repli ; « Il faut cibler le gouvernement » est un conseil, pas un constat.
- Holdings (gabarit, 229 mots) : une suite de champs, pas un texte. Il annonce la commission mixte paritaire comme prochaine date, avant le Sénat. Il reprend le libellé de mesure de la configuration (« article 3 », « n° 3140 »), que P3 a mesuré comme faux. On ne montre pas ce compte rendu.
- Source visible : chiffres soulignés, sources numérotées, badge « vérifié » ou « gabarit ».
- Dans la démo : la voix ne lit pas le texte. Elle dit à quoi il sert, et la main copie.

### En fond : 4, 4, 4

Lu dans `etat.json` et `texte.json`. Non montré dans la démo, utile en réponse.

- L'état du texte est maintenant séparé de l'état de la mesure. Holdings : mesure « absente du texte », texte « première partie rejetée » le 4 novembre 2026, scrutin n° 9759.
- Chaque amendement a sa nature (supprime, réduit, reporte, aggrave, autre), sa date de dépôt et son sort exact. L'amendement de la commission (n° 1859) est là, avec son auteur.
- Le compromis du gouvernement n'y est pas : il est déposé le 19 novembre, le dossier est vu au 18. C'est cohérent, et c'est une bonne réponse à l'objection 3.
- Point faible : sur le dossier holdings, l'en-tête affiche le libellé de la configuration (« article 3 », « n° 3140 ») alors que l'état dit « aucun article du texte du gouvernement ».

## 2. Les trois objections les plus probables

Une phrase de réponse chacune. On répond, on se tait.

1. **« Votre verdict, c'est un chiffre de plus sorti d'une boîte noire. »**
   Réponse : « La règle tient en trois phrases, elle est mécanique, chaque raison affichée ouvre sa source, et c'est une proposition : le cabinet tranche. »

2. **« Vous classez le rapporteur général et Michel Barnier dans "sur qui agir encore", alors qu'ils défendent la taxe. »**
   Réponse : « La raison est écrite sous chaque nom : ils ont agi pour la mesure et votent moins souvent avec leur groupe que le seuil ; c'est une déduction, marquée comme telle, jamais un fait, et c'est le cabinet qui décide s'il les appelle. »
   Si le jury insiste : « C'est la règle la plus fragile du bloc, et c'est pour cela que la preuve est sous chaque nom. »

3. **« Rejouer un dossier clos, c'est facile : vous connaissiez la fin. »**
   Réponse : « Le dossier est rejoué avec les seules données datées au plus tard du 18 novembre 2025 : le compromis du gouvernement, déposé le 19, n'y est pas, et la confiance est "moyenne" parce qu'aucun scrutin n'avait eu lieu ; le même outil tourne sur un dossier en cours. »

## 3. La question piège : « Vous avez refait Atlas »

Règle absolue : on ne dit rien sur Atlas. On ne l'a pas utilisé. On parle de ce que nous faisons.

Réponse en une phrase :

> Nous ne sommes pas partis de la donnée mais d'un client et de ce qu'il veut obtenir : votre API est notre socle, et nous y ajoutons un verdict par objectif, le pourquoi derrière chaque ligne, et ce que nous sommes allés chercher dans l'open data de l'Assemblée.

Si le jury insiste (« Atlas le fait déjà ») :

> Tant mieux si c'est le cas : nous n'avons pas vu Atlas de l'intérieur. Ce que vous voyez a été construit cet après-midi sur votre API et sur l'open data, pour un cabinet qui raisonne par dossier et par objectif.

Si `demo/terrain.md` (écrit par Axel, absent du dépôt à 14 h 25) contient une réponse de l'équipe Hémicycle : on la cite telle quelle (« vous nous avez dit ce matin que »), sans rien y ajouter.

## 4. « Le verdict, c'est quoi la règle ? »

Source : `PLAN.md` section 5.15, et les pondérations retenues par P3 (`status/P3.md`, `verdict.json`, champ `meta.limits`).

En une phrase :

> On regarde de quel côté penche chaque groupe sur cette mesure, on additionne les sièges qui vont dans le sens du client, et trois seuils affichés donnent la situation ; ce n'est pas la probabilité que la loi passe.

En mots simples, si on nous laisse trente secondes :

> On regarde chaque groupe : de quel côté penche-t-il sur cette mesure ? D'abord ses votes sur les scrutins liés. À défaut, ses amendements.
> On additionne les sièges des groupes qui vont dans le sens du client, et on les rapporte aux sièges de tous les groupes dont la position est connue. Un groupe divisé compte pour moitié.
> À partir de 55 % : favorable. Sous 40 % : défavorable. Entre les deux : incertaine. Si moins de trois groupes ont une position connue, l'outil dit « pas assez d'information ».
> La tendance compare ce calcul à celui d'il y a sept jours. La confiance dit d'où viennent les positions : élevée si ce sont des scrutins publics sur le sujet, moyenne si ce sont des amendements.
> Pour les objectifs de repli, même règle, sur les amendements qui réduisent ou reportent la mesure.

Si le jury demande « et Orcet dans la règle ? » : « La règle prévoit de corriger ce calcul avec la moyenne Orcet des amendements en attente qui portent la position du client. Aujourd'hui il n'y en a sur aucun des deux dossiers, donc le chiffre affiché ne contient pas d'Orcet, et c'est écrit dans les limites du verdict. »

## 5. « C'est quoi ce chiffre à côté du verdict ? »

En une phrase :

> C'est la part des sièges favorables à l'objectif du client : un rapport de forces à l'Assemblée, pas une probabilité.

Si on nous laisse quinze secondes, sur les petits colis :

> Un seul groupe va dans le sens du client, le RN, 121 sièges. Sept groupes sont pour la mesure, 338 sièges. 121 sur 459, c'est le chiffre affiché. Les trois groupes dont la position n'est pas lisible ne sont pas comptés, et c'est écrit dans « inconnu ».

Sur le dossier holdings, même calcul : 370 sièges dans le sens du client, 193 en face.

Ce qu'on ne dit jamais : « 26 % de chances », « probabilité de succès », ni le pourcentage seul collé à « mal engagé » ou à « défavorable ». Si on cite le chiffre, on dit toujours « des sièges favorables à l'objectif ».

Si le jury demande « ce chiffre avait-il prévu le vote ? » : « Il ne prévoit pas un vote. La veille, il disait que le rapport de forces était contre le client, et le verdict proposé était défavorable. »

## 6. Autres questions possibles, réponse courte

| Question | Réponse |
|---|---|
| « Qu'est devenu le texte après le vote de l'article ? » | « L'Assemblée a rejeté la première partie du budget le 21 novembre 2025, par 404 voix contre, une pour et 84 abstentions. L'article était adopté, le projet rejeté en première lecture, et la navette a continué au Sénat. » (`status/P3.md`, scrutin n° 4241) |
| « Et le compromis du gouvernement ? » | « Déposé et adopté le 19 novembre, donc absent d'un dossier vu au 18. Il apparaîtrait dès le lendemain. » (`status/P1.md`, `status/P3.md`, amendement n° 4086) |
| « Et l'amendement de suppression, il a donné quoi ? » | « Rejeté en séance le 19 novembre. » (`status/P2.md`, scrutin n° 3987 ; ne dire les voix qu'après les avoir relues dans le scrutin ; à dire seulement après la chute) |
| « Les auditions de la fiche ont un rapport avec les petits colis ? » | « Pas forcément : ce sont les personnes entendues par les rapporteurs de sa commission sur ce budget. La fiche les met à part, et réserve "a entendu" au député qui était lui-même rapporteur. » |
| « Vous dites qu'il a rencontré ces lobbies ? » | « Non. Le bloc HATVP liste les organisations qui ont déclaré une action sur ce texte. Il ne dit pas qui elles ont vu. » |
| « Classer des députés en perdus, c'est risqué. » | « Un député n'est classé que sur ce qu'il a lui-même dit, déposé ou voté, la preuve est sous son nom, et le cabinet tranche. » |
| « Qui vérifie ce qu'écrit le modèle ? » | « Le modèle ne voit aucun vote, chaque nombre de son texte doit exister dans les données du dossier, sinon le texte est remplacé par un gabarit, et le badge le dit. » |
| « Vos auditions sont complètes ? » | « Non, et la fiche l'écrit : elle affiche combien de rapports ont été lus et combien publient la liste des personnes entendues. » |
| « Et Orcet ? » | « Aucune prédiction sur ces deux mesures aujourd'hui. Si nous en affichions une, ce serait sous son vrai nom, la moyenne des probabilités de vote pour, jamais une probabilité d'adoption. » (`status/P2.md`, `status/P3.md`) |
| « Comment trouvez-vous la mesure dans un texte ? » | « Aujourd'hui elle est déclarée à la main dans la configuration et suivie par son article et ses mots-clés ; l'identification automatique est la suite. » |
| « Sur les holdings, la taxe est dans quel article ? » | « Dans aucun article du texte du gouvernement. Douze amendements de séance la créaient, aucun n'a été adopté, puis l'Assemblée a rejeté le texte. Elle peut revenir par amendement au Sénat ou en nouvelle lecture. » (`plf2027-holdings/etat.json`) |
| « Et le Sénat ? » | « Hors des données aujourd'hui : la Suite l'affiche comme échéance, sans date, et le dit. » |
| « Pourquoi ce client sur le dossier vivant ? » | « C'est un client d'exemple, choisi parmi les organisations déclarées à la HATVP sur le sujet. » |
| « Votre courbe de cohésion prédit les censures ? » | « Non : sur la paire RN et EPR, un décrochage sur sept a été suivi d'une censure ; elle donne le contexte, pas une alerte. » (`status/P2.md`) |
| « Combien de crédits avez-vous consommés ? » | « Environ 570 à 14 h 25 : 557 pour la collecte, 10 pour les fiches. L'essentiel vient de l'open data, qui est gratuit. » (`status/P1.md`, `status/A4.md` ; à relire à 16 h 45) |
| « C'est en ligne ? » | « Non, site statique servi en local aujourd'hui. » |

## 7. Signalements aux autres sessions

X1 ne possède que `demo/`. La liste à jour est dans `status/X1.md`, section « Signalé à P0 ». Les trois qui touchent la démo :

1. Bloc Action, colonne « Sur qui agir encore » : classement sur la seule loyauté de groupe (P3).
2. Lecture du verdict holdings : « Au Sénat » avec des groupes de l'Assemblée (P3, X3). Elle est à l'écran pendant dix secondes.
3. En-tête du dossier holdings : libellé de mesure de la configuration, contredit par l'état de la mesure (P0).

## 8. Répétitions (à faire, pas encore faites)

Deux répétitions chronométrées sur l'app réelle, à 17 h 15 et 17 h 40, après le gel de 16 h 45. Rien n'est rempli ci-dessous tant qu'elles n'ont pas eu lieu.

| | Répétition 1, 17 h 15 | Répétition 2, 17 h 40 |
|---|---|---|
| Temps 0, ouverture (cible 0:11) | | |
| Temps 1, Verdict (cible 0:58) | | |
| Temps 2, Action et député (cible 1:46) | | |
| Temps 3, Compte rendu (cible 1:58) | | |
| Temps 4, chute et dossier vivant (cible 2:52) | | |
| Total (limite 3:00) | | |
| Variantes appliquées | | |
| Clics ratés, écrans lents | | |
| Corrections reportées dans `script.md` | | |

Notes par bloc refaites sur l'app réelle :

| Bloc | Clarté | Source visible | Crédibilité | Remarque |
|---|---|---|---|---|
| Verdict | | | | |
| Nouveautés | | | | |
| Suite | | | | |
| Action et fiche | | | | |
| Compte rendu | | | | |
