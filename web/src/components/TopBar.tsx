import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, NavLink, matchPath, useLocation } from "react-router-dom";
import { useConfig } from "../lib/config";

function Icon({ children }: { children: ReactNode }) {
  return <span className="nav-icon" aria-hidden="true">{children}</span>;
}

/** Navigation principale et barre contextuelle. */
export function TopBar() {
  const config = useConfig();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dossiersOpen, setDossiersOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const selectorButtonRef = useRef<HTMLButtonElement>(null);

  const dossiers = config?.dossiers ?? [];
  // TopBar est hors de <Routes>, donc useParams() est vide : on lit l'URL.
  const fromUrl = matchPath({ path: "/dossier/:id", end: false }, location.pathname)?.params.id;
  const fromState = (location.state as { dossier?: string } | null)?.dossier;
  const dossier = fromUrl ?? fromState ?? config?.dossier_demo ?? dossiers[0]?.id ?? "";
  const courant = dossiers.find((d) => d.id === dossier);
  const pageSources = location.pathname === "/sources";
  const close = () => { setOpen(false); setDossiersOpen(false); };

  useEffect(() => {
    setDossiersOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!dossiersOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) setDossiersOpen(false);
    };
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDossiersOpen(false);
      selectorButtonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [dossiersOpen]);

  const onSelectorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!dossiersOpen) {
      setDossiersOpen(true);
      const direction = event.key;
      window.requestAnimationFrame(() => {
        const items = [...selectorRef.current?.querySelectorAll<HTMLAnchorElement>(".dossier-option") ?? []];
        items[direction === "ArrowDown" ? 0 : items.length - 1]?.focus();
      });
      return;
    }
    const items = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>(".dossier-option")];
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLAnchorElement);
    const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <>
      <button className="mobile-nav-toggle" type="button" aria-expanded={open} aria-controls="app-sidebar" onClick={() => setOpen((v) => !v)}>
        <span aria-hidden="true">☰</span><span>Menu</span>
      </button>
      {open && <button type="button" className="sidebar-backdrop" aria-label="Fermer le menu" onClick={close} />}
      <aside id="app-sidebar" className={`sidebar${open ? " sidebar-open" : ""}`}>
        <Link to={dossier ? `/dossier/${dossier}` : "/"} className="sidebar-brand" onClick={close}>
          <span className="brand-mark" aria-hidden="true">L</span>
          <span>{config?.produit.nom ?? "LegiSpot"}</span>
        </Link>
        <nav className="sidebar-nav" aria-label="Navigation principale">
          <div className="sidebar-label">Dossier actif</div>
          <div className="dossier-selector" ref={selectorRef} onKeyDown={onSelectorKeyDown}>
            <button
              ref={selectorButtonRef}
              type="button"
              className="dossier-selector-button"
              aria-expanded={dossiersOpen}
              aria-haspopup="menu"
              aria-controls="dossier-selector-menu"
              onClick={() => setDossiersOpen((value) => !value)}
            >
              <span className="dossier-selector-copy">
                <strong>{courant?.client ?? "Choisir un dossier"}</strong>
                <span>{courant?.label ?? "Dossiers disponibles"}</span>
              </span>
              <span className="dossier-selector-chevron" aria-hidden="true">⌄</span>
            </button>
            {dossiersOpen && (
              <div id="dossier-selector-menu" className="dossier-selector-menu" role="menu" aria-label="Choisir le dossier actif">
                {dossiers.map((d) => (
                  <Link
                    key={d.id}
                    to={`/dossier/${d.id}`}
                    role="menuitem"
                    className={`dossier-option${d.id === dossier ? " active" : ""}`}
                    aria-current={d.id === dossier ? "page" : undefined}
                    onClick={close}
                  >
                    <strong>{d.client}</strong>
                    <span>{d.label}</span>
                    {d.id === dossier && <span className="dossier-option-check" aria-hidden="true">✓</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="sidebar-label sidebar-label-navigation">Navigation du dossier</div>
          <NavLink end to={`/dossier/${dossier}`} onClick={close} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}><Icon>⌂</Icon><span>Vue d'ensemble</span></NavLink>
          <NavLink to={`/dossier/${dossier}/base`} onClick={close} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}><Icon>▤</Icon><span>Base documentaire</span></NavLink>
          <NavLink to="/sources" state={{ dossier }} onClick={close} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}><Icon>◉</Icon><span>Sources</span><span className="sidebar-global">Global</span></NavLink>
        </nav>
        <div className="sidebar-foot"><span className={`dataset-dot ${config?.dataset === "fixtures" ? "fixtures" : "live"}`} /><span>{config?.dataset === "fixtures" ? "Données de démonstration" : "Données produites"}</span></div>
      </aside>
      <header className="topbar">
        <div className="topbar-context">
          <span className="topbar-eyebrow">{pageSources ? "Transparence" : (courant?.client ?? "Espace de travail")}</span>
          <span className="topbar-title">{pageSources ? "Sources" : (courant?.label ?? "Dossier")}</span>
        </div>
      </header>
    </>
  );
}
