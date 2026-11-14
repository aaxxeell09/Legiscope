// pivots.json : 5 à 15 députés les moins prévisibles des groupes divisés ou opposés à la position du client.
import type { ScrutinC } from "./lib/opendata";
import { type Dossier, type PosGroupe, type ScrutinLie, coupure, moinsJours } from "./lib/sujet";
import { ecartsDe, loyautes } from "./lib/loyaute";
import { PRODUCER, URL_AMDTS_OD, URL_SCRUTINS_OD, maintenant, r2, urlScrutin } from "./lib/commun";

export type CtxDossier = {
  d: Dossier;
  scrutins: ScrutinC[];
  lies: ScrutinLie[];
  positions: Map<string, PosGroupe>;
  sourcePositions: "scrutins" | "amendements" | "aucune";
  groupes: Map<string, { sigle: string; effectif: number }>;
  deputes: Map<string, { nom: string; prenom: string; groupe_id: string | null }>;
};

export function construirePivots(ctx: CtxDossier, mode: "general" | "auto") {
  const { d, scrutins, lies, positions, groupes, deputes } = ctx;
  const { ref, avant } = coupure(d);
  const cible = d.objectifs[0].position_cible;
  const debut = moinsJours(ref, 365);
  const connus = new Set(groupes.keys());
  const loy = loyautes(scrutins.filter((s) => avant(s.date)), debut, ref, connus);

  // Groupes visés : opposés à la cible (position = contraire), divisés, ou sans position connue.
  const vises = [...groupes.keys()].filter((g) => {
    const p = positions.get(g)?.position ?? null;
    return p !== cible;
  });

  const liesAvecSens = lies.filter((s) => s.sens !== 0);
  const baseSujet = mode === "auto" && liesAvecSens.length >= 3;
  const fenetre = scrutins.filter((s) => avant(s.date) && s.date > debut);

  type Cand = { pa: string; groupe: string; loyaute: number; score: number; ecarts: any[]; nSujet: number };
  const cands: Cand[] = [];
  for (const [pa, l] of loy) {
    const dep = deputes.get(pa);
    if (!dep || !dep.groupe_id || !vises.includes(dep.groupe_id)) continue;
    if (l.n < 30) continue;
    // Écarts sur le sujet d'abord, puis écarts généraux les plus récents.
    const eSujet = ecartsDe(pa, liesAvecSens);
    const nVotesSujet = liesAvecSens.filter((s) => s.groupes.some((g) => g.votes[pa] && g.votes[pa] !== "non_votant")).length;
    const eGen = ecartsDe(pa, fenetre).filter((e) => !eSujet.some((x) => x.scrutin.id === e.scrutin.id));
    const tous = [...eSujet, ...eGen.reverse()];
    if (tous.length === 0) continue;
    let score = 1 - l.loyaute;
    if (baseSujet && nVotesSujet >= 3) {
      // Base sujet : imprévisibilité = part des votes sur le sujet contraires au groupe, mêlée à la loyauté générale.
      score = 0.5 * (eSujet.length / nVotesSujet) + 0.5 * (1 - l.loyaute);
    }
    cands.push({
      pa,
      groupe: dep.groupe_id,
      loyaute: l.loyaute,
      score,
      nSujet: eSujet.length,
      ecarts: tous.slice(0, 5).map((e) => ({
        scrutin_id: e.scrutin.id,
        date: e.scrutin.date,
        titre: e.scrutin.titre.replace(/^./, (c) => c.toUpperCase()),
        vote: e.vote,
        position_groupe: e.position_groupe,
        groupe_id_au_vote: e.groupe_id,
        url: urlScrutin(e.scrutin.numero),
      })),
    });
  }
  // Tri par score, au plus 4 par groupe pour couvrir plusieurs groupes.
  cands.sort((a, b) => b.score - a.score);
  const parGroupe = new Map<string, number>();
  const choisis: Cand[] = [];
  for (const c of cands) {
    if ((parGroupe.get(c.groupe) ?? 0) >= 4) continue;
    parGroupe.set(c.groupe, (parGroupe.get(c.groupe) ?? 0) + 1);
    choisis.push(c);
    if (choisis.length >= 15) break;
  }
  const base = baseSujet ? "sujet" : "general";
  const visesTxt = vises.map((g) => `${groupes.get(g)?.sigle ?? g} (${positions.get(g)?.position ?? "position inconnue"})`).join(", ");
  return {
    meta: {
      generated_at: maintenant(),
      sources: [
        { label: "Scrutins publics, open data Assemblée nationale", url: URL_SCRUTINS_OD },
        { label: "Amendements, open data Assemblée nationale", url: URL_AMDTS_OD },
      ],
      limits:
        `Base ${base}. Loyauté sur 12 mois avant le ${ref} (${fenetre.length} scrutins, votes exprimés seulement, position majoritaire du groupe au moment du vote). ` +
        `${liesAvecSens.length} scrutins nominatifs liés au sujet avec un sens lisible sur la mesure. ` +
        `Groupes visés (position sur la mesure opposée ou différente de « ${cible} ») : ${visesTxt}. ` +
        `Au plus 4 députés par groupe ; députés en exercice seulement ; au moins 30 votes exprimés.` +
        (base === "sujet" ? " Score = moitié part des votes sujet contraires au groupe, moitié 1 moins la loyauté générale." : " Score = 1 moins la loyauté générale."),
      producer: PRODUCER,
      dossier_id: d.id,
    },
    deputes: choisis.map((c, i) => ({
      id: c.pa,
      groupe_id: c.groupe,
      rang: i + 1,
      score_imprevisibilite: r2(c.score),
      loyaute_12m: r2(c.loyaute),
      base: (base === "sujet" && c.nSujet > 0 ? "sujet" : "general") as "sujet" | "general",
      ecarts: c.ecarts,
    })),
  };
}
