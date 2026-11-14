import { formatProba } from "../lib/format";

export type ProbaSize = "sm" | "md" | "lg";

/**
 * Pourcentage en gros, couleur par seuils : ≥ 0,6 vert, 0,4 à 0,6 orange,
 * < 0,4 rouge ; null = « pas de prédiction » en gris.
 */
export function Proba({
  value,
  size = "lg",
  label,
}: {
  value: number | null | undefined;
  size?: ProbaSize;
  label?: string;
}) {
  const cls = probaClass(value);
  return (
    <span className={`proba proba-${size} ${cls}`} data-value={value ?? ""}>
      {formatProba(value)}
      {label && <span className="proba-label">{label}</span>}
    </span>
  );
}

export function probaClass(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "proba-none";
  if (value >= 0.6) return "proba-high";
  if (value >= 0.4) return "proba-mid";
  return "proba-low";
}
