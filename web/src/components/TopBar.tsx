import { useState, type ReactNode } from "react";
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

  const dossiers = config?.dossiers ?? [];
  // TopBar est hors de <Routes>, donc useParams() est vide : on lit l'URL.
  const fromUrl = matchPath({ path: "/dossier/:id", end: false }, location.pathname)?.params.id;
  const dossier = fromUrl ?? config?.dossier_demo ?? dossiers[0]?.id ?? "";
  const courant = dossiers.find((d) => d.id === dossier);
  const pageSources = location.pathname === "/sources";
  const close = () => setOpen(false);

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
          <div className="sidebar-label">Espace de travail</div>
          <NavLink end to={`/dossier/${dossier}`} onClick={close} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}><Icon>⌂</Icon><span>Dossier courant</span></NavLink>
          <NavLink to={`/dossier/${dossier}/base`} onClick={close} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}><Icon>▤</Icon><span>Base documentaire</span></NavLink>
          <NavLink to="/sources" onClick={close} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}><Icon>◉</Icon><span>Sources et limites</span></NavLink>
          <div className="sidebar-label sidebar-label-dossiers">Dossiers disponibles</div>
          {dossiers.map((d) => (
            <NavLink key={d.id} to={`/dossier/${d.id}`} onClick={close} className={({ isActive }) => `sidebar-dossier${isActive ? " active" : ""}`}>
              <span className="sidebar-dossier-client">{d.client}</span><span>{d.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot"><span className={`dataset-dot ${config?.dataset === "fixtures" ? "fixtures" : "live"}`} /><span>{config?.dataset === "fixtures" ? "Données de démonstration" : "Données produites"}</span></div>
      </aside>
      <header className="topbar">
        <div className="topbar-context">
          <span className="topbar-eyebrow">{pageSources ? "Transparence" : (courant?.client ?? "Espace de travail")}</span>
          <span className="topbar-title">{pageSources ? "Sources et limites" : (courant?.label ?? "Dossier")}</span>
        </div>
      </header>
    </>
  );
}
