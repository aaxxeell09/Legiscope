# Jury joué : notes, objections, réponses

Version 1, 14 novembre 2026, 13 h 25. On joue le jury Hémicycle : des organisateurs qui vendent Atlas aux mêmes cabinets, et qui connaissent leurs propres données mieux que nous.

**Statut : notes à blanc.** À cette heure les cinq blocs sont vides dans l'app. Les notes portent sur ce que les blocs afficheront d'après les fixtures (`contracts/fixtures/`) et les consignes des sessions P5, P6, P7. Elles sont à refaire sur l'app réelle à la répétition de 17 h 15 (section 7). Aucune réponse ci-dessous ne cite un chiffre qui ne vient pas du plan, du rendu final ou des fixtures.

## 1. Notes par bloc (1 à 5)

| Bloc | Clarté | Source visible | Crédibilité |
|---|---|---|---|
| Verdict | 4 | 4 | 3 |
| Nouveautés | 4 | 4 | 3 |
| Suite | 4 | 3 | 2 |
| Action (avec la fiche d'un député) | 3 | 5 | 4 |
| Compte rendu | 3 | 4 | 3 |
| En fond : état de la mesure, base | 4 | 4 | 4 |

### Verdict : 4, 4, 3

- Clarté : trois parties lisibles (situation, tendance, confiance), un onglet par objectif, « ce qui marche » et « ce qui coince » face à face. Point faible : un score en pourcentage sans libellé à côté du mot « Défavorable ».
- Source visible : « pourquoi » sur chaque ligne. Point faible dans les fixtures : certaines preuves renvoient à une adresse générale de l'API (« Hémicycle API scrutins ») et non à un scrutin précis. Un professionnel veut ouvrir le scrutin.
- Crédibilité : la règle est mécanique et se dit en trois phrases, c'est un atout. Risque : le pourcentage se lit comme une probabilité. Risque du plan : un verdict contre-intuitif sur les petits colis.
- Ce qui ferait monter la note : un libellé sous le score (« part des sièges du côté du client »), et un lien vers chaque scrutin lié.

### Nouveautés : 4, 4, 3

- Clarté : tri par importance, effet sur le verdict écrit en un mot (renforce, affaiblit, neutre).
- Source visible : un lien par événement.
- Crédibilité : l'événement est un fait, son effet est une lecture de l'outil. Dans les fixtures les deux sont rangés ensemble sous « fait » (exemple : « le calendrier avancé montre que la majorité veut une application rapide »). Le jury peut le relever.
- Ce bloc n'est pas montré dans la démo. Si on nous y emmène : « l'événement est publié, l'effet est notre lecture, et le pourquoi le dit ».

### Suite : 4, 3, 2

- Clarté : dernière occasion d'agir en tête, puis les dates, puis ce qui a le plus de chances d'arriver.
- Source visible : les échéances renvoient à l'ordre du jour général ou à la page d'accueil du Sénat, pas à une ligne datée.
- Crédibilité : **le point le plus exposé devant ce jury.** Dans les fixtures, « Rejet de l'amendement n° 806 : 76 % » est le complément de la valeur Orcet (24 % de votes pour). Or la documentation d'Hémicycle dit elle-même : « La valeur renvoyée est la moyenne des probabilités individuelles de voter pour, pas la probabilité d'adoption du texte. » Afficher un pourcentage d'adoption ou de rejet tiré de cette valeur, c'est l'erreur que nos propres garde-fous interdisent.
- Ce qui ferait monter la note : afficher la valeur Orcet telle quelle avec son libellé exact (« moyenne des probabilités de vote pour »), et présenter « adoption probable » ou « rejet probable » en mots, comme déduction, sans pourcentage converti.
- Ce bloc est montré cinq secondes dans la démo (dernière occasion d'agir du dossier vivant). On ne s'attarde pas sur les pourcentages.

### Action et fiche d'un député : 3, 5, 4

- Clarté : beaucoup de choses sur un écran (décideurs, trois colonnes, arguments, contre-arguments). Lisible si la voix guide, dense sinon. Le score en pourcentage à côté de chaque député n'a pas de libellé.
- Source visible : le meilleur bloc. Chaque citation a son compte rendu, chaque amendement son lien, chaque classement son fondement (« a voté », « a déposé », « a dit »).
- Crédibilité : la règle « classé sur ses propres actes » et la mention « position inconnue » parlent à un professionnel. Trois risques :
  1. Un contre-argument avec un chiffre (fixtures : « 9 sur 10 ») : le jury demandera d'où il sort. Le « pourquoi » doit ouvrir la source du chiffre, pas seulement le texte de loi.
  2. « Travaillé avec » : affirmation forte sur un député. Elle n'est défendable que si l'exposé de l'amendement le dit lui-même.
  3. Bloc HATVP de la fiche : il liste les organisations déclarées sur le texte. Il ne dit pas que ce député les a rencontrées. À l'oral, on ne dit jamais « il a rencontré ».
- Ce qui ferait monter la clarté : montrer une seule colonne à la fois à l'oral, et ouvrir un seul « pourquoi ».

### Compte rendu : 3, 4, 3

- Clarté : dans les fixtures le texte parle la langue de l'outil (« loyauté de 12 mois comprise entre 0.66 et 0.81 », « confiance de 0.78 »). Un cabinet ne l'enverrait pas tel quel. C'est cohérent avec « il l'adapte », mais le jury jugera le texte affiché.
- Source visible : chiffres soulignés, sources numérotées, badge « vérifié » ou « gabarit ».
- Crédibilité : le texte des fixtures finit par « probabilité estimée 12 % » (petits colis) et « probabilité estimée que l'objectif soit atteint : 64 % » (holdings). Ce chiffre est le score du verdict, c'est-à-dire une part de sièges. L'appeler « probabilité » est le raccourci que le jury attend.
- Ce qui ferait monter la note : remplacer « probabilité estimée » par le mot de la situation (« défavorable ») dans le prompt et le gabarit du compte rendu.

### En fond : 4, 4, 4

- Non montré dans la démo. Utile en réponse : « la mesure est-elle encore dans le texte, dans quelle rédaction », et la distinction des sorts d'amendement.

## 2. Les trois objections les plus probables

Une phrase de réponse chacune. On répond, on se tait.

1. **« Votre verdict, c'est un chiffre de plus sorti d'une boîte noire. »**
   Réponse : « La règle tient en trois phrases, elle est mécanique, chaque raison affichée ouvre sa source, et c'est une proposition : le cabinet tranche. »

2. **« Vous transformez une sortie d'Orcet en probabilité d'adoption. Orcet ne dit pas ça. »**
   Réponse : « Vous avez raison sur la définition : Orcet donne la moyenne des probabilités individuelles de voter pour, nous l'affichons comme telle derrière le pourquoi, et ce que nous en tirons est marqué comme une déduction de l'outil, jamais comme la probabilité que la loi passe. »
   Condition : cette réponse n'est vraie que si l'écran le fait. Voir le signalement en section 6. Si le bloc Suite affiche encore un pourcentage converti à 16 h 45, la réponse devient : « C'est notre lecture, pas une sortie d'Orcet, et le libellé doit le dire mieux : c'est noté. »

3. **« Rejouer un dossier clos, c'est facile : vous connaissiez la fin. »**
   Réponse : « Le dossier est rejoué avec les seules données antérieures au 19 novembre 2025, rien de postérieur n'est chargé, et le même outil tourne sur un dossier en cours, la taxe sur les holdings du budget 2027. »

## 3. La question piège : « Vous avez refait Atlas »

Règle absolue : on n'affirme rien sur ce qu'Atlas ne fait pas. On ne l'a pas utilisé. On parle de ce que nous faisons.

Réponse en une phrase :

> Nous ne sommes pas partis de la donnée mais d'un client et de ce qu'il veut obtenir : votre API et Orcet sont notre socle, et nous y ajoutons un verdict par objectif, le pourquoi derrière chaque ligne, et ce que nous sommes allés chercher dans l'open data de l'Assemblée.

Si le jury insiste (« Atlas le fait déjà ») :

> Tant mieux si c'est le cas : nous n'avons pas vu Atlas de l'intérieur. Ce que vous voyez a été construit cet après-midi sur votre API et sur l'open data, pour un cabinet qui raisonne par dossier et par objectif.

Selon `demo/terrain.md` (écrit par Axel, absent du dépôt au moment d'écrire) :

- Si l'équipe Hémicycle a dit qu'Atlas n'extrait pas les auditions : on peut ajouter « vous nous avez dit ce matin qu'Atlas ne lit pas les annexes d'auditions : c'est une des choses que nous sommes allés chercher ». On cite leur réponse, on n'en rajoute pas.
- Si l'équipe a dit qu'Atlas les extrait déjà : on ne présente pas les auditions comme une différence. On dit « nous les relions à l'objectif d'un client et au classement des députés ».
- Si `demo/terrain.md` est vide ou absent : seulement la réponse en une phrase.

## 4. « Le verdict, c'est quoi la règle ? »

Source : `PLAN.md` section 5.15. À revérifier à 15 h 15 dans `status/P3.md` : le plan prévoit que P3 ajuste les pondérations si le verdict des petits colis est contre-intuitif.

En une phrase :

> C'est la part des sièges dont le groupe penche du côté du client sur cette mesure, corrigée par Orcet, avec trois seuils affichés ; ce n'est pas la probabilité que la loi passe.

En mots simples, si on nous laisse trente secondes :

> On regarde chaque groupe : de quel côté penche-t-il sur cette mesure ? D'abord ses votes sur les scrutins liés. À défaut, ses amendements. À défaut, sa discipline de vote habituelle.
> On additionne les sièges qui vont dans le sens du client. On corrige avec ce qu'Orcet prédit sur les amendements qui portent sa position.
> Au-dessus de 55 % : favorable. Entre 40 et 55 : incertaine. En dessous de 40 : défavorable. Si moins de trois groupes ont une position connue, l'outil dit « pas assez d'information ».
> La tendance compare ce score à celui d'il y a sept jours. La confiance dit d'où viennent les positions : élevée si ce sont des scrutins nominatifs sur le sujet, moyenne si ce sont des amendements, faible si c'est la discipline générale.
> Et quand le verdict bouge, l'outil montre l'événement qui l'a fait bouger. Pour les objectifs de repli, même règle, sur les amendements qui réduisent ou reportent la mesure.

Si on demande « et le chiffre à l'écran ? » : « C'est cette part de sièges, corrigée. Pas une chance de succès. »

## 5. Autres questions possibles, réponse courte

| Question | Réponse |
|---|---|
| « Classer des députés en perdus, c'est risqué. » | « Un député n'est classé que sur ce qu'il a lui-même dit, déposé ou voté, la preuve est derrière son nom, et quand on ne sait pas on écrit position inconnue. » |
| « Qui vérifie ce qu'écrit le modèle ? » | « Le modèle ne voit aucun vote, chaque nombre de son texte doit exister dans les données du dossier, sinon le texte est remplacé par un gabarit, et le badge le dit. » |
| « Vos auditions sont complètes ? » | « Non, et la fiche l'écrit : elle affiche sa couverture, combien de rapports lus, combien avec une liste d'auditions. » |
| « Comment trouvez-vous la mesure dans un texte ? » | « Aujourd'hui elle est déclarée à la main dans la configuration et suivie par ses mots-clés ; l'identification automatique est la suite. » |
| « Et le Sénat ? » | « Hors des données aujourd'hui : la Suite l'affiche comme échéance, sans prédiction, et le dit. » |
| « Pourquoi ce client sur le dossier vivant ? » | « C'est un client d'exemple, choisi parmi les organisations déclarées à la HATVP sur le sujet. » |
| « Pourquoi ce sujet ? » | « C'est le sujet unique le plus voté du budget 2027 dans notre mesure de ce matin : 27 scrutins publics sur ce budget, et 35 organisations déclarées à la HATVP. » (`PLAN.md`, annexe B). Ne pas citer de nombre d'amendements à l'oral : deux mesures diffèrent (141 dans l'annexe B, 153 dans `status/P1.md`). Si on le demande, lire la page Base. |
| « Votre courbe de cohésion prédit les censures ? » | « Non : sur la paire RN et EPR, un décrochage sur sept a été suivi d'une censure ; elle donne le contexte, pas une alerte. » (`status/P2.md`) |
| « Et l'amendement de suppression, il a donné quoi ? » | « Rejeté la même nuit. » (`status/P2.md` : « rejetée 86 contre 155 », scrutin VTANR5L17V3987, que X1 lit comme 86 pour et 155 contre ; ne dire les chiffres qu'après les avoir relus dans le scrutin ; à dire seulement après la chute) |
| « Combien de crédits avez-vous consommés ? » | [À REMPLIR : `status/P1.md`, ligne Crédits, à 16 h 45] |
| « C'est en ligne ? » | « Non, site statique servi en local aujourd'hui. » |

## 6. Signalements aux autres sessions (relevés en jouant le jury)

X1 ne possède que `demo/`. Ces points sont recopiés dans `status/X1.md` pour P0.

1. **Suite, pourcentage converti depuis Orcet** (`suite.json`, `probables[].proba`, exemple du plan en 5.17 et fixtures) : risque de crédibilité le plus fort devant Hémicycle. Sessions concernées : P2 (données), P5 (libellé).
2. **Compte rendu, « probabilité estimée »** pour le score du verdict (`note.json` des deux fixtures). Sessions concernées : X3 (prompt et gabarit), P8.
3. **Preuves qui renvoient à une adresse générale de l'API** au lieu d'un scrutin ou d'un amendement précis. Sessions concernées : P3, A4.
4. **Chiffres des contre-arguments** : le « pourquoi » doit ouvrir la source du chiffre. Sessions concernées : X3, A4.
5. **Fixtures seulement** : dans `petits-colis/fiches/PA721578.json`, le député auteur de l'amendement de suppression porte aussi une citation favorable à la taxe. Sans effet sur les données réelles. À savoir si la démo se fait sur fixtures : on n'ouvre pas la colonne Débats de cette fiche.

## 7. Répétitions (à faire, pas encore faites)

Deux répétitions chronométrées sur l'app réelle, à 17 h 15 et 17 h 40. Elles dépendent du gel du code à 16 h 45 et de la bascule sur données réelles. Rien n'est rempli ci-dessous tant qu'elles n'ont pas eu lieu.

| | Répétition 1, 17 h 15 | Répétition 2, 17 h 40 |
|---|---|---|
| Temps 0, ouverture (cible 0:11) | | |
| Temps 1, Verdict (cible 1:01) | | |
| Temps 2, Action et député (cible 1:53) | | |
| Temps 3, Compte rendu (cible 2:06) | | |
| Temps 4, chute et dossier vivant (cible 2:48) | | |
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
