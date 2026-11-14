/**
 * Pont vers `contracts/index.ts` (schémas zod, propriété de P0).
 *
 * L'import passe par le module virtuel `virtual:contracts` déclaré dans
 * `vite.config.ts` : quand `contracts/index.ts` existe, il est réexporté tel
 * quel ; sinon le module est vide et `validate()` laisse passer les données sans
 * les vérifier (avec un avertissement console une seule fois). Le build ne casse
 * donc jamais, et la validation s'active dès que contracts/ est livré.
 *
 * contracts/index.ts exporte un schéma par fichier de données nommé
 * `<Kind>Schema` (`TexteSchema`, `FichesIndexSchema`...) et une map `SCHEMAS`
 * (clés « texte », « fiches-index »...). Les deux sont reconnus ici.
 */
import * as contracts from "virtual:contracts";
import type { ZodTypeAny } from "zod";

export type DataKind =
  | "config"
  | "groupes"
  | "deputes"
  | "cohesion"
  | "texte"
  | "pivots"
  | "auditions"
  | "debats"
  | "amendements"
  | "hatvp"
  | "fiche"
  | "fiches_index"
  | "note"
  // Blocs du tableau de bord (rendu-final.md) : data/<dossier>/<kind>.json
  | "verdict"
  | "nouveautes"
  | "suite"
  | "action"
  | "etat";

const registry = contracts as unknown as Record<string, unknown>;

function pascal(kind: string): string {
  return kind
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function candidates(kind: DataKind): string[] {
  const p = pascal(kind);
  const c = p.charAt(0).toLowerCase() + p.slice(1);
  return [`${p}Schema`, `${c}Schema`, p, `schema${p}`, `${kind}Schema`];
}

function isZodSchema(v: unknown): v is ZodTypeAny {
  return !!v && typeof v === "object" && typeof (v as { safeParse?: unknown }).safeParse === "function";
}

export const contractsPresent: boolean = Boolean(registry.CONTRACTS_PRESENT);

/** Le schéma zod d'un type de fichier, ou undefined s'il n'est pas (encore) exporté. */
export function schemaFor(kind: DataKind): ZodTypeAny | undefined {
  for (const name of candidates(kind)) {
    const v = registry[name];
    if (isZodSchema(v)) return v;
  }
  // Map `SCHEMAS` de contracts/index.ts, clés avec tiret (« fiches-index »).
  const schemas = registry.SCHEMAS ?? registry.schemas;
  if (schemas && typeof schemas === "object") {
    const v = (schemas as Record<string, unknown>)[kind.replace(/_/g, "-")] ?? (schemas as Record<string, unknown>)[kind];
    if (isZodSchema(v)) return v;
  }
  return undefined;
}

const warned = new Set<string>();

export type Validation<T> = { ok: true; data: T } | { ok: false; error: string };

/** Valide `raw` avec le schéma de `kind`. Sans schéma disponible, renvoie `raw` tel quel. */
export function validate<T>(kind: DataKind, raw: unknown): Validation<T> {
  const schema = schemaFor(kind);
  if (!schema) {
    if (!warned.has(kind)) {
      warned.add(kind);
      console.warn(`[contracts] aucun schéma pour « ${kind} » (contracts/index.ts ${contractsPresent ? "sans export correspondant" : "absent"}) : données non validées.`);
    }
    return { ok: true, data: raw as T };
  }
  try {
    const r = schema.safeParse(raw);
    if (r.success) return { ok: true, data: r.data as T };
    const issues = r.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`)
      .join(" ; ");
    return { ok: false, error: issues };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
