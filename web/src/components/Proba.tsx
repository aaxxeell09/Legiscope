import { formatProba } from "../lib/format";
import { Badge } from "./Badge";

export type ProbaSize = "sm" | "md" | "lg";

/**
 * Pourcentage en gros, couleur par seuils : ≥ 0,6 vert, 0,4 à 0,6 orange,
 * < 0,4 rouge ; null = « pas de prédiction » en gris.
 */
export function Proba({
  value,
  size = "lg",
  label,
  mode,
}: {
  value: number | null | undefined;
  size?: ProbaSize;
  label?: string;
  /** « gabarit » : chiffre produit sans modèle, signalé par une étiquette. */
  mode?: "llm" | "gabarit" | null;
}) {
  const cls = probaClass(value);
  return (
    <span className={`proba proba-${size} ${cls}`} data-value={value ?? ""}>
      {formatProba(value)}
      {mode === "gabarit" && <> <Badge kind="gabarit" /></>}
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
