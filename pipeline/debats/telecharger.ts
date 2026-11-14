// Téléchargements du pipeline débats par curl (sous-processus), pas par fetch de Bun : sur un clone frais,
// fetch coupe la connexion sur l'archive de 62 Mo (« The socket connection was closed unexpectedly »,
// rejeu de P0 le 14 novembre à 15 h 50) alors que curl la récupère en 2 secondes. Reprise, et taille
// vérifiée contre le Content-Length annoncé avant d'accepter un fichier.

import { existsSync, renameSync, rmSync, statSync, unlinkSync } from "node:fs";

const DELAI_MS = 2000;

function curl(args: string[]): { code: number; sortie: string; erreur: string } {
  const p = Bun.spawnSync(["curl", "-sS", "--connect-timeout", "20", "--max-time", "300", ...args]);
  return { code: p.exitCode, sortie: p.stdout.toString(), erreur: p.stderr.toString().trim() };
}

/** Content-Length annoncé par une requête HEAD (après redirections), null si absent. */
function tailleAnnoncee(url: string): number | null {
  const r = curl(["-I", "-L", url]);
  if (r.code !== 0) return null;
  const m = r.sortie.match(/content-length:\s*(\d+)/gi);
  if (!m) return null;
  const n = Number(m[m.length - 1].replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Télécharge `url` dans `chemin` (fichier temporaire puis renommage), jusqu'à `tentatives` essais.
 * Échec si le code HTTP n'est pas 2xx ou si la taille diffère de celle annoncée (quand elle l'est).
 */
export async function telechargerFichier(url: string, chemin: string, log: (s: string) => void, tentatives = 3): Promise<void> {
  const attendu = tailleAnnoncee(url);
  const tmp = `${chemin}.part`;
  let derniere = "";
  for (let i = 1; i <= tentatives; i++) {
    if (existsSync(tmp)) unlinkSync(tmp);
    const r = curl(["-L", "--fail", "-o", tmp, "-w", "%{http_code}", url]);
    const taille = existsSync(tmp) ? statSync(tmp).size : 0;
    if (r.code === 0 && /^2\d\d$/.test(r.sortie.trim()) && (attendu === null || taille === attendu)) {
      renameSync(tmp, chemin);
      return;
    }
    derniere = r.code !== 0 ? `curl ${r.code} ${r.erreur}` : `HTTP ${r.sortie.trim()}, ${taille} octets reçus${attendu !== null ? ` sur ${attendu} annoncés` : ""}`;
    log(`téléchargement ${url} : essai ${i}/${tentatives} raté (${derniere})`);
    if (i < tentatives) await Bun.sleep(DELAI_MS * i);
  }
  rmSync(tmp, { force: true });
  throw new Error(`téléchargement de ${url} impossible après ${tentatives} essais : ${derniere}`);
}

/** Corps texte d'une page, avec son code HTTP (404 rendu tel quel, pas d'exception). 2 essais sur erreur réseau. */
export async function telechargerTexte(url: string, tentatives = 2): Promise<{ status: number; body: string }> {
  let derniere = "";
  for (let i = 1; i <= tentatives; i++) {
    const tmp = `/tmp/legiscope-${process.pid}-${Date.now()}-${i}.html`;
    const r = curl(["-L", "-o", tmp, "-w", "%{http_code}", url]);
    const status = Number(r.sortie.trim());
    if (r.code === 0 && Number.isFinite(status) && status > 0) {
      const body = existsSync(tmp) ? await Bun.file(tmp).text() : "";
      rmSync(tmp, { force: true });
      return { status, body };
    }
    rmSync(tmp, { force: true });
    derniere = `curl ${r.code} ${r.erreur}`;
    if (i < tentatives) await Bun.sleep(DELAI_MS * i);
  }
  throw new Error(`${url} : ${derniere}`);
}

/** Cible d'une redirection (en-tête Location résolu par curl), null si la page ne redirige pas ou si le réseau échoue. */
export function cibleRedirection(url: string): string | null {
  const r = curl(["-o", "/dev/null", "-w", "%{redirect_url}", url]);
  const cible = r.sortie.trim();
  return r.code === 0 && /^https?:\/\//.test(cible) ? cible : null;
}
