import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  const selectorMenuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  const dossiers = config?.dossiers ?? [];
  // TopBar est hors de <Routes>, donc useParams() est vide : on lit l'URL.
  const fromUrl = matchPath({ path: "/dossier/:id", end: false }, location.pathname)?.params.id;
  const fromState = (location.state as { dossier?: string } | null)?.dossier;
  const dossier = fromUrl ?? fromState ?? config?.dossier_demo ?? dossiers[0]?.id ?? "";
  const courant = dossiers.find((d) => d.id === dossier);
  const close = () => { setOpen(false); setDossiersOpen(false); };

  const positionMenu = () => {
    const rect = selectorButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 12;
    const width = Math.min(380, window.innerWidth - margin * 2);
    const left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
    const availableBelow = window.innerHeight - rect.bottom - margin - 8;
    const availableAbove = rect.top - margin - 8;
    const openAbove = availableBelow < 220 && availableAbove > availableBelow;
    const maxHeight = Math.max(96, Math.min(420, openAbove ? availableAbove : availableBelow));
    const top = openAbove ? Math.max(margin, rect.top - maxHeight - 7) : rect.bottom + 7;
    setMenuPosition({ top, left, width, maxHeight });
  };

  const toggleDossiers = () => {
    if (dossiersOpen) {
      setDossiersOpen(false);
      return;
    }
    positionMenu();
    setDossiersOpen(true);
  };

  useEffect(() => {
    setDossiersOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!dossiersOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!selectorRef.current?.contains(target) && !selectorMenuRef.current?.contains(target)) setDossiersOpen(false);
    };
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDossiersOpen(false);
      selectorButtonRef.current?.focus();
    };
    const onViewportChange = () => positionMenu();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [dossiersOpen]);

  const onSelectorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!dossiersOpen) {
      positionMenu();
      setDossiersOpen(true);
      const direction = event.key;
      window.requestAnimationFrame(() => {
        const items = [...selectorRef.current?.querySelectorAll<HTMLAnchorElement>(".dossier-option") ?? []];
        items[direction === "ArrowDown" ? 0 : items.length - 1]?.focus();
      });
      return;
    }
    const items = [...selectorMenuRef.current?.querySelectorAll<HTMLAnchorElement>(".dossier-option") ?? []];
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
              onClick={toggleDossiers}
            >
              <span className="dossier-selector-copy">
                <strong>{courant?.client ?? "Choisir un dossier"}</strong>
                <span>{courant?.label ?? "Dossiers disponibles"}</span>
              </span>
              <span className="dossier-selector-chevron" aria-hidden="true">⌄</span>
            </button>
            {dossiersOpen && menuPosition && createPortal(
              <div
                ref={selectorMenuRef}
                id="dossier-selector-menu"
                className="dossier-selector-menu"
                role="menu"
                aria-label="Choisir le dossier actif"
                style={menuPosition}
              >
                {dossiers.length === 0 ? <p className="dossier-selector-empty">Aucun dossier disponible</p> : dossiers.map((d) => (
                  <Link
                    key={d.id}
                    to={`/dossier/${d.id}`}
                    role="menuitem"
                    className={`dossier-option${d.id === dossier ? " active" : ""}`}
                    aria-current={d.id === dossier ? "page" : undefined}
                    onClick={close}
                  >
                    <span className="dossier-option-copy"><strong>{d.client}</strong><span>{d.label}</span></span>
                    {d.id === dossier && <span className="dossier-option-status">Actif</span>}
                  </Link>
                ))}
              </div>,
              document.body,
            )}
          </div>
          <div className="sidebar-label sidebar-label-navigation">Navigation du dossier</div>
          <NavLink end to={`/dossier/${dossier}`} onClick={close} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}><Icon>⌂</Icon><span>Vue d'ensemble</span></NavLink>
          <NavLink to={`/dossier/${dossier}/base`} onClick={close} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}><Icon>▤</Icon><span>Base documentaire</span></NavLink>
          <NavLink to="/sources" state={{ dossier }} onClick={close} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}><Icon>◉</Icon><span>Sources</span><span className="sidebar-global">Global</span></NavLink>
        </nav>
        <div className="sidebar-foot"><span className={`dataset-dot ${config?.dataset === "fixtures" ? "fixtures" : "live"}`} /><span>{config?.dataset === "fixtures" ? "Données de démonstration" : "Données produites"}</span></div>
      </aside>
      <header className="topbar" aria-hidden="true" />
    </>
  );
}
