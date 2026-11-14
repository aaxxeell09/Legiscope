// Vérificateur de chiffres (PLAN.md, règle 5.13).
// Tout nombre d'un texte rédigé doit figurer dans la liste autorisée.

export type ResultatVerif = { ok: boolean; fautifs: string[] };

const MOTS_NOMBRES: Record<string, number> = {
  deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  "dix-sept": 17, "dix-huit": 18, "dix-neuf": 19, vingt: 20, trente: 30, quarante: 40,
  cinquante: 50, soixante: 60, "soixante-dix": 70, "quatre-vingt": 80, "quatre-vingts": 80,
  "quatre-vingt-dix": 90, cent: 100, cents: 100, mille: 1000, million: 1e6, millions: 1e6,
  milliard: 1e9, milliards: 1e9,
};

const ANNEES_TOUJOURS_PERMISES = [2024, 2025, 2026, 2027];

/** Étape 1 : espaces fines et insécables retirées des nombres, virgule décimale en point. */
export function normaliser(texte: string): string {
  return texte
    .replace(/(\d)[    ](?=\d{3}(?!\d))/g, "$1")
    .replace(/(\d)[    ](?=\d{3}(?!\d))/g, "$1")
    .replace(/(\d),(\d)/g, "$1.$2");
}

/** Étape 2 : jetons numériques du texte normalisé (nombres et ordinaux). */
export function extraireJetons(texteNormalise: string): { jeton: string; valeur: number }[] {
  const out: { jeton: string; valeur: number }[] = [];
  const re = /(?<![\p{L}\d])\d+(?:\.\d+)?(?:er|ère|ème|eme|e)?(?![\p{L}\d])/gu;
  for (const m of texteNormalise.matchAll(re)) {
    const jeton = m[0];
    const valeur = Number.parseFloat(jeton);
    if (Number.isFinite(valeur)) out.push({ jeton, valeur });
  }
  return out;
}

/**
 * Étape 3 : liste autorisée étendue.
 *  - chaque entrée numérique telle quelle ;
 *  - une probabilité p (0 < p < 1 avec décimales) aussi sous la forme p × 100 (« 0.71 » → 71) ;
 *  - une date ISO (AAAA-MM-JJ ou AAAA-MM) éclatée en jour, mois, année ;
 *  - les années 2024 à 2027 toujours permises.
 */
export function etendreAutorises(autorises: string[]): Set<number> {
  const set = new Set<number>(ANNEES_TOUJOURS_PERMISES);
  for (const brut of autorises) {
    const s = normaliser(String(brut)).trim();
    const date = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
    if (date) {
      set.add(Number(date[1]));
      set.add(Number(date[2]));
      if (date[3]) set.add(Number(date[3]));
      continue;
    }
    const n = Number.parseFloat(s.replace(/\s*%$/, ""));
    if (!Number.isFinite(n)) continue;
    set.add(n);
    if (n > 0 && n < 1) set.add(Math.round(n * 100));
    if (/%$/.test(s)) set.add(n / 100);
  }
  return set;
}

function autorise(set: Set<number>, valeur: number): boolean {
  if (set.has(valeur)) return true;
  // Tolérance d'arrondi (0.71 écrit 0.710, 71 % écrit 71.0).
  for (const v of set) if (Math.abs(v - valeur) < 1e-9) return true;
  return false;
}

/** Étape 4 : nombres en lettres (un / une tolérés). */
export function extraireMotsNombres(texte: string): { jeton: string; valeur: number }[] {
  const out: { jeton: string; valeur: number }[] = [];
  const mots = Object.keys(MOTS_NOMBRES).sort((a, b) => b.length - a.length).join("|");
  const re = new RegExp(`(?<![\\p{L}-])(${mots})(?![\\p{L}-])`, "giu");
  for (const m of texte.matchAll(re)) {
    const cle = m[1].toLowerCase();
    out.push({ jeton: m[0], valeur: MOTS_NOMBRES[cle] });
  }
  return out;
}

/**
 * Vérifie que tout nombre de `texte` figure dans `autorises`.
 * Renvoie les jetons fautifs tels qu'ils apparaissent dans le texte.
 */
export function verifierChiffres(texte: string, autorises: string[]): ResultatVerif {
  const set = etendreAutorises(autorises);
  const normalise = normaliser(texte);
  const fautifs: string[] = [];
  for (const { jeton, valeur } of extraireJetons(normalise)) {
    if (!autorise(set, valeur)) fautifs.push(jeton);
  }
  for (const { jeton, valeur } of extraireMotsNombres(normalise)) {
    if (!autorise(set, valeur)) fautifs.push(jeton);
  }
  return { ok: fautifs.length === 0, fautifs: [...new Set(fautifs)] };
}
