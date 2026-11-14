import { useEffect, useState } from "react";
import { baseFor, useConfigState } from "./config";
import { validate, type DataKind } from "./contracts";

export type { DataKind } from "./contracts";

export type DataState<T> = {
  status: "loading" | "ok" | "error";
  data?: T;
  error?: string;
};

/** Bloc `meta` présent dans chaque fichier de données (PLAN.md, section 5). */
export type Meta = {
  generated_at: string;
  sources: { label: string; url: string }[];
  limits: string;
  producer?: string;
  dossier_id?: string;
};

/**
 * Chemin relatif d'un fichier de données, identique dans `data/` et dans
 * `contracts/fixtures/` (les fixtures reproduisent l'arborescence de data/).
 */
export function pathFor(kind: DataKind, dossier?: string, pa?: string): string {
  switch (kind) {
    case "config":
      return "/config.json";
    case "groupes":
    case "deputes":
    case "cohesion":
      return `/${kind}.json`;
    case "texte":
    case "pivots":
    case "hatvp":
    case "note":
    case "verdict":
    case "nouveautes":
    case "suite":
    case "action":
    case "etat":
      need(dossier, kind);
      return `/${dossier}/${kind}.json`;
    case "fiches_index":
      need(dossier, kind);
      return `/${dossier}/fiches/index.json`;
    case "fiche":
      need(dossier, kind);
      need(pa, kind, "pa");
      return `/${dossier}/fiches/${pa}.json`;
    case "auditions":
    case "debats":
    case "amendements":
      need(dossier, kind);
      need(pa, kind, "pa");
      return `/${dossier}/${kind}/${pa}.json`;
  }
}

function need(v: string | undefined, kind: string, what = "dossier"): asserts v is string {
  if (!v) throw new Error(`useData(« ${kind} ») exige un paramètre ${what}`);
}

const DOSSIER_SCOPED: ReadonlySet<DataKind> = new Set([
  "texte",
  "pivots",
  "hatvp",
  "note",
  "verdict",
  "nouveautes",
  "suite",
  "action",
  "etat",
  "fiches_index",
  "fiche",
  "auditions",
  "debats",
  "amendements",
]);

const cache = new Map<string, Promise<unknown>>();

async function fetchAndValidate<T>(kind: DataKind, url: string, dossier?: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} : HTTP ${res.status}`);
  const raw: unknown = await res.json();
  const checked = validate<T>(kind, raw);
  if (!checked.ok) throw new Error(`${url} : ${checked.error}`);
  // Le front refuse un fichier dont meta.dossier_id diffère du dossier demandé (PLAN.md, section 5).
  if (dossier && DOSSIER_SCOPED.has(kind)) {
    const meta = (raw as { meta?: { dossier_id?: unknown } } | null)?.meta;
    const got = meta?.dossier_id;
    if (typeof got === "string" && got !== dossier) {
      throw new Error(`${url} : meta.dossier_id « ${got} » au lieu de « ${dossier} »`);
    }
  }
  return checked.data;
}

/**
 * Charge un fichier de données et le valide avec le schéma zod de contracts/.
 *
 *   const verdict = useData<Verdict>("verdict", dossier);
 *   const fiche = useData<Fiche>("fiche", dossier, pa);
 *
 * Lit `config.json` une fois (ConfigProvider), choisit `data/` ou
 * `contracts/fixtures/` selon `config.dataset`, met en cache par URL.
 */
export function useData<T>(kind: DataKind, dossier?: string, pa?: string): DataState<T> {
  const cfg = useConfigState();
  const [state, setState] = useState<DataState<T>>({ status: "loading" });

  let url: string | null = null;
  let pathError: string | null = null;
  if (cfg.status === "ok") {
    try {
      url = baseFor(cfg.config.dataset) + pathFor(kind, dossier, pa);
    } catch (e) {
      pathError = e instanceof Error ? e.message : String(e);
    }
  }

  useEffect(() => {
    if (cfg.status === "loading") {
      setState({ status: "loading" });
      return;
    }
    if (cfg.status === "error") {
      setState({ status: "error", error: `config.json : ${cfg.error}` });
      return;
    }
    if (pathError) {
      setState({ status: "error", error: pathError });
      return;
    }
    if (!url) return;
    let alive = true;
    setState({ status: "loading" });
    let p = cache.get(url) as Promise<T> | undefined;
    if (!p) {
      p = fetchAndValidate<T>(kind, url, dossier);
      cache.set(url, p);
      p.catch(() => cache.delete(url as string));
    }
    p.then((data) => alive && setState({ status: "ok", data })).catch(
      (e: unknown) => alive && setState({ status: "error", error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      alive = false;
    };
  }, [cfg.status, url, pathError, kind, dossier]);

  return state;
}

/** Vide le cache (utile après une bascule live / fixtures). */
export function clearDataCache(): void {
  cache.clear();
}
