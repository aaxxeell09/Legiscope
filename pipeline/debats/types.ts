import type { Lieu } from "../../contracts";

/** Une prise de parole sur le sujet, avant classement. Un paragraphe de compte rendu. */
export type Intervention = {
  /** Identifiant stable (uid du compte rendu + id du paragraphe). */
  id: string;
  dossier_id: string;
  date: string; // AAAA-MM-JJ
  lieu: Lieu;
  /** Page publique du compte rendu. */
  url: string;
  /** Libellé lisible de la source (« Deuxième séance du mercredi 19 novembre 2025 »). */
  source_label: string;
  orateur_nom: string;
  /** Qualité donnée par le compte rendu (ministre, rapporteur général...), vide pour un député simple. */
  orateur_qualite: string;
  /** Identifiant d'acteur AN (PA...) quand le compte rendu le donne ou qu'un nom l'a retrouvé, sinon null. */
  acteur_id: string | null;
  /** Sigle du groupe donné par le compte rendu de commission, sinon null. */
  groupe_sigle: string | null;
  /** Paragraphe entier, balises retirées. */
  texte: string;
  /** Vrai si le paragraphe contient un mot-clé ; faux s'il est retenu par sa position (article de la mesure). */
  mot_cle: boolean;
};

export type SourceLue = {
  lieu: Lieu;
  uid: string;
  date: string;
  url: string;
  label: string;
  /** Nombre de paragraphes retenus sur le sujet. */
  retenus: number;
};
