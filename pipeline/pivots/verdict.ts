// verdict.json : un verdict par objectif, mécanique et sourcé (PLAN 5.15). La phrase de lecture passe par redigerVerifie (P8) avec le prompt X3.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type AmdtSujet, type CtxDossierPlus, coupure, moinsJours, positionsDepuisAmendements, positionsDepuisScrutins } from "./lib/sujet";
import { DATA, PRODUCER, URL_AMDTS_OD, URL_SCRUTINS_OD, lireJson, maintenant, r2, urlScrutin } from "./lib/commun";
import { sortUnifie, articleMesure } from "./definitif";
import { redigerVerifie } from "../lib/llm";
import { extraireJetons, extraireMotsNombres, normaliser } from "../lib/verif";
import { ROOT, sansAccents } from "./lib/opendata";

const SEUIL_FAVORABLE = 0.55;
const SEUIL_DEFAVORABLE = 0.4;
const POIDS_ORCET = 0.3; // part de la moyenne Orcet dans le score quand des amendements en attente portent la position
const RE_REDUIRE = /\b(abaiss|reduir|reduit|exclu|exoner|exempt|limit|plafonn|assiette|seuil|montant|taux)/;
const RE_REPORTER = /\b(report|differ|entree en vigueur|1er janvier 20\d\d|1er juillet 20\d\d|date d.application|a compter du)/;

type Pos = "pour" | "contre" | "abstention" | "divise" | null;

/** Score = part pondérée par les sièges des groupes de position connue qui vont dans le sens de la cible ; divisé ou abstention = moitié. */
function scoreSieges(pos: Map<string, Pos>, cible: "pour" | "contre", effectifs: Map<string, number>) {
  let ok = 0, tot = 0, n = 0;
  for (const [g, p] of pos) {
    if (!p) continue;
    const e = effectifs.get(g) ?? 0;
    n++;
    tot += e;
    if (p === cible) ok += e;
    else if (p === "divise" || p === "abstention") ok += e / 2;
  }
  return { score: tot ? ok / tot : null, nConnus: n };
}

const situationDe = (s: number | null, nConnus: number) =>
  s === null || nConnus < 3 ? "insuffisant" : s >= SEUIL_FAVORABLE ? "favorable" : s < SEUIL_DEFAVORABLE ? "defavorable" : "incertaine";

function orcetMoyen(ctx: CtxDossierPlus, amdts: AmdtSujet[], date: string) {
  const vals: number[] = [];
  for (const a of amdts) {
    const t = lireJson(join(DATA, "raw", ctx.d.id, "orcet", `${a.id}.json`));
    if (t && typeof t.moyenne_probabilites_pour === "number" && String(t.predit_le ?? "").slice(0, 10) <= date) vals.push(t.moyenne_probabilites_pour);
  }
  return vals.length ? { moyenne: vals.reduce((x, y) => x + y, 0) / vals.length, n: vals.length } : null;
}

function gabarit(id: string): string {
  const md = readFileSync(join(ROOT, "pipeline", "verdict", "prompts", "gabarit-lecture.md"), "utf8");
  const m = md.match(new RegExp("```gabarit id=" + id.replace(/\./g, "\\.") + "\\n([\\s\\S]*?)\\n```"));
  return m ? m[1].trim() : "";
}
const sansPoint = (s: string) => s.trim().replace(/\.$/, "");
function remplir(t: string, v: Record<string, string | number>) {
  return t.replace(/\{\{(\w+)\}\}/g, (_, k) => String(v[k] ?? ""));
}
function nombres(s: string): string[] {
  const n = normaliser(s);
  return [...new Set([...extraireJetons(n), ...extraireMotsNombres(n)].map((j) => String(j.valeur)))];
}

export async function construireVerdict(ctx: CtxDossierPlus, etat: any, texte: any, ga: any) {
  const { d, groupes, positions, sourcePositions, lies, amdts, deputes } = ctx;
  const { ref, avant, depot } = coupure(d);
  const effectifs = new Map([...groupes].map(([g, x]) => [g, x.effectif]));
  const sigle = (g: string | null) => (g ? groupes.get(g)?.sigle ?? g : "non-inscrit");
  const gouv = ga.decideurs.find((x: any) => x.role === "gouvernement");
  const rg = ga.decideurs.find((x: any) => x.role === "rapporteur_general");
  const art = articleMesure(d);
  const nouveautes = lireJson(join(DATA, d.id, "nouveautes.json"));
  const urlTexte = texte.texte.url;
  const verdicts: any[] = [];

  // Positions à J-7 pour la tendance (mêmes règles, données au plus tard sept jours plus tôt).
  const j7 = moinsJours(ref, 7);
  const avant7 = (x: string | null | undefined) => !!x && x.slice(0, 10) <= j7;
  const lies7 = lies.filter((s) => avant7(s.date));
  const pos7brut = sourcePositions === "scrutins" ? positionsDepuisScrutins(lies7) : positionsDepuisAmendements(amdts, avant7);  // à J-7 : dépôts au plus tard J-7
  const pos7 = new Map([...pos7brut].filter(([g]) => groupes.has(g)));

  const enAttente = (a: AmdtSujet) => a.texte === d.mesure.texte_id && depot(a.dateDepot) && sortUnifie(a, avant as any).sort === "en_attente" && (!!a.auteur || a.typeAuteur !== "Député");
  const nGroupes = groupes.size;
  const cpt = (p: Map<string, any>) => {
    const v = [...groupes.keys()].map((g) => p.get(g)?.position ?? null);
    return { pour: v.filter((x) => x === "pour").length, contre: v.filter((x) => x === "contre").length, autres: v.filter((x) => x !== "pour" && x !== "contre").length };
  };

  for (const obj of d.objectifs) {
    const cible = obj.position_cible;
    const favorable: any[] = [], bloquant: any[] = [], etabli: string[] = [], inconnu: string[] = [];
    const rejets: string[] = [];
    let base: Map<string, Pos>, base7: Map<string, Pos>, porteurs: AmdtSujet[];
    let niveau: "elevee" | "moyenne" | "faible";

    if (obj.rang === 1) {
      base = new Map([...positions].map(([g, p]) => [g, p.position]));
      base7 = new Map([...pos7].map(([g, p]) => [g, p.position]));
      // Amendements en attente qui portent la position du client (contre = suppriment ou réduisent la mesure).
      porteurs = amdts.filter((a) => ctx.natures.get(a.id) === (cible === "contre" ? "supprime" : "aggrave"));
      niveau = sourcePositions === "scrutins" ? "elevee" : sourcePositions === "amendements" ? "moyenne" : "faible";
    } else {
      // Repli : amendements qui réduisent (rang 2) ou reportent (rang 3) la mesure.
      // Nature lue dans texte.json : réduire = « reduit », repousser = « reporte » ; « aggrave » compte contre le client.
      const voulue = /repouss|report|differ|entree en vigueur|application/.test(sansAccents(obj.texte)) ? "reporte" : "reduit";
      porteurs = amdts.filter((a) => ctx.natures.get(a.id) === voulue);
      const opposes = amdts.filter((a) => ctx.natures.get(a.id) === (cible === "contre" ? "aggrave" : "supprime"));
      const fabrique = (f: (x: string | null | undefined) => boolean) => {
        const m = new Map<string, Pos>();
        // Soutien du repli : groupes auteurs d'amendements de repli, ou contre la mesure. Opposition : groupes qui la renforcent.
        for (const a of porteurs) if (a.groupe && groupes.has(a.groupe) && f(a.dateDepot)) m.set(a.groupe, cible);
        const p = f === depot ? positions : pos7;
        for (const [g, x] of p) if (x.position === cible && !m.has(g)) m.set(g, cible);
        for (const a of opposes) if (a.groupe && groupes.has(a.groupe) && f(a.dateDepot) && !m.has(a.groupe)) m.set(a.groupe, cible === "contre" ? "pour" : "contre");
        return m;
      };
      base = fabrique(depot);
      base7 = fabrique(avant7);
      niveau = porteurs.some((a) => depot(a.dateDepot)) ? "moyenne" : "faible";
    }

    const s0 = scoreSieges(base, cible, effectifs);
    const s7 = scoreSieges(base7, cible, effectifs);
    const pend = porteurs.filter((a) => enAttente(a));
    const orc = orcetMoyen(ctx, pend, ref);
    // proba_pour d'un amendement qui porte la position du client : plus elle est haute, mieux c'est pour lui.
    const corrige = (s: number | null) => (s === null ? null : orc ? (1 - POIDS_ORCET) * s + POIDS_ORCET * orc.moyenne : s);
    const score = corrige(s0.score);
    const score7 = corrige(s7.score);
    const situation = situationDe(score, s0.nConnus);
    let tendance: "amelioration" | "stable" | "degradation" = "stable";
    if (score !== null && score7 !== null) tendance = score - score7 > 0.03 ? "amelioration" : score7 - score > 0.03 ? "degradation" : "stable";

    // ---- confiance ----
    const connus = [...base].filter(([, p]) => p).map(([g]) => g);
    const nLies = lies.filter((s) => s.sens).length;
    if (obj.rang === 1) {
      if (sourcePositions === "scrutins") etabli.push(`Positions de ${connus.length} groupes sur ${nLies} scrutins nominatifs liés à la mesure`);
      else etabli.push(`Positions de ${connus.length} groupes lues sur leurs amendements à la mesure (aucun scrutin nominatif lié au plus tard le ${ref})`);
    } else etabli.push(`${porteurs.filter((a) => depot(a.dateDepot)).length} amendements de repli déposés au plus tard le ${ref}`);
    if (gouv && gouv.position !== "inconnue") etabli.push(`Le gouvernement est ${gouv.position} la mesure`);
    if (etat?.texte_etat && etat?.mesure && (etat.texte_etat.statut !== "en_discussion" || etat.mesure.dans_le_texte === false)) {
      etabli.push(`État du texte : ${etat.texte_etat.libelle}`);
      etabli.push(`État de la mesure : ${etat.mesure.dans_le_texte ? "dans le texte" : "absente du texte"}`);
    }
    const inconnus = [...groupes.keys()].filter((g) => !base.get(g)).map(sigle);
    if (inconnus.length) inconnu.push(`Position sur la mesure de : ${inconnus.join(", ")} (aucun acte de groupe lisible)`);
    const divises = [...base].filter(([, p]) => p === "divise").map(([g]) => sigle(g));
    if (divises.length) inconnu.push(`Vote des groupes divisés : ${divises.join(", ")}`);
    inconnu.push("Avis du rapporteur et du gouvernement sur les amendements : non publiés dans l'open data");
    if (orc) etabli.push(`Prédiction Orcet sur ${orc.n} amendement(s) en attente qui portent la position du client`);

    // ---- favorable et bloquant ----
    const groupesCible = connus.filter((g) => base.get(g) === cible);
    const groupesOpp = connus.filter((g) => base.get(g) && base.get(g) !== cible && base.get(g) !== "divise" && base.get(g) !== "abstention");
    const srcPos = sourcePositions === "scrutins" && obj.rang === 1
      ? lies.filter((s) => s.sens).slice(-3).map((s) => ({ label: `Scrutin n° ${s.numero}`, url: urlScrutin(s.numero) }))
      : [{ label: "Amendements, open data", url: URL_AMDTS_OD }];
    if (art === null && obj.rang === 1 && etat?.mesure && etat.mesure.dans_le_texte === false) {
      (cible === "contre" ? favorable : bloquant).push({
        titre: "La taxe ne figure pas dans le texte du gouvernement",
        detail: etat.mesure.redaction_actuelle,
        preuve: { sources: [etat.mesure.modifications.at(-1)?.preuve.sources[0] ?? { label: "Texte", url: urlTexte }, ...etat.mesure.modifications.slice(0, 2).map((m: any) => ({ label: m.par.split(",")[0], url: m.url }))], raisonnement: "Le texte transmis au Sénat est celui du gouvernement, sans la taxe ; les amendements qui la créaient ont été rejetés ou sont tombés avec le texte.", nature: "fait" },
      });
    }
    // Amendements en attente qui portent la position du client : le plus soutenu (groupe le plus nombreux) d'abord.
    const pendTri = [...pend].sort((a, b) => (effectifs.get(b.groupe ?? "") ?? 0) - (effectifs.get(a.groupe ?? "") ?? 0) || Number(/^supprimer/i.test(b.dispositif)) - Number(/^supprimer/i.test(a.dispositif)));
    for (const a of pendTri.slice(0, 2)) {
      const pr = orcetMoyen(ctx, [a], ref);
      const supp = /^supprimer cet article/i.test(a.dispositif);
      favorable.push({
        titre: `${supp ? `Amendement de suppression de l'article ${a.article.replace(/^ART\. /, "")}` : `Amendement n° ${a.numero}`} déposé par le groupe ${sigle(a.groupe)}`,
        detail: `Amendement n° ${a.numero}${a.auteur && deputes.get(a.auteur) ? ` de ${deputes.get(a.auteur)!.prenom} ${deputes.get(a.auteur)!.nom}` : ""}, en attente au ${ref}${supp ? "" : ` : ${a.sens_raison}`}.${pr ? ` Orcet : moyenne des probabilités individuelles de voter pour ${r2(pr.moyenne)}, pas une probabilité d'adoption.` : ""}`,
        preuve: { sources: [{ label: `Amendement n° ${a.numero}`, url: a.url }], raisonnement: `Déposé le ${a.dateDepot}, pas encore examiné à la date de référence ; il porte la position du client sur la mesure (${a.sens_raison}).`, nature: "fait" },
      });
    }
    if (groupesCible.length) favorable.push({
      titre: `${groupesCible.map(sigle).join(", ")} ${obj.rang === 1 ? (cible === "contre" ? "contre la mesure" : "pour la mesure") : "dans le sens de cet objectif"}`,
      detail: `${groupesCible.length} groupe(s), ${groupesCible.reduce((x, g) => x + (effectifs.get(g) ?? 0), 0)} sièges, dans le sens du client.`,
      preuve: { sources: srcPos, raisonnement: obj.rang === 1 ? `Position majoritaire de chaque groupe ${sourcePositions === "scrutins" ? "sur les scrutins liés" : "dans ses amendements à la mesure"}, traduite en position sur la mesure.` : "Groupes auteurs d'amendements de nature « réduit » ou « reporte » selon l'objectif, ou opposés à la mesure.", nature: "deduction" },
    });
    if (gouv && gouv.position !== "inconnue" && gouv.position !== cible) bloquant.push({ titre: "Mesure portée par le gouvernement", detail: gouv.preuve.raisonnement, preuve: gouv.preuve });
    // Amendements du gouvernement en attente sur la mesure, qui ne la suppriment ni ne la réduisent : il la retravaille pour la faire adopter.
    if (obj.rang === 1 && cible === "contre") {
      for (const a of amdts.filter((x) => x.typeAuteur === "Gouvernement" && x.sur_mesure && enAttente(x) && !["supprime", "reduit", "reporte"].includes(ctx.natures.get(x.id) ?? ""))) {
        bloquant.push({
          titre: `Le gouvernement a déposé l'amendement n° ${a.numero} sur l'article ${a.article.replace(/^ART\. /, "")}`,
          detail: `Déposé le ${a.dateDepot}, en attente : ${(a.expose || a.dispositif).split(/(?<=[.!?])\s/)[0].slice(0, 220)}`,
          preuve: { sources: [{ label: `Amendement n° ${a.numero}`, url: a.url }], raisonnement: "Le gouvernement, auteur de la mesure, dépose un amendement qui la modifie sans la supprimer ni la réduire : il prépare son adoption. Son sort n'est pas connu à la date de référence.", nature: "deduction" },
        });
      }
    }
    if (gouv && gouv.position === cible) favorable.push({ titre: `Le gouvernement est ${gouv.position} la mesure`, detail: gouv.preuve.raisonnement, preuve: gouv.preuve });
    if (groupesOpp.length) bloquant.push({
      titre: `${groupesOpp.length} groupe(s) ${obj.rang === 1 ? (cible === "contre" ? "pour la mesure" : "contre la mesure") : "contre cet objectif"} : ${groupesOpp.map(sigle).join(", ")}`,
      detail: `${groupesOpp.reduce((x, g) => x + (effectifs.get(g) ?? 0), 0)} sièges en face du client.`,
      preuve: { sources: srcPos, raisonnement: obj.rang === 1 ? `Position majoritaire de chaque groupe ${sourcePositions === "scrutins" ? "sur les scrutins liés" : "dans ses amendements à la mesure"}.` : "Groupes auteurs d'amendements de nature « aggrave ».", nature: "deduction" },
    });
    if (rg && rg.position !== "inconnue") (rg.position === cible ? favorable : bloquant).push({ titre: `Le rapporteur général ${rg.nom} a agi ${rg.position} la mesure`, detail: rg.preuve.raisonnement, preuve: rg.preuve });
    if (obj.rang > 1 && !porteurs.some((a) => depot(a.dateDepot))) inconnu.unshift(`Aucun amendement ${obj.rang === 2 ? "de réduction" : "de report"} déposé au plus tard le ${ref}`);

    // ---- cause du changement (nouveautes.json d'A4) ----
    let cause: any = null;
    if (nouveautes?.evenements) {
      const ev = nouveautes.evenements
        .filter((e: any) => e.effet !== "neutre" && e.date > j7 && e.date <= ref && (e.objectif_rang == null || e.objectif_rang === obj.rang))
        .filter((e: any) => causeValide(e, obj.rang, cible))
        .sort((a: any, b: any) => b.importance - a.importance || (a.date < b.date ? 1 : -1))[0];
      if (ev) cause = { evenement_id: ev.id, titre: ev.titre, preuve: ev.preuve };
    }

    // ---- lecture ----
    function causeValide(e: any, rang: number, cib: "pour" | "contre"): boolean {
      // Un événement d'amendement n'est retenu que si l'amendement porte sur la mesure (article ou dispositif)
      // et si son effet annoncé concorde avec le sens lu par P3. Sinon : rejeté et compté dans rejets.
      if (!String(e.type).startsWith("amendement")) return true;
      const uid = String(e.url ?? "").match(/AMANR5L17[A-Z0-9]+/)?.[0];
      const a = uid ? amdts.find((x) => x.id === uid) : undefined;
      if (!a || !a.pertinent) { rejets.push(`${e.id} : amendement hors sujet (le sujet n'est cité que dans l'exposé, ou amendement inconnu)`); return false; }
      // Amendement du gouvernement sur la mesure qui ne la supprime, ne la réduit ni ne la reporte : il prépare son adoption.
      const nat = ctx.natures.get(a.id);
      if (rang === 1 && cib === "contre" && a.typeAuteur === "Gouvernement" && a.sur_mesure && !["supprime", "reduit", "reporte"].includes(nat ?? "")) {
        if (e.effet === "affaiblit") return true;
        rejets.push(`${e.id} : amendement du gouvernement qui retravaille la mesure, effet attendu « affaiblit »`);
        return false;
      }
      if (!a.sens) { rejets.push(`${e.id} : sens de l'amendement sur la mesure non lu`); return false; }
      const dir = cib === "contre" ? -1 : 1; // sens qui sert le client
      let attendu: string;
      if (e.type === "amendement_sort") {
        const adopte = /adopt/i.test(e.titre);
        attendu = (a.sens === dir) === adopte ? "renforce" : "affaiblit";
      } else attendu = a.sens === dir ? "renforce" : "affaiblit";
      if (rang > 1 && a.sens === dir && /^supprimer cet article/i.test(a.dispositif)) attendu = "renforce";
      if (e.effet !== attendu) { rejets.push(`${e.id} : effet « ${e.effet} » annoncé, mais l'amendement ${a.sens > 0 ? "renforce" : "réduit"} la mesure (${a.sens_raison}), donc « ${attendu} » pour cet objectif`); return false; }
      return true;
    }
    const c = obj.rang === 1 ? cpt(positions) : { pour: 0, contre: 0, autres: 0 };
    const etapeTxt = sansPoint(etat.etape);
    let gid = "lecture.sans_raison";
    if (situation === "insuffisant") gid = inconnu.length ? "lecture.insuffisant" : "lecture.insuffisant.nu";
    else if (obj.rang === 1 && gouv?.position === "pour" && c.pour > nGroupes / 2 && situation === (cible === "contre" ? "defavorable" : "favorable")) gid = "lecture.portage.pour";
    else if (obj.rang === 1 && gouv?.position === "contre" && c.contre > nGroupes / 2 && situation === (cible === "contre" ? "favorable" : "defavorable")) gid = "lecture.portage.contre";
    else if (situation === "favorable" && favorable.length && bloquant.length) gid = "lecture.favorable.reserve";
    else if (situation === "favorable" && favorable.length) gid = "lecture.favorable";
    else if (situation === "defavorable" && bloquant.length && favorable.length) gid = "lecture.defavorable.appui";
    else if (situation === "defavorable" && bloquant.length) gid = "lecture.defavorable";
    else if (situation === "incertaine" && favorable.length && bloquant.length) gid = "lecture.incertaine";
    const vars = {
      etape: etapeTxt, situation_mot: situation === "defavorable" ? "défavorable" : situation,
      favorable_1: sansPoint(favorable[0]?.titre ?? ""), bloquant_1: sansPoint(bloquant[0]?.titre ?? ""), inconnu_1: sansPoint(inconnu[0] ?? ""),
      n_pour: c.pour, n_contre: c.contre, n_autres: c.autres, n_total: nGroupes,
    };
    const phrase = remplir(gabarit(gid), vars);
    const entree = {
      date_jour: ref, client: d.client, mesure: d.mesure.label, etape: etapeTxt,
      objectif: { texte: obj.texte, type: obj.rang === 1 ? "principal" : "repli", position_cible: cible },
      situation, tendance, confiance: { niveau, etabli, inconnu },
      favorable: favorable.map((f) => ({ titre: f.titre, detail: f.detail })), bloquant: bloquant.map((f) => ({ titre: f.titre, detail: f.detail })),
      cause_du_changement: cause ? cause.titre : null,
      rapport_de_forces: obj.rang === 1 ? { gouvernement: gouv?.position ?? "inconnue", groupes_pour: c.pour, groupes_contre: c.contre, groupes_divises_ou_sans_position: c.autres, groupes_total: nGroupes } : null,
    };
    const autorises = [...new Set([...nombres(JSON.stringify(entree)), ...nombres(phrase)])];
    const system = readFileSync(join(ROOT, "pipeline", "verdict", "prompts", "lecture.md"), "utf8");
    const r = await redigerVerifie({ system, user: `Entrée (JSON) :\n${JSON.stringify(entree, null, 1)}` }, autorises, phrase);

    verdicts.push({
      objectif_rang: obj.rang,
      situation,
      score: situation === "insuffisant" ? null : r2(score!),
      score_libelle: "part des sièges favorables à l'objectif",
      tendance,
      confiance: { niveau, etabli, inconnu },
      lecture: { texte: r.texte, chiffres_utilises: r.chiffres_utilises, mode: r.mode, modele: r.modele, verifie: r.verifie },
      favorable,
      bloquant,
      cause_du_changement: cause,
      _trace: { rejets, score_positions: s0.score, score_j7: score7, orcet: orc, groupes_connus: s0.nConnus },
    });
  }
  const traces = verdicts.map((v) => `objectif ${v.objectif_rang} : positions ${v._trace.score_positions === null ? "-" : r2(v._trace.score_positions)}, à J-7 ${v._trace.score_j7 === null ? "-" : r2(v._trace.score_j7)}, Orcet ${v._trace.orcet ? r2(v._trace.orcet.moyenne) + " sur " + v._trace.orcet.n : "aucun"}`).join(" ; ");
  const rejetsTxt = [...new Set(verdicts.flatMap((v) => v._trace.rejets.map((r: string) => `objectif ${v.objectif_rang}, ${r}`)))];
  for (const v of verdicts) delete v._trace;
  return {
    meta: {
      generated_at: maintenant(),
      sources: [
        { label: "Scrutins publics, open data Assemblée nationale", url: URL_SCRUTINS_OD },
        { label: "Amendements, open data Assemblée nationale", url: URL_AMDTS_OD },
        { label: "Prédictions Orcet (Hémicycle)", url: "https://api.hemicycle.ai/v1/orcet/predictions" },
        { label: "Texte", url: urlTexte },
      ],
      limits:
        `Verdict proposé, le cabinet décide. Dépôts au plus tard le ${ref} ; sorts, scrutins et séances strictement avant (matin du ${ref}). Score = part des sièges des groupes de position connue qui vont dans le sens du client (groupe divisé ou abstentionniste compté pour moitié), ` +
        `corrigé à ${POIDS_ORCET * 100} % par la moyenne Orcet des amendements en attente qui portent la position du client quand il y en a. Favorable à partir de ${SEUIL_FAVORABLE}, défavorable sous ${SEUIL_DEFAVORABLE}, « insuffisant » sous 3 groupes de position connue. ` +
        `Tendance : score contre le même calcul sept jours plus tôt (écart de plus de 0,03). Replis : groupes auteurs d'amendements de nature « reduit » (réduire) ou « reporte » (repousser), ou opposés à la mesure, contre groupes auteurs d'amendements « aggrave ». Le score se lit « part des sièges favorables à l'objectif », jamais comme une probabilité. ` +
        `Avis du rapporteur et du gouvernement non publiés. Traces : ${traces}.` +
        (rejetsTxt.length ? ` Événements de nouveautes.json écartés comme cause du changement : ${rejetsTxt.join(" ; ")}.` : ""),
      producer: PRODUCER,
      dossier_id: d.id,
    },
    verdicts,
  };
}
