import type { CSSProperties, ReactNode } from "react";

/** Titre + contenu, bordure. `aside` : élément à droite du titre (compteur, lien). */
export function Panel({
  title,
  aside,
  children,
  className,
  style,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={`panel${className ? ` ${className}` : ""}`} style={style}>
      {(title || aside) && (
        <header className="panel-head">
          {title && <h3>{title}</h3>}
          {aside && <span className="text-2">{aside}</span>}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}
