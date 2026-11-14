/// <reference types="vite/client" />

/**
 * Module virtuel fourni par `vite.config.ts` (plugin `bascule-contracts`).
 * Il réexporte `contracts/index.ts` quand ce fichier existe, sinon il est vide
 * (seul `CONTRACTS_PRESENT` vaut false). Les schémas sont lus dynamiquement par
 * `web/src/lib/contracts.ts`, d'où le typage large ici.
 */
declare module "virtual:contracts" {
  export const CONTRACTS_PRESENT: boolean;
  const schemas: Record<string, unknown>;
  export default schemas;
}
