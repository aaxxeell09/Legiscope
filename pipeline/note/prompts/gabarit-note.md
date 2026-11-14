# Gabarit de secours : synthèse exécutive (`note.json`)

Ce fichier est lu par `gabaritX3` dans `pipeline/note/run.ts` lorsque le modèle est indisponible ou rejeté. Les identifiants de blocs et variables ci-dessous constituent le contrat avec ce code et doivent rester présents.

Le texte reste factuel et concis. Il ne cite ni Orcet, ni compte de prédictions, ni règle de calcul, ni limite technique. Il distingue toujours la mesure du texte législatif entier. Le rejet du texte n’est jamais présenté comme le rejet de la mesure sans fait explicite. Un rapport de forces de l’Assemblée nationale n’est pas attribué au Sénat.

Ordre produit par `gabaritX3` : essentiel, éventuel repli, fait récent documenté, prochaine étape, prudence documentaire. Les blocs sans donnée métier utilisent une formulation neutre et n’inventent aucun fait.

```gabarit id=note.entete
{{client}}.
```

```gabarit id=note.verdict
Verdict proposé : situation {{situation_mot}}, tendance {{tendance_mot}}. {{lecture_1}}
```

```gabarit id=note.verdict.sans_score
Verdict proposé : situation {{situation_mot}}, tendance {{tendance_mot}}. {{lecture_1}}
```

```gabarit id=note.repli
Repli « {{objectif_n}} » : {{situation_mot}}.
```

```gabarit id=note.bouge.deux
Fait récent documenté : {{ev_1}} ({{ev_1_date}}, {{ev_1_effet}}).
```

```gabarit id=note.bouge.un
Fait récent documenté : {{ev_1}} ({{ev_1_date}}, {{ev_1_effet}}).
```

```gabarit id=note.bouge.rien
Aucun changement déterminant n’est documenté.
```

```gabarit id=note.dates.echeance
Prochaine étape documentée : {{echeance_1}}, le {{echeance_1_date}}.
```

```gabarit id=note.dates.derniere
Dernière occasion d’agir documentée : {{derniere_occasion}}, le {{derniere_occasion_date}}.
```

```gabarit id=note.action
La synthèse s’en tient aux positions personnellement documentées.
```

```gabarit id=note.limites
Les incertitudes non documentées restent ouvertes.
```

```gabarit id=note.limites.defaut
Les incertitudes non documentées restent ouvertes.
```

## Contraintes de sortie

- Un seul paragraphe, sans titre ni puce.
- Aucun nombre n’est inventé : les variables sont remplies uniquement par `run.ts`.
- `note.texte` reste une chaîne ; `mode`, `modele`, `verifie`, `chiffres_utilises`, `sources` et les autres champs de `NoteSchema` restent produits par `run.ts`.
- Les blocs techniques restent volontairement hors du texte client ; les données originales demeurent dans les JSON sources et les métadonnées.
