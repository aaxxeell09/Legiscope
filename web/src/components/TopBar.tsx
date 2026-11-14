import { Link, NavLink, matchPath, useLocation, useNavigate } from "react-router-dom";
import { useConfig } from "../lib/config";

/** Nom du produit, sélecteur de dossier (change `/dossier/:id`), lien Sources. */
export function TopBar() {
  const config = useConfig();
  const location = useLocation();
  const navigate = useNavigate();

  const dossiers = config?.dossiers ?? [];
  // TopBar est hors de <Routes>, donc useParams() est vide : on lit l'URL.
  const fromUrl = matchPath({ path: "/dossier/:id", end: false }, location.pathname)?.params.id;
  const dossier = fromUrl ?? config?.dossier_demo ?? dossiers[0]?.id ?? "";

  return (
    <header className="topbar">
      <Link to={dossier ? `/dossier/${dossier}` : "/"} className="topbar-brand">
        {config?.produit.nom ?? "…"}
      </Link>
      <div className="topbar-dossier">
        <label htmlFor="dossier-select">Dossier</label>
        <select
          id="dossier-select"
          value={dossier}
          onChange={(e) => navigate(`/dossier/${e.target.value}`)}
          disabled={dossiers.length === 0}
        >
          {dossiers.length === 0 && <option value="">…</option>}
          {dossiers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.client ? `${d.client}, ${d.label}` : d.label}
            </option>
          ))}
        </select>
      </div>
      <nav className="topbar-tabs" aria-label="Pages">
        <NavLink to="/sources" className={({ isActive }) => (isActive ? "topbar-tab active" : "topbar-tab")}>
          Sources
        </NavLink>
      </nav>
    </header>
  );
}
