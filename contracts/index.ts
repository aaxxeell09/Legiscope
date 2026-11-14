// Point d'entrée des contrats : schémas zod, types inférés, map nom → schéma,
// chemins des fichiers de data/. Aucun type manuel ailleurs dans le dépôt.

export * from "./schemas/enums";
export * from "./schemas/meta";
export * from "./schemas/config";
export * from "./schemas/groupes";
export * from "./schemas/deputes";
export * from "./schemas/cohesion";
export * from "./schemas/texte";
export * from "./schemas/pivots";
export * from "./schemas/auditions";
export * from "./schemas/debats";
export * from "./schemas/amendements";
export * from "./schemas/hatvp";
export * from "./schemas/fiche";
export * from "./schemas/fiches-index";
export * from "./schemas/note";
export * from "./schemas/preuve";
export * from "./schemas/verdict";
export * from "./schemas/nouveautes";
export * from "./schemas/suite";
export * from "./schemas/action";
export * from "./schemas/etat";

import { ConfigSchema } from "./schemas/config";
import { GroupesSchema } from "./schemas/groupes";
import { DeputesSchema } from "./schemas/deputes";
import { CohesionSchema } from "./schemas/cohesion";
import { TexteSchema } from "./schemas/texte";
import { PivotsSchema } from "./schemas/pivots";
import { AuditionsSchema } from "./schemas/auditions";
import { DebatsSchema } from "./schemas/debats";
import { AmendementsSchema } from "./schemas/amendements";
import { HatvpSchema } from "./schemas/hatvp";
import { FicheSchema } from "./schemas/fiche";
import { FichesIndexSchema } from "./schemas/fiches-index";
import { NoteSchema } from "./schemas/note";
import { VerdictSchema } from "./schemas/verdict";
import { NouveautesSchema } from "./schemas/nouveautes";
import { SuiteSchema } from "./schemas/suite";
import { ActionSchema } from "./schemas/action";
import { EtatSchema } from "./schemas/etat";

/** Nom logique de chaque fichier de `data/`. */
export const SCHEMAS = {
  config: ConfigSchema,
  groupes: GroupesSchema,
  deputes: DeputesSchema,
  cohesion: CohesionSchema,
  texte: TexteSchema,
  pivots: PivotsSchema,
  auditions: AuditionsSchema,
  debats: DebatsSchema,
  amendements: AmendementsSchema,
  hatvp: HatvpSchema,
  fiche: FicheSchema,
  "fiches-index": FichesIndexSchema,
  note: NoteSchema,
  verdict: VerdictSchema,
  nouveautes: NouveautesSchema,
  suite: SuiteSchema,
  action: ActionSchema,
  etat: EtatSchema,
} as const;

export type Kind = keyof typeof SCHEMAS;

/** Fichiers de la racine de `data/` (le paramètre dossierId est ignoré). */
export const ROOT_KINDS = ["config", "groupes", "deputes", "cohesion"] as const satisfies readonly Kind[];
/** Fichiers propres à un dossier, un seul par dossier. */
export const DOSSIER_KINDS = ["texte", "pivots", "hatvp", "note", "fiches-index", "verdict", "nouveautes", "suite", "action", "etat"] as const satisfies readonly Kind[];
/** Fichiers propres à un dossier et à un député (`<PA>.json`). */
export const PA_KINDS = ["auditions", "debats", "amendements", "fiche"] as const satisfies readonly Kind[];

/**
 * Chemin relatif (depuis la racine du dépôt) du fichier JSON demandé.
 *
 *   dataPath(null, "cohesion")                      → "data/cohesion.json"
 *   dataPath("petits-colis", "texte")               → "data/petits-colis/texte.json"
 *   dataPath("petits-colis", "fiches-index")        → "data/petits-colis/fiches/index.json"
 *   dataPath("petits-colis", "fiche", "PA720892")   → "data/petits-colis/fiches/PA720892.json"
 *
 * `root` remplace le préfixe `data` (par exemple `contracts/fixtures`).
 */
export function dataPath(dossierId: string | null, kind: Kind, pa?: string, root = "data"): string {
  if ((ROOT_KINDS as readonly string[]).includes(kind)) return `${root}/${kind}.json`;
  if (!dossierId) throw new Error(`dataPath: dossierId requis pour ${kind}`);
  if (kind === "fiches-index") return `${root}/${dossierId}/fiches/index.json`;
  if ((PA_KINDS as readonly string[]).includes(kind)) {
    if (!pa) throw new Error(`dataPath: identifiant PA requis pour ${kind}`);
    const dir = kind === "fiche" ? "fiches" : kind;
    return `${root}/${dossierId}/${dir}/${pa}.json`;
  }
  return `${root}/${dossierId}/${kind}.json`;
}
