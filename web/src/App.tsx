import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ConfigProvider, useConfigState } from "./lib/config";
import { TopBar } from "./components";
import DossierView from "./views/dossier";
import DeputeView from "./views/depute";
import BaseView from "./views/base";
import SourcesView from "./views/sources";

/** `/` : redirige vers `/dossier/<dossier_demo>` lu dans config.json. */
function Home() {
  const cfg = useConfigState();
  if (cfg.status === "loading") return <div className="status">Chargement de config.json</div>;
  if (cfg.status === "error") return <div className="status status-error">config.json : {cfg.error}</div>;
  const dossier = cfg.config.dossier_demo || cfg.config.dossiers[0]?.id;
  if (!dossier) return <div className="status status-error">config.json : aucun dossier</div>;
  return <Navigate to={`/dossier/${dossier}`} replace />;
}

function NotFound() {
  return (
    <div className="view">
      <h1>Page introuvable</h1>
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <BrowserRouter>
        <TopBar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dossier/:id" element={<DossierView />} />
            <Route path="/dossier/:id/depute/:pa" element={<DeputeView />} />
            <Route path="/dossier/:id/base" element={<BaseView />} />
            <Route path="/sources" element={<SourcesView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </BrowserRouter>
    </ConfigProvider>
  );
}
