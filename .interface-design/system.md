# LegiSpot — système d’interface

## Intention produit

LegiSpot est un outil de travail pour un consultant en affaires publiques qui doit retrouver une preuve officielle, comprendre une situation parlementaire et préparer une action en quelques minutes. L’interface doit évoquer un **registre parlementaire contemporain** : précise, dense, calme et traçable. Le contenu officiel domine le décor.

### Territoire

- Dossier, texte, article, amendement, scrutin.
- Séance, étape, statut, groupe, auteur.
- Source officielle, preuve, traçabilité, date de référence.
- Index, registre, table de travail, répertoire.
- Lecture rapide, comparaison, filtrage, ouverture du document original.

### Monde chromatique

Le produit reprend les matières d’un espace documentaire institutionnel : papier ivoire (`--bg`), feuille blanche (`--surface`), intercalaires pierre (`--surface-2` / `--surface-3`), encre presque noire (`--text`), graphite (`--text-2`), bleu de renvoi officiel (`--accent`), vert/ambre/rouge uniquement pour les états. Ne pas introduire d’autre couleur décorative.

### Signature

La signature de LegiSpot est la **ligne documentaire traçable** : type de pièce discret, intitulé fort, contexte parlementaire compact, statut lisible et accès direct à la source officielle. Ce motif remplace les grandes cartes génériques et doit rester reconnaissable dans la Base documentaire, les Sources et les listes de preuves.

### Défauts explicitement rejetés

- Grandes cartes pour une ou deux lignes → index continu et lignes alignées.
- Grilles de tuiles SaaS interchangeables → registre documentaire organisé par nature de pièce.
- Multiplication de bordures/ombres → une surface principale, séparateurs doux et rythme vertical.
- En-têtes répétant le dossier → contexte en une ligne secondaire, navigation globale comme source de vérité.
- Majuscules intégrales décoratives → casse française normale partout.

## Fondations existantes à conserver

Les valeurs de `web/src/tokens.css` sont la source de vérité. Aucun composant ne doit créer une palette ou une échelle parallèle.

- Police : `--font` (Inter et fallback système), avec chiffres tabulaires pour compteurs, dates, numéros et probabilités.
- Échelle : label `12`, secondaire `13`, corps `14`, carte `16`, section `20`, page `28` px.
- Graisses : corps `400`, libellé `500`, titre `600`, titre de page `700`.
- Texte : `--text` / `--text-2` / `--text-3` pour primaire / secondaire / métadonnée.
- Espacement : grille de 4 px via `--space-1` à `--space-12`. Ne pas ajouter de valeurs arbitraires si un token couvre le besoin.
- Rayons : `--radius-sm` pour micro-contrôles, `--radius` pour contrôles, `--radius-card` pour surfaces, `--radius-pill` uniquement pour statuts.
- Focus : anneau bleu existant de 2 px ; ne jamais supprimer `:focus-visible`.

## Hiérarchie et densité

### Pages de travail

- Point focal unique : le contenu permettant l’action principale (tableau d’amendements dans la Base, verdict dans le dashboard).
- En-tête compact : titre `28/700`, contexte `13/400`, espace inférieur de 16 à 24 px.
- Section : titre `16–20/600` selon son importance ; compteur ou précision en `13/400` secondaire.
- Lignes de données : hauteur visée de 40 à 48 px, padding vertical de 8 à 12 px.
- Barre d’outils : contrôles de 36 à 40 px, recherche flexible, filtres alignés sur une seule ligne tant que la largeur le permet.
- Ruptures de rythme : 8 px à l’intérieur d’un groupe, 16 px entre groupes liés, 24–32 px entre sections majeures.

Le poids et la couleur doivent créer la hiérarchie avant d’augmenter la taille. Un titre documentaire et sa métadonnée peuvent partager une taille proche si le premier est `600/--text` et la seconde `400/--text-2`.

## Profondeur et surfaces

Stratégie unique : **séparateurs doux et décalages subtils de surface**, avec l’ombre `--shadow-card` seulement sur un conteneur principal qui doit réellement se détacher.

1. Canvas : `--bg`.
2. Surface de travail : `--surface`.
3. Zone de contrôle ou ligne en survol : `--surface-2`.
4. Popover : `--surface` + `--shadow-float`.

Éviter d’imbriquer des cartes ombrées. Préférer des lignes séparées par `--border-soft`. Les inputs sont des contrôles compacts, pas des mini-cartes. Les bordures ne doivent pas être le premier élément visible au squint test.

## Motifs documentaires

### En-tête de Base documentaire

- `Base documentaire` est le seul titre dominant.
- Le client et le dossier tiennent sur une ligne secondaire tronquable.
- Le retour au dashboard reste une action secondaire, visuellement moins forte que l’accès aux documents.
- Ne pas répéter toutes les métadonnées déjà disponibles dans le shell ou le dashboard.

### Index « Textes et articles »

- Un seul conteneur, sans cartes internes.
- Ligne texte : nature, intitulé, étape compacte, lien officiel.
- Lignes article : numéro, titre, statut ; liens officiels conservés.
- Les intitulés longs utilisent `overflow-wrap:anywhere` ou une grille `minmax(0, 1fr)` ; ne jamais déborder.
- État vide : une phrase secondaire dans le flux, sans illustration ni grande zone blanche.

### Tableau d’amendements

- Le tableau est le point focal et occupe la largeur disponible.
- Barre d’outils unique : recherche, Statut, Groupe, Nature, Tri. Aucun doublon en boutons-puces.
- Les labels de filtre sont visibles et courts ; les valeurs restent en casse normale.
- En dessous de 1100 px, la recherche peut prendre sa propre ligne ; les filtres restent regroupés et passent à la ligne proprement.
- Le tableau conserve une largeur minimale et un scroll horizontal contenu aux petits écrans plutôt que de rendre les colonnes illisibles.
- Les numéros, statuts et dates ne doivent pas concurrencer le résumé ; le résumé reçoit la majorité de l’espace.
- Survol de ligne tonal, focus visible sur chaque lien, état vide contextualisé selon les filtres.

### Sources et preuves

- L’intitulé officiel gagne par poids, la nature et l’origine restent secondaires.
- Une source ouvre toujours l’URL originale avec un libellé explicite.
- Les métadonnées techniques ne sont jamais exposées dans le flux principal.

## États et interactions

- Tout contrôle : défaut, hover, active/ouvert, focus visible, disabled.
- Hit area minimale : 40 px dans les barres d’outils ; viser 44 px sur mobile.
- Transitions uniquement sur couleur, bordure, opacité ou transform, 120–200 ms, courbe `cubic-bezier(0.23, 1, 0.32, 1)`.
- Les actions répétées (recherche, filtres, pagination) restent immédiates sans animation de contenu.
- Respecter `prefers-reduced-motion` déjà défini globalement.

## Contrôle responsive

Valider au minimum à 1440, 1280 et 1024 px :

- aucune répétition du contexte de dossier ;
- barre d’outils sans collision ni alignement approximatif ;
- noms longs sans débordement ;
- tableau dense et scroll horizontal prévisible ;
- état vide sans hauteur artificielle ;
- popovers et selects accessibles au clavier ;
- hiérarchie perceptible au squint test.

## Contrôle avant livraison

1. **Squint** : le titre, l’index puis le tableau se lisent dans cet ordre ; aucune bordure ne domine.
2. **Densité** : aucune carte n’encadre une seule ligne ; aucune section vide n’occupe une hauteur de contenu.
3. **Signature** : vérifier la ligne documentaire dans le texte, l’article, la source, la preuve et le résultat filtré.
4. **Tokens** : aucune nouvelle couleur, ombre, taille typographique ou rayon hors tokens sans justification documentée ici.
5. **Contenu réel** : tester les deux dossiers, les listes longues, les listes vides, les intitulés longs et les filtres ouverts.

## Points de cohérence à surveiller ailleurs

- `views/sources/sources.css` utilise déjà une structure de répertoire, mais ses lignes à `padding: 17px 24px` sont plus aérées que l’index documentaire ; les rapprocher du motif 12–16 px lors d’une prochaine intervention ciblée.
- `views/depute/p7.css` contient plusieurs grilles `auto-fit` et des cartes de classement indépendantes ; vérifier les dernières lignes incomplètes et éviter que les cartes secondaires concurrencent la fiche du député.
- `views/blocs/action/action.css` emploie une grille sur six pistes pour équilibrer les réponses ; préserver cette logique adaptative et ne pas revenir à une grille naïve de trois colonnes.
- Le dashboard et Verdict ont une hiérarchie spécifique déjà travaillée : réutiliser les tokens et la retenue de surface sans leur imposer la densité tabulaire de la Base.
