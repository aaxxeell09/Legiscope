import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, cpSync, rmSync, statSync, createReadStream } from "node:fs";
import { join, resolve, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
// BASCULE_CONTRACTS_DIR : remplace `contracts/` (tests du build sans contrats).
const contractsDir = process.env.BASCULE_CONTRACTS_DIR ? resolve(process.env.BASCULE_CONTRACTS_DIR) : resolve(repoRoot, "contracts");
const fixturesDir = resolve(contractsDir, "fixtures");
// BASCULE_DATA_DIR : remplace `data/` par un autre dossier (tests, captures).
const dataDir = process.env.BASCULE_DATA_DIR ? resolve(process.env.BASCULE_DATA_DIR) : resolve(repoRoot, "data");
const outDir = resolve(repoRoot, "dist");

const MIME: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

/**
 * Sert `contracts/fixtures/` sous `/fixtures/` en dev, et le copie dans
 * `dist/fixtures/` au build. Les données réelles (`data/`) passent par
 * `publicDir` et sont servies à la racine (`/config.json`, `/<dossier>/texte.json`).
 * Le dossier `data/raw/` (réponses brutes de l'API, volumineux) est retiré de `dist/`.
 */
function fixturesPlugin(): Plugin {
  const rejectMissingJson = (root: string) => (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => {
    const url = (req.url ?? "").split("?")[0] ?? "";
    if (!url.endsWith(".json") || url.startsWith("/fixtures/")) return next();
    const rel = normalize(decodeURIComponent(url.slice(1)));
    if (rel.startsWith("..")) {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({ error: "chemin JSON interdit" }));
    }
    const file = join(root, rel);
    if (existsSync(file) && statSync(file).isFile()) return next();
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ error: `fichier JSON absent : /${rel}` }));
  };
  return {
    name: "legispot-fixtures",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0] ?? "";
        if (!url.startsWith("/fixtures/")) return next();
        const rel = normalize(decodeURIComponent(url.slice("/fixtures/".length)));
        if (rel.startsWith("..")) {
          res.statusCode = 403;
          return res.end();
        }
        const file = join(fixturesDir, rel);
        if (!existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          return res.end(`fixture absente : contracts/fixtures/${rel}`);
        }
        res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
        res.setHeader("Cache-Control", "no-store");
        createReadStream(file).pipe(res);
      });
      server.middlewares.use(rejectMissingJson(dataDir));
    },
    configurePreviewServer(server) {
      server.middlewares.use(rejectMissingJson(outDir));
    },
    closeBundle() {
      if (existsSync(fixturesDir)) {
        cpSync(fixturesDir, join(outDir, "fixtures"), { recursive: true });
      }
      // Copie de data/ sans data/raw (2 à 3 Go de réponses brutes) : copyPublicDir est désactivé,
      // sinon Vite copiait tout puis on supprimait, ce qui remplissait le disque.
      if (existsSync(dataDir)) {
        cpSync(dataDir, outDir, { recursive: true, filter: (src) => !src.startsWith(join(dataDir, "raw")) });
      }
      rmSync(join(outDir, "raw"), { recursive: true, force: true });
    },
  };
}

/**
 * Module virtuel `virtual:contracts` : réexporte `contracts/index.ts` s'il existe,
 * sinon un module vide. Le front importe les schémas zod par ce module, ce qui
 * laisse le build vert tant que `contracts/` n'est pas livré.
 */
function contractsPlugin(): Plugin {
  const id = "virtual:contracts";
  const resolved = "\0" + id;
  const entry = resolve(contractsDir, "index.ts");
  return {
    name: "legispot-contracts",
    resolveId(source) {
      return source === id ? resolved : null;
    },
    load(source) {
      if (source !== resolved) return null;
      if (existsSync(entry)) {
        return `export * from ${JSON.stringify(entry)};\nexport const CONTRACTS_PRESENT = true;\n`;
      }
      return `export const CONTRACTS_PRESENT = false;\n`;
    },
  };
}

export default defineConfig({
  root: "web",
  publicDir: dataDir,
  plugins: [react(), fixturesPlugin(), contractsPlugin()],
  resolve: {
    alias: {
      "@contracts": contractsDir,
      "@web": resolve(repoRoot, "web/src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    fs: {
      allow: [repoRoot, contractsDir],
    },
  },
  build: {
    // data/ est copié par le plugin sans data/raw (closeBundle) ; Vite ne doit pas copier publicDir en entier.
    copyPublicDir: false,
    outDir,
    emptyOutDir: true,
  },
});
