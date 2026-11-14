import type { ReactNode } from "react";

export type BadgeKind = "verifie" | "non-verifie" | "gabarit" | "importance" | "fait" | "deduction" | "inconnue" | "neutre";

const LABELS_IMPORTANCE: Record<number, string> = { 3: "majeur", 2: "notable", 1: "mineur" };

/**
 * Étiquette texte courte, bordure pleine, jamais de pastille.
 *   <Badge kind="verifie" />           « vérifié »
 *   <Badge kind="non-verifie" />       « non vérifié »
 *   <Badge kind="gabarit" />           « gabarit » (texte produit sans modèle)
 *   <Badge kind="importance" value={3} /> « majeur » / « notable » / « mineur »
 *   <Badge kind="fait" | "deduction" | "inconnue" />  nature de la preuve
 * `children` remplace le libellé par défaut.
 */
export function Badge({ kind, value, children, title }: { kind: BadgeKind; value?: number; children?: ReactNode; title?: string }) {
  let label: ReactNode;
  let cls: string = kind;
  switch (kind) {
    case "verifie":
      label = "vérifié";
      break;
    case "non-verifie":
      label = "non vérifié";
      break;
    case "gabarit":
      label = "gabarit";
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
    <span className={`badge badge-${cls}`} title={title}>
      {children ?? label}
    </span>
  );
}
