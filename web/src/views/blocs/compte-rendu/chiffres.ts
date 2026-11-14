/**
 * Repérage des nombres d'un texte rédigé pour les souligner, avec la même
 * normalisation que le vérificateur (PLAN.md, règle 5.13) : espaces fines ou
 * insécables entre groupes de trois chiffres retirées, virgule décimale en point,
 * probabilité p aussi lue p × 100, date ISO éclatée en jour, mois, année.
 * Le front n'importe pas qa/ : la règle est recopiée ici, sur le texte d'origine
 * pour garder les positions.
 */

const ANNEES_TOUJOURS_PERMISES = [2024, 2025, 2026, 2027];
const ESPACES = "[    ]";

function normaliser(s: string): string {
  return s
    .replace(new RegExp(`(\\d)${ESPACES}(?=\\d{3}(?!\\d))`, "g"), "$1")
    .replace(new RegExp(`(\\d)${ESPACES}(?=\\d{3}(?!\\d))`, "g"), "$1")
    .replace(/(\d),(\d)/g, "$1.$2");
}

/** Prédicat « cette valeur figure dans chiffres_utilises » (liste étendue comme qa/verif.ts). */
export function chiffresAutorises(autorises: string[]): (v: number) => boolean {
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
  return (v) => {
    if (set.has(v)) return true;
    for (const x of set) if (Math.abs(x - v) < 1e-9) return true;
    return false;
  };
}

export type Morceau = { texte: string; chiffre: boolean; valeur: number | null };

// Un nombre : groupes de trois séparés par une espace fine ou insécable, décimale à virgule ou point, ordinal collé.
const RE_NOMBRE = new RegExp(
  `(?<![\\p{L}\\d])\\d{1,3}(?:${ESPACES}\\d{3})+(?:[.,]\\d+)?(?:er|ère|ème|eme|e)?(?![\\p{L}\\d])|(?<![\\p{L}\\d])\\d+(?:[.,]\\d+)?(?:er|ère|ème|eme|e)?(?![\\p{L}\\d])`,
  "gu",
);

/** Découpe le texte en morceaux, chaque nombre isolé avec sa valeur normalisée. */
export function decouperChiffres(texte: string): Morceau[] {
  const out: Morceau[] = [];
  let pos = 0;
  for (const m of texte.matchAll(RE_NOMBRE)) {
    const i = m.index ?? 0;
    if (i > pos) out.push({ texte: texte.slice(pos, i), chiffre: false, valeur: null });
    const v = Number.parseFloat(normaliser(m[0]));
    out.push({ texte: m[0], chiffre: true, valeur: Number.isFinite(v) ? v : null });
    pos = i + m[0].length;
  }
  if (pos < texte.length) out.push({ texte: texte.slice(pos), chiffre: false, valeur: null });
  return out;
}
