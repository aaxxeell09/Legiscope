import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { validate } from "./contracts";

/** Reflet de `data/config.json` (PLAN.md, 5.1). Validé par `ConfigSchema` de contracts quand il existe. */
export type Dataset = "live" | "fixtures";

export type Objectif = { rang: number; texte: string; position_cible: "pour" | "contre" | string };

export type DossierConfig = {
  id: string;
  label: string;
  texte_id: string;
  etat: "en_cours" | "clos";
  sujet: { label: string; mots_cles: string[] };
  pivot_demo: string | null;
  /** En-tête du tableau de bord (rendu-final.md, section 2). Doivent exister dans
   *  `DossierConfigSchema` de contracts/, sinon zod les retire à la validation. */
  client?: string;
  /** Objectifs par ordre de préférence : rang 1 = principal, les suivants « à défaut ». */
  objectifs?: Objectif[];
  /** Ancienne forme (un seul objectif), tolérée tant que la fixture n'est pas migrée. */
  objectif?: Omit<Objectif, "rang">;
  /** Ce qu'on suit : la mesure, pas le texte (rendu-final.md, 2.2). */
  mesure?: { label: string; article?: string | null; texte_id?: string | null };
  /** Date de référence quand le dossier est rejoué dans le passé : « vu au 19 nov. 2025 ». */
  date_reference?: string | null;
};

export type AppConfig = {
  produit: { nom: string; accroche: string };
  dataset: Dataset;
  dossiers: DossierConfig[];
  dossier_demo: string;
  cohesion: {
    paires_demo: [string, string][];
    curseur_presets: { label: string; date: string }[];
  };
};

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

/** Les objectifs d'un dossier triés par rang, avec l'ancien champ `objectif` comme rang 1 si besoin. */
export function objectifsDe(d: DossierConfig | null | undefined): Objectif[] {
  if (!d) return [];
  if (d.objectifs && d.objectifs.length > 0) return [...d.objectifs].sort((a, b) => a.rang - b.rang);
  if (d.objectif) return [{ rang: 1, ...d.objectif }];
  return [];
}

/** Le dossier `id` de la config, ou null (config pas encore lue, ou id inconnu). */
export function useDossier(id: string | undefined): DossierConfig | null {
  const config = useConfig();
  if (!config || !id) return null;
  return config.dossiers.find((d) => d.id === id) ?? null;
}

/** La config chargée, ou null tant qu'elle ne l'est pas. */
export function useConfig(): AppConfig | null {
  const s = useContext(ConfigContext);
  return s.status === "ok" ? s.config : null;
}
