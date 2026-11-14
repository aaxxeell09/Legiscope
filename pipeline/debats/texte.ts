// Outils texte : normalisation sans accents, mots-clés, découpage en phrases, extrait de 1 à 3 phrases.

export function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Espaces, apostrophes et tirets ramenés à une forme unique : sert à comparer une citation au texte source. */
export function normaliserComparaison(s: string): string {
  return sansAccents(s)
    .replace(/[’‘`´]/g, "'")
    .replace(/[«»"“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/ | | /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Regex sur le texte sans accents : chaque mot-clé en entier (frontières de mot). */
export function regexMotsCles(motsCles: string[]): RegExp {
  const parts = motsCles.map((m) => sansAccents(m).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"));
  return new RegExp(`(^|[^a-z0-9])(${parts.join("|")})(?=$|[^a-z0-9])`, "i");
}

export function contientMotCle(texte: string, re: RegExp): boolean {
  return re.test(sansAccents(texte));
}

/** Découpe en phrases (point, point d'interrogation, point d'exclamation, suivis d'un espace et d'une majuscule ou d'un guillemet). */
export function phrases(texte: string): string[] {
  const t = texte.replace(/\s+/g, " ").trim();
  if (!t) return [];
  const out: string[] = [];
  let debut = 0;
  const re = /[.!?…](?=\s+(?:[A-ZÀ-ÝŒ«"]|\d))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const fin = m.index + 1;
    const ph = t.slice(debut, fin).trim();
    if (ph) out.push(ph);
    debut = fin;
  }
  const reste = t.slice(debut).trim();
  if (reste) out.push(reste);
  return out;
}

/**
 * Extrait de 1 à 3 phrases autour de la première phrase qui contient un mot-clé
 * (ou les premières phrases si aucune ne le contient). Jamais plus de `maxChars`.
 */
export function extrait(texte: string, re: RegExp | null, maxChars = 450): string {
  const ph = phrases(texte);
  if (ph.length === 0) return "";
  let centre = 0;
  if (re) {
    const i = ph.findIndex((p) => contientMotCle(p, re));
    if (i >= 0) centre = i;
  }
  // Fenêtre : la phrase centrale, puis on ajoute la suivante puis la précédente tant que ça tient.
  let a = centre;
  let b = centre;
  let courant = ph[centre];
  if (b + 1 < ph.length && (courant + " " + ph[b + 1]).length <= maxChars) {
    b += 1;
    courant = courant + " " + ph[b];
  }
  if (a - 1 >= 0 && (ph[a - 1] + " " + courant).length <= maxChars) {
    a -= 1;
    courant = ph[a] + " " + courant;
  }
  if (courant.length > maxChars) courant = courant.slice(0, maxChars - 1).replace(/\s+\S*$/, "") + "…";
  return courant;
}

/** Vrai si `citation` se retrouve mot pour mot (aux espaces et apostrophes près) dans `source`. */
export function citationDansSource(citation: string, source: string): boolean {
  const c = normaliserComparaison(citation).replace(/…$/, "").trim();
  if (c.length < 15) return false;
  return normaliserComparaison(source).includes(c);
}

/** Année d'un libellé « PLF 2026 » ou « loi de finances pour 2026 », sinon null. */
export function anneePLF(label: string): number | null {
  const m = label.match(/\b(?:PLF|finances pour|budget)\s*(20\d\d)\b/i);
  return m ? Number(m[1]) : null;
}
