import { useEffect, useId, useRef, useState } from "react";
import { Badge } from "./Badge";

export type NaturePreuve = "fait" | "deduction" | "inconnue";

export type Justification = {
  sources: { label: string; url: string }[];
  raisonnement: string;
  nature?: NaturePreuve;
};

type PourquoiProps = Partial<Justification> & {
  /** Bloc `preuve` des contrats, passé tel quel : `<Pourquoi preuve={e.preuve} />`. */
  preuve?: Justification | null;
  label?: string;
};

/**
 * Règle de fiabilité (rendu-final.md, section 5) : chaque information porte un
 * bouton texte « pourquoi » qui ouvre un panneau avec les sources en liens et le
 * raisonnement. Clavier : Entrée ou Espace ouvre, Échap ferme, le focus revient
 * sur le bouton.
 */
export function Pourquoi({ preuve, sources: s0, raisonnement: r0, nature: n0, label = "pourquoi" }: PourquoiProps) {
  const sources = preuve?.sources ?? s0 ?? [];
  const raisonnement = preuve?.raisonnement ?? r0 ?? "";
  const nature = preuve?.nature ?? n0;
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const id = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <span className="pourquoi" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className="pourquoi-btn"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          const r = btnRef.current?.getBoundingClientRect();
          if (r) setAlignRight(r.left > window.innerWidth / 2);
          setOpen((o) => !o);
        }}
      >
        {label}
      </button>
      {open && (
        <div id={id} ref={panelRef} className={`pourquoi-panel${alignRight ? " pourquoi-panel-right" : ""}`} role="dialog" aria-label="Pourquoi" tabIndex={-1}>
          {nature && (
            <div className="pourquoi-nature">
              <Badge kind={nature} />
            </div>
          )}
          {raisonnement && <p className="pourquoi-raison">{raisonnement}</p>}
          {sources.length > 0 && (
            <ol className="pourquoi-sources">
              {sources.map((s, i) => (
                <li key={`${s.url}-${i}`}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          )}
          <button type="button" className="pourquoi-close" onClick={() => { setOpen(false); btnRef.current?.focus(); }}>
            Fermer
          </button>
        </div>
      )}
    </span>
  );
}
