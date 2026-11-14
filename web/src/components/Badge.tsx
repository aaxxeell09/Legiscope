import type { ReactNode } from "react";

export type BadgeKind = "verifie" | "non-verifie" | "ia" | "gabarit" | "importance" | "fait" | "deduction" | "inconnue" | "neutre";

const LABELS_IMPORTANCE: Record<number, string> = { 3: "majeur", 2: "notable", 1: "mineur" };

/**
 * Étiquette texte courte, bordure pleine, jamais de pastille.
 *   <Badge kind="verifie" />           « chiffres contrôlés » (contrôle automatique, pas validation humaine)
 *   <Badge kind="non-verifie" />       « chiffres non contrôlés »
 *   <Badge kind="ia" | "gabarit" />   mode de rédaction
 *   <Badge kind="importance" value={3} /> « majeur » / « notable » / « mineur »
 *   <Badge kind="fait" | "deduction" | "inconnue" />  nature de la preuve
 * `children` remplace le libellé par défaut.
 */
export function Badge({ kind, value, children, title }: { kind: BadgeKind; value?: number; children?: ReactNode; title?: string }) {
  let label: ReactNode;
  let cls: string = kind;
  let aide: string | undefined;
  switch (kind) {
    case "verifie":
      label = "chiffres contrôlés";
      aide = "Contrôle automatique des nombres cités ; ne constitue pas une validation humaine du texte.";
      break;
    case "non-verifie":
      label = "chiffres non contrôlés";
      aide = "Le contrôle automatique des nombres cités n'est pas établi.";
      break;
    case "ia":
      label = "rédaction IA";
      break;
    case "gabarit":
      label = "rédaction par gabarit";
      break;
    case "importance":
      label = LABELS_IMPORTANCE[value ?? 1] ?? `importance ${value}`;
      cls = `importance-${value ?? 1}`;
      break;
    case "fait":
      label = "fait publié";
      break;
    case "deduction":
      label = "déduction";
      break;
    case "inconnue":
      label = "inconnu";
      break;
    default:
      label = null;
  }
  return (
    <span className={`badge badge-${cls}`} title={title ?? aide}>
      {children ?? label}
    </span>
  );
}
