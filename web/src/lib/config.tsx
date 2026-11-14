import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { validate } from "./contracts";
import type { Config, DossierConfig as DossierConfigC, Objectif as ObjectifC } from "@contracts/index";

/** Reflet de `data/config.json`, types tirés des contrats (ConfigSchema). */

export type Dataset = Config["dataset"];
export type Objectif = ObjectifC;
export type DossierConfig = DossierConfigC;
export type AppConfig = Config;

export type ConfigState =
  | { status: "loading" }
  | { status: "ok"; config: AppConfig }
  | { status: "error"; error: string };

const ConfigContext = createContext<ConfigState>({ status: "loading" });

/** Chemin de base des fichiers de données selon le jeu choisi. */
export function baseFor(dataset: Dataset): string {
  // `live` : `data/` servi à la racine par `publicDir` (vite.config.ts).
  // `fixtures` : `contracts/fixtures/` servi sous `/fixtures` par le plugin Vite.
  return dataset === "fixtures" ? "/fixtures" : "";
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} : HTTP ${res.status}`);
  return res.json();
}

/** Lit `/config.json` (data/) ; à défaut `/fixtures/config.json`. */
export async function loadConfig(): Promise<AppConfig> {
  let raw: unknown;
  try {
    raw = await fetchJson("/config.json");
  } catch (e) {
    try {
      raw = await fetchJson("/fixtures/config.json");
      if (raw && typeof raw === "object") (raw as { dataset?: string }).dataset = "fixtures";
    } catch {
      throw e instanceof Error ? e : new Error(String(e));
    }
  }
  const checked = validate<AppConfig>("config", raw);
  if (!checked.ok) throw new Error(`config.json invalide : ${checked.error}`);
  return checked.data;
}

let configPromise: Promise<AppConfig> | null = null;

/** Une seule lecture de config.json par page, même sous StrictMode. */
function loadConfigOnce(): Promise<AppConfig> {
  if (!configPromise) {
    configPromise = loadConfig().catch((e: unknown) => {
      configPromise = null;
      throw e;
    });
  }
  return configPromise;
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfigState>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    loadConfigOnce()
      .then((config) => alive && setState({ status: "ok", config }))
      .catch((e: unknown) => alive && setState({ status: "error", error: e instanceof Error ? e.message : String(e) }));
    return () => {
      alive = false;
    };
  }, []);
  return <ConfigContext.Provider value={state}>{children}</ConfigContext.Provider>;
}

export function useConfigState(): ConfigState {
  return useContext(ConfigContext);
}

/** Les objectifs d'un dossier triés par rang (rang 1 = principal, puis « à défaut »). */
export function objectifsDe(d: DossierConfig | null | undefined): Objectif[] {
  if (!d?.objectifs) return [];
  return [...d.objectifs].sort((a, b) => a.rang - b.rang);
}

export type DossierCourant = {
  /** loading : config pas encore lue ; inconnu : id absent de config.json. */
  status: "loading" | "error" | "inconnu" | "ok";
  error?: string;
  id: string;
  dossier: DossierConfig | null;
  client: string | null;
  label: string | null;
  mesure: DossierConfig["mesure"] | null;
  objectifs: Objectif[];
  principal: Objectif | null;
  replis: Objectif[];
  /** AAAA-MM-JJ quand le dossier est rejoué dans le passé, sinon null. */
  dateReference: string | null;
};

/**
 * Le dossier courant : lu dans la route (`/dossier/:id`) ou passé en argument.
 *
 *   const { status, dossier, client, principal, replis, dateReference } = useDossier();
 */
export function useDossier(idArg?: string): DossierCourant {
  const params = useParams<{ id?: string }>();
  const id = idArg ?? params.id ?? "";
  const s = useContext(ConfigContext);
  const vide: DossierCourant = { status: "loading", id, dossier: null, client: null, label: null, mesure: null, objectifs: [], principal: null, replis: [], dateReference: null };
  if (s.status === "loading") return vide;
  if (s.status === "error") return { ...vide, status: "error", error: s.error };
  const d = s.config.dossiers.find((x) => x.id === id) ?? null;
  if (!d) return { ...vide, status: "inconnu" };
  const objectifs = objectifsDe(d);
  return {
    status: "ok",
    id,
    dossier: d,
    client: d.client,
    label: d.label,
    mesure: d.mesure,
    objectifs,
    principal: objectifs[0] ?? null,
    replis: objectifs.slice(1),
    dateReference: d.date_reference ?? null,
  };
}

/** La config chargée, ou null tant qu'elle ne l'est pas. */
export function useConfig(): AppConfig | null {
  const s = useContext(ConfigContext);
  return s.status === "ok" ? s.config : null;
}
