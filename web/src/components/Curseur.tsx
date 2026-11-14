import { useId } from "react";
import { formatDate } from "../lib/format";

const DAY = 86_400_000;

function toDays(iso: string): number {
  return Math.round(new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime() / DAY);
}

function fromDays(n: number): string {
  return new Date(n * DAY).toISOString().slice(0, 10);
}

/**
 * Curseur de date : boutons de préréglage (config.cohesion.curseur_presets) et
 * glissière au jour près. Contrôlé : `value` et `onChange` en AAAA-MM-JJ.
 * Le clavier suffit (Tab sur les préréglages, flèches sur la glissière).
 *
 *   <Curseur min="2024-07-18" max={dateRef ?? today} value={d} onChange={setD}
 *            presets={config.cohesion.curseur_presets} />
 */
export function Curseur({
  min,
  max,
  value,
  onChange,
  presets = [],
  label = "Date",
}: {
  min: string;
  max: string;
  value: string;
  onChange: (date: string) => void;
  presets?: { label: string; date: string }[];
  label?: string;
}) {
  const id = useId();
  const lo = toDays(min);
  const hi = Math.max(lo, toDays(max));
  const cur = Math.min(hi, Math.max(lo, toDays(value)));
  const visibles = presets.filter((p) => {
    const d = toDays(p.date);
    return d >= lo && d <= hi;
  });

  return (
    <div className="curseur">
      {visibles.length > 0 && (
        <div className="curseur-presets" role="group" aria-label="Préréglages">
          {visibles.map((p) => {
            const actif = toDays(p.date) === cur;
            return (
              <button key={`${p.date}-${p.label}`} type="button" aria-pressed={actif} className={actif ? "curseur-preset actif" : "curseur-preset"} onClick={() => onChange(p.date)}>
                {p.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="curseur-ligne">
        <label htmlFor={id} className="text-2">
          {label}
        </label>
        <input id={id} type="range" min={lo} max={hi} step={1} value={cur} onChange={(e) => onChange(fromDays(Number(e.target.value)))} aria-valuetext={formatDate(fromDays(cur))} />
        <output htmlFor={id} className="curseur-valeur">
          {formatDate(fromDays(cur))}
        </output>
      </div>
    </div>
  );
}
