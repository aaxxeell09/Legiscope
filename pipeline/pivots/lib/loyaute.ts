// Loyauté de chaque député envers son groupe (au moment du vote), sur une fenêtre de dates.
import type { ScrutinC } from "./opendata";

export type Loyaute = { depute_id: string; groupe_id: string; n: number; loyal: number; loyaute: number };

/** Loyauté = part des votes exprimés (pour, contre, abstention) identiques à la position majoritaire du groupe. */
export function loyautes(scrutins: ScrutinC[], debut: string, fin: string, groupesConnus: Set<string>): Map<string, Loyaute> {
  const acc = new Map<string, { n: number; loyal: number; groupes: Map<string, number> }>();
  for (const s of scrutins) {
    if (s.date <= debut || s.date > fin) continue;
    for (const g of s.groupes) {
      if (!groupesConnus.has(g.id)) continue; // non-inscrits exclus
      if (!g.position || !["pour", "contre", "abstention"].includes(g.position)) continue;
      for (const [pa, v] of Object.entries(g.votes)) {
        if (v === "non_votant") continue;
        const a = acc.get(pa) ?? { n: 0, loyal: 0, groupes: new Map() };
        a.n++;
        if (v === g.position) a.loyal++;
        a.groupes.set(g.id, (a.groupes.get(g.id) ?? 0) + 1);
        acc.set(pa, a);
      }
    }
  }
  const res = new Map<string, Loyaute>();
  for (const [pa, a] of acc) {
    const groupe = [...a.groupes.entries()].sort((x, y) => y[1] - x[1])[0][0];
    res.set(pa, { depute_id: pa, groupe_id: groupe, n: a.n, loyal: a.loyal, loyaute: a.loyal / a.n });
  }
  return res;
}

export type EcartBrut = { scrutin: ScrutinC; vote: string; position_groupe: string | null; groupe_id: string };

/** Votes d'un député différents de la position majoritaire de son groupe au moment du vote. */
export function ecartsDe(pa: string, scrutins: ScrutinC[]): EcartBrut[] {
  const res: EcartBrut[] = [];
  for (const s of scrutins) {
    for (const g of s.groupes) {
      const v = g.votes[pa];
      if (!v || v === "non_votant") continue;
      if (!g.position || !["pour", "contre", "abstention"].includes(g.position)) continue;
      if (v !== g.position) res.push({ scrutin: s, vote: v, position_groupe: g.position, groupe_id: g.id });
    }
  }
  return res;
}
