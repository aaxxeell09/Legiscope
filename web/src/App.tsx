import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ConfigProvider, useConfigState } from "./lib/config";
import { Chargement, Erreur, ErrorBoundary, TopBar } from "./components";
import DossierView from "./views/dossier";
import DeputeView from "./views/depute";
import BaseView from "./views/base";
import SourcesView from "./views/sources";

/** `/` : redirige vers `/dossier/<dossier_demo>` lu dans config.json. */
function Home() {
  const cfg = useConfigState();
  if (cfg.status !== "ok") return null; // état global affiché par Contenu
  const dossier = cfg.config.dossier_demo || cfg.config.dossiers[0]?.id;
  if (!dossier) return <Erreur message="config.json : aucun dossier" />;
  return <Navigate to={`/dossier/${dossier}`} replace />;
}

function NotFound() {
  const { pathname } = useLocation();
  return (
    <div className="view">
      <h1>Page introuvable</h1>
      <p className="text-2">{pathname}</p>
      <p>
        <Link to="/">Revenir au tableau de bord</Link>
      </p>
    </div>
  );
}

/** États globaux : config en chargement ou illisible, puis les routes. */
function Contenu() {
  const cfg = useConfigState();
  const { pathname } = useLocation();
  if (cfg.status === "loading") return <Chargement quoi="config.json" />;
  if (cfg.status === "error") return <Erreur message={`config.json : ${cfg.error}`} />;
  return (
    <ErrorBoundary key={pathname} zone="Page" resetKey={pathname}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dossier/:id" element={<DossierView />} />
        <Route path="/dossier/:id/depute/:pa" element={<DeputeView />} />
        <Route path="/dossier/:id/base" element={<BaseView />} />
        <Route path="/sources" element={<SourcesView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <BrowserRouter>
        <a className="skip-link" href="#contenu-principal">Aller au contenu principal</a>
        <TopBar />
        <main className="app-main" id="contenu-principal" tabIndex={-1}>
          <Contenu />
        </main>
      </BrowserRouter>
    </ConfigProvider>
  );
}
