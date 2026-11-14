// etat.json, texte.json, groupes-action.json d'un dossier (données au plus tard date_reference).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type AmdtSujet, type CtxDossierPlus, COHERENCE_ARTICLE, coupure, moinsJours, surMesure } from "./lib/sujet";

/** Article déclaré dans la configuration, s'il porte bien la mesure. */
export const articleMesure = (d: { id: string; mesure: { article: string | null } }) => (d.mesure.article && COHERENCE_ARTICLE[d.id]?.coherent !== false ? d.mesure.article : null);
import { loyautes } from "./lib/loyaute";
import { DATA, PRODUCER, URL_AMDTS_OD, URL_DOSSIERS_OD, URL_SCRUTINS_OD, lireJson, maintenant, r2, urlDepute, urlScrutin } from "./lib/commun";
import { CACHE } from "./lib/opendata";
import { naturesEnLot } from "./lib/nature";

const RAW = join(DATA, "raw");

// ---------- sorts ----------
export type SortU = "en_attente" | "adopte" | "rejete" | "retire" | "tombe" | "non_examine" | null;
/** Sort unifié ; null = irrecevable ou retiré avant publication (exclu de la base). */
export function sortUnifie(a: AmdtSujet, avant: (x: string | null) => boolean): { sort: SortU; detail: string } {
  const etat = a.etat ?? "";
  const sous = a.sousEtat ?? "";
  if (/^Irrecevable/.test(etat)) return { sort: null, detail: `irrecevable (${sous || etat})` };
  if (/avant publication/.test(sous)) return { sort: null, detail: "retiré avant publication" };
  if (a.dateSort && !avant(a.dateSort)) return { sort: "en_attente", detail: "en attente à la date de référence" };
  // Règle du matin (décision 15 h 05) : sort sans date publiée alors que le dépôt est le jour de référence ou après ⇒ pas encore connu.
  if (!a.dateSort && a.dateDepot && !avant(a.dateDepot)) return { sort: "en_attente", detail: "sort sans date publiée, dépôt le jour de référence" };
  const s = a.sort ?? (/Retiré/.test(etat) ? "Retiré" : null);
  switch (s) {
    case "Adopté": return { sort: "adopte", detail: "adopté" };
    case "Rejeté": return { sort: "rejete", detail: "rejeté" };
    case "Retiré": return { sort: "retire", detail: "retiré" };
    case "Tombé": return { sort: "tombe", detail: "tombé" };
    case "Non soutenu": return { sort: "non_examine", detail: "non soutenu" };
    default: return { sort: "en_attente", detail: etat || "en attente" };
  }
}

function resumeAmdt(a: AmdtSujet, detail: string): string {
  let r: string;
  if (/^supprimer cet article/i.test(a.dispositif)) r = `Supprime l'article ${a.article.replace(/^ART\. /, "")}.`;
  else {
    const e = a.expose || a.dispositif;
    const phrase = e.split(/(?<=[.!?])\s/)[0] ?? e;
    r = phrase.length > 240 ? phrase.slice(0, 237).trimEnd() + "..." : phrase;
  }
  if (detail === "non soutenu") r += " (non soutenu)";
  return r || "Amendement sans exposé.";
}

function predictionOrcet(dossierId: string, uid: string, avant: (x: string | null) => boolean) {
  const f = join(RAW, dossierId, "orcet", `${uid}.json`);
  if (!existsSync(f)) return null;
  const o = JSON.parse(readFileSync(f, "utf8"));
  if (!o || o.prediction === null || o.calcule === false || typeof o.moyenne_probabilites_pour !== "number") return null;
  const date = String(o.predit_le ?? "").slice(0, 10);
  if (!avant(date)) return null; // prédiction postérieure à la date de référence
  return { proba_pour: r2(o.moyenne_probabilites_pour), confiance: r2(o.confiance ?? 0), modele: String(o.modele ?? "orcet"), date };
}

// ---------- texte.json ----------
export async function construireTexte(ctx: CtxDossierPlus) {
  const { d, positions, sourcePositions, lies, amdts, groupes, deputes } = ctx;
  const { ref, avant, depot } = coupure(d);
  const exclus = { irrecevables: 0, hors_deputes: 0, apres_ref: 0, hors_sujet: 0 };
  const natures = ctx.natures;
  const lot = await naturesEnLot(amdts.filter((a) => a.texte === d.mesure.texte_id && a.pertinent && depot(a.dateDepot)), d.mesure.label);
  const amendements: any[] = [];
  for (const a of amdts) {
    if (a.texte !== d.mesure.texte_id) continue;
    if (!a.pertinent) { exclus.hors_sujet++; continue; }
    if (!depot(a.dateDepot)) { exclus.apres_ref++; continue; }
    const s = sortUnifie(a, avant);
    if (s.sort === null) { exclus.irrecevables++; continue; }
    // Auteur : député en exercice, gouvernement, ou commission (rapporteur au nom de la commission).
    let auteur_type: "depute" | "gouvernement" | "commission";
    let auteur_id: string;
    let auteur_libelle: string;
    if (a.typeAuteur === "Gouvernement") { auteur_type = "gouvernement"; auteur_id = "GOUVERNEMENT"; auteur_libelle = "Gouvernement"; }
    else if (a.typeAuteur === "Rapporteur") {
      auteur_type = "commission";
      auteur_id = a.id.match(/^AMANR5L17(PO\d+)/)?.[1] ?? "COMMISSION";
      auteur_libelle = auteur_id === "PO59048" ? "Commission des finances" : "Commission";
    } else {
      if (!a.auteur || !deputes.has(a.auteur)) { exclus.hors_deputes++; continue; }
      auteur_type = "depute"; auteur_id = a.auteur; auteur_libelle = `${deputes.get(a.auteur)!.prenom} ${deputes.get(a.auteur)!.nom}`;
    }
    const nat = lot.get(a.id) ?? { nature: "autre" as const, mode: "defaut" as const };
    natures.set(a.id, nat.nature);
    amendements.push({
      id: a.id,
      numero: a.numero,
      url: a.url,
      auteur_id,
      auteur_type,
      auteur_libelle,
      date_depot: a.dateDepot,
      nature: nat.nature,
      nature_mode: nat.mode,
      cosignataires_ids: a.cosignataires.filter((c) => deputes.has(c)),
      groupe_id: a.groupe && groupes.has(a.groupe) ? a.groupe : null,
      resume: resumeAmdt(a, s.detail),
      sort: s.sort,
      prediction: s.sort === "en_attente" ? predictionOrcet(d.id, a.id, avant) : null,
    });
  }
  // Mesure d'abord, puis par numéro.
  const surMes = new Set(amdts.filter((a) => a.sur_mesure).map((a) => a.id));
  amendements.sort((x, y) => Number(surMes.has(y.id)) - Number(surMes.has(x.id)) || Number(x.numero) - Number(y.numero));
  const nLies = lies.filter((s) => s.sens).length;
  const pos = [...groupes.keys()].map((g) => {
    const p = positions.get(g);
    return {
      groupe_id: g,
      position: p?.position ?? null,
      confiance: p ? p.confiance : 0,
      base: !p ? "aucun scrutin lié ni amendement de sens lisible" : sourcePositions === "scrutins" ? `${p.n} scrutins liés (pour la mesure ${p.pour}, contre ${p.contre}, abstention ${p.abstention})` : `${p.n} amendements déposés (qui portent la mesure ${p.pour}, qui la combattent ${p.contre})`,
      n_scrutins_sujet: sourcePositions === "scrutins" ? (p?.n ?? 0) : 0,
    };
  });
  const dossierUrl = ctx.texteRaw?.url_dossier ?? "https://www.assemblee-nationale.fr/dyn/17/dossiers";
  const texteUrl = ctx.texteRaw?.url_texte ?? dossierUrl;
  return {
    meta: {
      generated_at: maintenant(),
      sources: [
        { label: `Amendements du texte ${d.mesure.texte_id}, open data Assemblée nationale`, url: URL_AMDTS_OD },
        { label: "Scrutins publics, open data Assemblée nationale", url: URL_SCRUTINS_OD },
        { label: "Prédictions Orcet (Hémicycle)", url: "https://api.hemicycle.ai/v1/orcet/predictions" },
        { label: "Texte", url: texteUrl },
      ],
      limits:
        `Dépôts au plus tard le ${ref} ; sorts, scrutins et séances strictement avant (matin du ${ref}). Amendements du sujet : amendements de l'article de la mesure, plus ceux qui citent un mot-clé de la configuration dans leur dispositif. ${exclus.hors_sujet} amendements qui ne le citent que dans l'exposé sont écartés (ex. retraites, crédits de seconde partie). ` +
        `Exclus : ${exclus.irrecevables} irrecevables ou retirés avant publication, ${exclus.hors_deputes} déposés par un ancien député, ${exclus.apres_ref} déposés après la date de référence. Amendements du gouvernement et de la commission inclus (auteur_type). ` +
        `Nature vis-à-vis de la mesure : règle d'abord (suppression, montant, création, réduction), sinon modèle de langage contrôlé (citation exacte du dispositif ou de l'exposé exigée), sinon « autre » (nature_mode « defaut »). ` +
        `Un sort postérieur à la date de référence est « en_attente ». « non_examine » regroupe ici les amendements non soutenus (écrit dans le résumé). ` +
        `Positions des groupes : ${sourcePositions === "scrutins" ? `${nLies} scrutins nominatifs liés de sens lisible (position majoritaire du groupe traduite en position sur la mesure)` : "amendements déposés par le groupe (aucun scrutin nominatif lié avant la date de référence)"} ; « divise » sous 60 % de votes dans un même sens. ` +
        `Sens d'un amendement sur la mesure lu par règles (suppression, création, exposé) : lecture de l'outil, pas un fait publié. ` +
        `Avis du rapporteur et du gouvernement absents de l'open data et de l'API. proba_pour d'Orcet = moyenne des probabilités individuelles de voter pour, pas une probabilité d'adoption.`,
      producer: PRODUCER,
      dossier_id: d.id,
    },
    texte: { id: d.mesure.texte_id, titre: ctx.titreTexte, etape: ctx.etape, url: texteUrl },
    positions: pos,
    amendements,
  };
}

// ---------- etat.json ----------
/** Amendement de commission (organe d'examen autre que la séance PO838901). */
export const enCommission = (a: { id: string }) => !/^AMANR5L17PO838901/.test(a.id);
type Acte = { code: string; date: string | null; libelle: string; statut: string | null; vote: string | null };
function actes(dossier: any): Acte[] {
  const res: Acte[] = [];
  const walk = (x: any) => {
    if (!x) return;
    for (const a of Array.isArray(x) ? x : [x]) {
      if (a.acteLegislatif) { walk(a.acteLegislatif); continue; }
      const lib = typeof a.libelleActe === "object" ? a.libelleActe?.nomCanonique : a.libelleActe;
      const vote = a.voteRefs?.voteRef ?? null;
      res.push({ code: a.codeActe, date: a.dateActe ? String(a.dateActe).slice(0, 10) : null, libelle: lib ?? "", statut: a.statutConclusion?.libelle ?? null, vote: typeof vote === "string" ? vote : null });
      if (a.actesLegislatifs) walk(a.actesLegislatifs);
    }
  };
  walk(dossier?.actesLegislatifs);
  return res;
}

export function etapeEtActes(ctx: CtxDossierPlus) {
  const { d } = ctx;
  const { ref, avant, depot } = coupure(d);
  const tous = actes(ctx.texteRaw?.dossier);
  const vu = (code: string) => tous.filter((a) => a.code === code && a.date && avant(a.date));
  const premier = (code: string) => vu(code).map((a) => a.date!).sort()[0] ?? null;
  const dernier = (code: string) => vu(code).map((a) => a.date!).sort().at(-1) ?? null;
  const url = ctx.texteRaw?.url_dossier ?? "https://www.assemblee-nationale.fr/dyn/17/dossiers";
  const decAN1 = vu("AN1-DEBATS-DEC")[0];
  const seances = vu("AN1-DEBATS-SEANCE");
  const sn = vu("SN1-DEPOT")[0];
  const etapes: { nom: string; date: string | null; statut: "fait" | "en_cours" | "a_venir"; url: string }[] = [];
  etapes.push({ nom: "Dépôt du projet de loi", date: premier("AN1-DEPOT"), statut: "fait", url: ctx.texteRaw?.url_texte ?? url });
  const rap = premier("AN1-COM-FOND-RAPPORT");
  etapes.push({ nom: "Commission des finances (rapport général)", date: rap, statut: rap ? "fait" : "en_cours", url });
  if (decAN1) etapes.push({ nom: `Séance publique, première lecture : ${decAN1.statut ?? "décision"}${decAN1.vote ? ` (scrutin n° ${decAN1.vote.replace(/^VTANR5L17V/, "")})` : ""}`, date: decAN1.date, statut: "fait", url: decAN1.vote ? urlScrutin(Number(decAN1.vote.replace(/^VTANR5L17V/, ""))) : url });
  else etapes.push({ nom: "Séance publique, première lecture", date: dernier("AN1-DEBATS-SEANCE"), statut: seances.length ? "en_cours" : "a_venir", url });
  etapes.push({ nom: "Sénat, première lecture", date: sn?.date ?? null, statut: decAN1 ? "en_cours" : "a_venir", url: "https://www.senat.fr/" });
  etapes.push({ nom: "Commission mixte paritaire", date: null, statut: "a_venir", url });
  etapes.push({ nom: "Nouvelle lecture à l'Assemblée", date: null, statut: "a_venir", url });
  let etape: string;
  if (decAN1) etape = `Première lecture : rejeté par l'Assemblée le ${decAN1.date} ; Sénat, première lecture`;
  else if (seances.length) etape = "Première lecture, Assemblée nationale, séance publique, première partie";
  else etape = "Première lecture, Assemblée nationale, commission";
  return { etapes, etape, decAN1, ref };
}

export function construireEtat(ctx: CtxDossierPlus) {
  const { d, amdts, lies, deputes, groupes } = ctx;
  const { avant, ref, depot } = coupure(d);
  const { etapes, etape, decAN1 } = etapeEtActes(ctx);
  const art = articleMesure(d) ?? "";
  const surMes = amdts.filter((a) => a.sur_mesure && a.texte === d.mesure.texte_id);
  const nomDe = (pa: string | null) => (pa && deputes.get(pa) ? `${deputes.get(pa)!.prenom} ${deputes.get(pa)!.nom}` : null);
  const sigle = (g: string | null) => (g ? groupes.get(g)?.sigle ?? g : null);
  // Modifications : amendements adoptés sur l'article de la mesure (ou qui la créent), datés au plus tard la référence.
  const adoptes = amdts.filter((a) => a.texte === d.mesure.texte_id && a.sort === "Adopté" && a.dateSort && avant(a.dateSort) && (a.sur_mesure || a.sens !== 0));
  const modifications = adoptes
    .sort((x, y) => Number(enCommission(x)) - Number(enCommission(y)) || (x.dateSort! < y.dateSort! ? -1 : 1))
    .slice(0, 12)
    .map((a) => {
      const sc = lies.find((s) => s.amendement?.id === a.id);
      const com = enCommission(a);
      const qui = a.typeAuteur === "Gouvernement" ? "Gouvernement" : a.typeAuteur === "Rapporteur" ? "Rapporteur" : `${nomDe(a.auteur) ?? "Député"}${a.groupe ? ` (${sigle(a.groupe)})` : ""}`;
      const sources = [{ label: `Amendement n° ${a.numero}`, url: a.url }];
      if (sc) sources.push({ label: `Scrutin n° ${sc.numero}`, url: urlScrutin(sc.numero) });
      return {
        date: a.dateSort!,
        par: `Amendement n° ${a.numero}, ${qui}${com ? ", en commission des finances" : ", en séance"}`,
        quoi: /^supprimer cet article/i.test(a.dispositif) ? `Suppression de l'article ${a.article.replace(/^ART\. /, "")}` : resumeAmdt(a, "adopté"),
        url: a.url,
        preuve: { sources, raisonnement: `Amendement adopté ${com ? "en commission (le texte examiné en séance reste celui du gouvernement pour un projet de loi de finances)" : "en séance"} le ${a.dateSort}${sc ? ` par le scrutin n° ${sc.numero} (${sc.decompte.pour} pour, ${sc.decompte.contre} contre)` : " (vote à main levée ou sans scrutin public)"}.`, nature: "fait" as const },
      };
    });
  const suppression = adoptes.find((a) => a.sur_mesure && !enCommission(a) && /^supprimer cet article/i.test(a.dispositif));
  if (decAN1) {
    const v = decAN1.vote ? Number(decAN1.vote.replace(/^VTANR5L17V/, "")) : null;
    modifications.push({
      date: decAN1.date!,
      par: "Assemblée nationale, séance publique",
      quoi: "Rejet de la première partie : tout le projet de loi est rejeté en première lecture, le Sénat est saisi du texte du gouvernement",
      url: v ? urlScrutin(v) : (ctx.texteRaw?.url_dossier ?? URL_DOSSIERS_OD),
      preuve: { sources: [{ label: v ? `Scrutin n° ${v}` : "Dossier législatif", url: v ? urlScrutin(v) : (ctx.texteRaw?.url_dossier ?? URL_DOSSIERS_OD) }], raisonnement: "Le rejet de la première partie d'un projet de loi de finances vaut rejet du texte entier ; les votes de l'Assemblée sur les articles, suppressions comprises, tombent avec lui.", nature: "fait" as const },
    });
  }
  let dansLeTexte = true;
  let redaction: string;
  const horsTexte = !art;
  if (horsTexte) {
    // La mesure n'est pas dans le texte du gouvernement : elle vit dans des amendements qui la créent.
    dansLeTexte = false;
    const crees = amdts.filter((a) => a.texte === d.mesure.texte_id && a.pertinent && a.sens > 0 && !enCommission(a) && depot(a.dateDepot));
    const votes = crees.filter((a) => a.dateSort && avant(a.dateSort));
    const adoptesC = votes.filter((a) => a.sort === "Adopté");
    const groupesC = [...new Set(crees.map((a) => (a.groupe ? groupes.get(a.groupe)?.sigle : null)).filter(Boolean))].join(", ");
    modifications.length = 0;
    for (const a of votes.filter((a) => a.sort === "Adopté" || a.sort === "Rejeté").sort((x, y) => (x.dateSort! < y.dateSort! ? -1 : 1)).slice(0, 10)) {
      const sc = lies.find((s) => s.amendement?.id === a.id);
      const sources = [{ label: `Amendement n° ${a.numero}`, url: a.url }];
      if (sc) sources.push({ label: `Scrutin n° ${sc.numero}`, url: urlScrutin(sc.numero) });
      modifications.push({
        date: a.dateSort!,
        par: `Amendement n° ${a.numero}, ${nomDe(a.auteur) ?? "Député"}${a.groupe ? ` (${sigle(a.groupe)})` : ""}, en séance`,
        quoi: `${a.sort === "Adopté" ? "Adoption" : "Rejet"} d'un amendement qui crée l'imposition (${a.article.toLowerCase()})`,
        url: a.url,
        preuve: { sources, raisonnement: `${a.sort} le ${a.dateSort}${sc ? ` par le scrutin n° ${sc.numero} (${sc.decompte.pour} pour, ${sc.decompte.contre} contre)` : ""}. Sens lu par l'outil : ${a.sens_raison}.`, nature: "fait" as const },
      });
    }
    if (decAN1) {
      const v = decAN1.vote ? Number(decAN1.vote.replace(/^VTANR5L17V/, "")) : null;
      const u = v ? urlScrutin(v) : (ctx.texteRaw?.url_dossier ?? URL_DOSSIERS_OD);
      modifications.push({ date: decAN1.date!, par: "Assemblée nationale, séance publique", quoi: "Rejet de la première partie : tout le projet de loi est rejeté, le Sénat est saisi du texte du gouvernement", url: u, preuve: { sources: [{ label: v ? `Scrutin n° ${v}` : "Dossier législatif", url: u }], raisonnement: "Le rejet de la première partie vaut rejet du texte entier ; les amendements adoptés tombent avec lui.", nature: "fait" as const } });
    }
    redaction = `La taxe ne figure pas dans le texte du gouvernement${d.mesure.article ? ` (l'article ${d.mesure.article} déclaré porte sur autre chose : ${Math.round((COHERENCE_ARTICLE[d.id]?.ratio ?? 0) * 100)} % de ses amendements citent le sujet)` : ""}. ` +
      `${crees.length} amendements de séance la créaient (${groupesC}) : ${adoptesC.length} adopté(s), ${votes.length - adoptesC.length} rejeté(s) ou non soutenu(s)` +
      `${decAN1 ? `, puis l'Assemblée a rejeté le texte le ${decAN1.date}. Elle peut revenir par amendement au Sénat ou en nouvelle lecture.` : "."}`;
  } else {
  if (decAN1 && suppression) redaction = `Article ${art} du texte du gouvernement. Supprimé en séance le ${suppression.dateSort} (amendement n° ${suppression.numero}), mais l'Assemblée a rejeté le texte le ${decAN1.date} : le Sénat examine le texte initial du gouvernement, où l'article ${art} figure.`;
  else if (decAN1) redaction = `Article ${art} du texte initial du gouvernement ; l'Assemblée a rejeté le texte le ${decAN1.date}, le Sénat examine le texte du gouvernement.`;
  else if (suppression) { dansLeTexte = false; redaction = `Article ${art} supprimé le ${suppression.dateSort} (amendement n° ${suppression.numero}).`; }
  else redaction = `Article ${art} du texte initial du gouvernement, ${modifications.filter((m) => m.par.endsWith("en séance")).length ? `modifié en séance par ${modifications.filter((m) => m.par.endsWith("en séance")).length} amendement(s)` : "non modifié en séance à cette date"}${modifications.some((m) => m.par.endsWith("en commission des finances")) ? ` (${modifications.filter((m) => m.par.endsWith("en commission des finances")).length} amendement(s) adopté(s) en commission, sans effet sur le texte examiné en séance)` : ""}. ${surMes.filter((a) => depot(a.dateDepot) && (!a.dateSort || !avant(a.dateSort)) && !/^Irrecevable/.test(a.etat ?? "")).length} amendements sur l'article restent à examiner.`;
  }
  // Articles du sujet : l'article de la mesure.
  const sortsArt = surMes.filter((a) => depot(a.dateDepot));
  const enAttente = sortsArt.filter((a) => sortUnifie(a, avant).sort === "en_attente").length;
  const articles = art
    ? [{
        numero: art,
        titre: d.mesure.label.slice(0, 120),
        statut: (dansLeTexte ? (decAN1 ? "reste" : "reste") : "supprime") as "vote" | "reste" | "supprime",
        sort_detail: decAN1 ? `Texte rejeté par l'Assemblée le ${decAN1.date} ; article à examiner au Sénat` : suppression ? `Supprimé le ${suppression.dateSort}` : `En discussion en séance, ${enAttente} amendements en attente au ${ref}`,
        url: `${ctx.texteRaw?.url_texte ?? URL_DOSSIERS_OD}`,
      }]
    : [];
  return {
    meta: {
      generated_at: maintenant(),
      sources: [
        { label: "Dossier législatif, open data Assemblée nationale", url: URL_DOSSIERS_OD },
        { label: "Amendements, open data Assemblée nationale", url: URL_AMDTS_OD },
        { label: "Dossier sur le site de l'Assemblée", url: ctx.texteRaw?.url_dossier ?? URL_DOSSIERS_OD },
      ],
      limits: `État au matin du ${ref} (dépôts du jour connus ; sorts, scrutins, séances et décisions du jour inconnus). Étapes du Sénat, de la CMP et de la nouvelle lecture : non publiées dans l'open data de l'Assemblée, statut déduit de la procédure. Modifications = amendements adoptés sur l'article de la mesure ou qui portent sur elle.`,
      producer: PRODUCER,
      dossier_id: d.id,
    },
    mesure: { label: d.mesure.label, article: art || "aucun article du texte du gouvernement", dans_le_texte: dansLeTexte, redaction_actuelle: redaction, modifications },
    texte_etat: texteEtat(ctx, decAN1, etape),
    etape,
    etapes,
    articles,
  };
}

/** État du texte entier, distinct de l'état de la mesure. */
function texteEtat(ctx: CtxDossierPlus, decAN1: Acte | undefined, etape: string) {
  const urlD = ctx.texteRaw?.url_dossier ?? URL_DOSSIERS_OD;
  const titre = ctx.titreTexte;
  if (decAN1) {
    const n = decAN1.vote ? Number(decAN1.vote.replace(/^VTANR5L17V/, "")) : null;
    const sc = n ? ctx.scrutins.find((x) => x.numero === n) : undefined;
    const rejete = /rejet/i.test(decAN1.statut ?? "");
    const url = n ? urlScrutin(n) : urlD;
    return {
      statut: rejete ? "rejete" : /adopt/i.test(decAN1.statut ?? "") ? "adopte" : "en_discussion",
      libelle: `${titre} : ${rejete ? "première partie rejetée" : (decAN1.statut ?? "décision")} par l'Assemblée en première lecture${sc ? ` (scrutin n° ${n}, ${sc.decompte.pour} pour, ${sc.decompte.contre} contre)` : ""} ; la navette continue au Sénat`,
      date: decAN1.date,
      url,
      preuve: { sources: [{ label: n ? `Scrutin n° ${n}` : "Dossier législatif", url }], raisonnement: rejete ? "Le rejet de la première partie d'un projet de loi de finances vaut rejet du texte entier en première lecture à l'Assemblée ; ce n'est pas la fin de la procédure." : "Décision de l'Assemblée publiée dans le dossier législatif.", nature: "fait" as const },
    };
  }
  return {
    statut: "en_discussion",
    libelle: `${titre} : ${etape.toLowerCase()}`,
    date: coupure(ctx.d).ref,
    url: urlD,
    preuve: { sources: [{ label: "Dossier législatif", url: urlD }], raisonnement: `Aucune décision de l'Assemblée sur le texte au ${coupure(ctx.d).ref} dans le dossier législatif.`, nature: "fait" as const },
  };
}

// ---------- groupes-action.json ----------
type Acte2 = { sens: "pour" | "contre"; fondement: "vote" | "depose" | "dit"; source: { label: string; url: string } };

export function actesPropres(ctx: CtxDossierPlus): Map<string, Acte2[]> {
  const { d, lies, amdts } = ctx;
  const { avant, depot } = coupure(d);
  const res = new Map<string, Acte2[]>();
  const push = (pa: string, a: Acte2) => { if (!res.has(pa)) res.set(pa, []); res.get(pa)!.push(a); };
  for (const s of lies) {
    if (!s.sens) continue;
    for (const g of s.groupes) for (const [pa, v] of Object.entries(g.votes)) {
      const p = surMesure(v, s.sens);
      if (p === "pour" || p === "contre") push(pa, { sens: p, fondement: "vote", source: { label: `Scrutin n° ${s.numero} (${s.date})`, url: urlScrutin(s.numero) } });
    }
  }
  for (const a of amdts) {
    if (!a.sens || !depot(a.dateDepot)) continue;
    const p = a.sens > 0 ? "pour" : "contre";
    for (const pa of [a.auteur, ...a.cosignataires].filter(Boolean) as string[]) push(pa, { sens: p, fondement: "depose", source: { label: `Amendement n° ${a.numero}`, url: a.url } });
  }
  // « Dit » : arguments classés par A2 (data/<dossier>/arguments.json) s'ils existent.
  const args = lireJson(join(DATA, d.id, "arguments.json"));
  if (args) for (const sens of ["pour", "contre"] as const) for (const x of args[sens] ?? []) {
    if (x.orateur_id && avant(x.date)) push(x.orateur_id, { sens, fondement: "dit", source: { label: `Intervention du ${x.date}`, url: x.url } });
  }
  return res;
}

export function construireGroupesAction(ctx: CtxDossierPlus, decideurs: any[]) {
  const { d, positions, groupes, deputes, scrutins } = ctx;
  const { ref, avant, depot } = coupure(d);
  const cible = d.objectifs[0].position_cible;
  const oppose = cible === "pour" ? "contre" : "pour";
  const loy = loyautes(scrutins.filter((s) => avant(s.date)), moinsJours(ref, 365), ref, new Set(groupes.keys()));
  const actes = actesPropres(ctx);
  const allies: any[] = [], perdus: any[] = [], actionnables: any[] = [], position_inconnue: any[] = [];
  const nom = (pa: string) => `${deputes.get(pa)!.prenom} ${deputes.get(pa)!.nom}`;
  for (const [pa, dep] of deputes) {
    if (!dep.groupe_id || !groupes.has(dep.groupe_id)) continue;
    const a = actes.get(pa) ?? [];
    const nPour = a.filter((x) => x.sens === "pour").length;
    const nContre = a.filter((x) => x.sens === "contre").length;
    const n = nPour + nContre;
    const posG = positions.get(dep.groupe_id)?.position ?? null;
    const l = loy.get(pa)?.loyaute ?? null;
    const fond = [...new Set(a.map((x) => x.fondement))] as ("vote" | "depose" | "dit")[];
    const sources = [...new Map(a.map((x) => [x.source.url, x.source])).values()].slice(0, 4);
    const mots = fond.map((f) => (f === "vote" ? "a voté" : f === "depose" ? "a déposé ou cosigné" : "a dit")).join(", ");
    // Écarts avec son groupe sur le sujet : votes dont le sens sur la mesure diffère de la position du groupe.
    const ecarts = posG === "pour" || posG === "contre" ? a.filter((x) => x.fondement === "vote" && x.sens !== posG).length : 0;
    if (n > 0) {
      const sensPropre = nPour > nContre ? "pour" : nContre > nPour ? "contre" : null;
      const part = Math.max(nPour, nContre) / n;
      const raisonBase = `${mots} : ${nPour} acte(s) pour la mesure, ${nContre} contre`;
      if (ecarts > 0 && sensPropre !== cible) {
        actionnables.push({ depute_id: pa, groupe_id: dep.groupe_id, score: r2(Math.min(1, ecarts / Math.max(1, a.filter((x) => x.fondement === "vote").length))), raison: `${raisonBase} ; ${ecarts} vote(s) contre la position de son groupe sur le sujet`, fondement: fond, position_connue: true, preuve: { sources: sources.length ? sources : [{ label: "Fiche député", url: urlDepute(pa) }], raisonnement: `Classé sur ses propres actes. Son groupe est « ${posG} » sur la mesure ; ${nom(pa)} s'en est écarté ${ecarts} fois sur les scrutins liés.`, nature: "deduction" } });
      } else if (sensPropre === cible) {
        allies.push({ depute_id: pa, groupe_id: dep.groupe_id, score: r2(part), raison: `${raisonBase}, dans le sens du client`, fondement: fond, position_connue: true, preuve: { sources, raisonnement: `Classé sur ses propres actes (${mots}), majoritairement ${cible === "contre" ? "contre" : "pour"} la mesure, comme le client.`, nature: "deduction" } });
      } else if (sensPropre === oppose && l !== null && l >= 0.85 && posG === oppose) {
        perdus.push({ depute_id: pa, groupe_id: dep.groupe_id, score: r2(part), raison: `${raisonBase} ; loyauté ${r2(l)} à un groupe ${oppose} la mesure`, fondement: fond, position_connue: true, preuve: { sources, raisonnement: `Classé sur ses propres actes (${mots}), ${oppose} la mesure, et loyal à son groupe (${Math.round(l * 100)} % des votes sur 12 mois), lui-même ${oppose} la mesure.`, nature: "deduction" } });
      } else if (sensPropre === oppose) {
        actionnables.push({ depute_id: pa, groupe_id: dep.groupe_id, score: r2(l === null ? 0.5 : 1 - l), raison: `${raisonBase} ; loyauté à son groupe ${l === null ? "inconnue" : r2(l)}, sous le seuil de 0,85`, fondement: fond, position_connue: true, preuve: { sources, raisonnement: `A agi ${oppose} la mesure, mais vote moins souvent avec son groupe que la moyenne : position qui peut encore bouger.`, nature: "deduction" } });
      } else if (sensPropre === null) {
        actionnables.push({ depute_id: pa, groupe_id: dep.groupe_id, score: r2(l === null ? 0.5 : 1 - l), raison: `${raisonBase} : actes dans les deux sens`, fondement: fond, position_connue: true, preuve: { sources, raisonnement: "Ses propres actes sur la mesure vont dans les deux sens : position encore ouverte.", nature: "deduction" } });
      }
    } else {
      // Aucun acte personnel lié à la mesure : position inconnue, la position du groupe sert de contexte seulement.
      position_inconnue.push({ depute_id: pa, groupe_id: dep.groupe_id, position_groupe: posG, preuve: { sources: [{ label: "Fiche député", url: urlDepute(pa) }], raisonnement: `Aucun vote, amendement ou intervention de ce député sur la mesure au ${ref}. Son groupe est ${posG ? `« ${posG} »` : "sans position connue"} sur la mesure : contexte, pas un classement.`, nature: "inconnue" } });
    }
  }
  const tri = (x: any[]) => x.sort((a, b) => b.score - a.score || (b.fondement.length - a.fondement.length));
  const totaux = { allies: allies.length, perdus: perdus.length, actionnables: actionnables.length };
  const CAP = 15;
  return {
    meta: {
      generated_at: maintenant(),
      sources: [
        { label: "Scrutins publics, open data Assemblée nationale", url: URL_SCRUTINS_OD },
        { label: "Amendements, open data Assemblée nationale", url: URL_AMDTS_OD },
      ],
      limits:
        `Dépôts au plus tard le ${ref} ; sorts, scrutins et séances strictement avant (matin du ${ref}). Classement sur les actes propres de chaque député (votes sur les scrutins liés, amendements déposés ou cosignés${lireJson(join(DATA, d.id, "arguments.json")) ? ", interventions classées par A2" : " ; interventions non encore disponibles"}), jamais sur le groupe seul. ` +
        `Totaux avant coupe : ${totaux.allies} alliés, ${totaux.perdus} perdus, ${totaux.actionnables} actionnables ; ${CAP} gardés par catégorie (score décroissant). Les ${position_inconnue.length} députés sans acte personnel sur la mesure sont tous dans position_inconnue, avec la position de leur groupe en contexte. Députés en exercice seulement. ` +
        `Perdus = actes contre la cible et loyauté sur 12 mois d'au moins 0,85 envers un groupe lui-même opposé. Sens des amendements lu par règles : déduction de l'outil.`,
      producer: PRODUCER,
      dossier_id: d.id,
    },
    actionnables: tri(actionnables).slice(0, CAP),
    allies: tri(allies).slice(0, CAP),
    perdus: tri(perdus).slice(0, CAP),
    position_inconnue: position_inconnue.sort((a, b) => (a.groupe_id < b.groupe_id ? -1 : a.groupe_id > b.groupe_id ? 1 : 0)),
    decideurs,
  };
}

// ---------- décideurs ----------
export function construireDecideurs(ctx: CtxDossierPlus) {
  const { d, deputes, groupes, amdts } = ctx;
  const { avant, depot } = coupure(d);
  const actes = actesPropres(ctx);
  const res: any[] = [];
  const posPropre = (pa: string) => {
    const a = actes.get(pa) ?? [];
    const p = a.filter((x) => x.sens === "pour").length, c = a.filter((x) => x.sens === "contre").length;
    return { position: (p > c ? "pour" : c > p ? "contre" : "inconnue") as "pour" | "contre" | "inconnue", a };
  };
  const ajouter = (role: string, pa: string | null, nomRepli: string, raisonRole: string, sourceRole: { label: string; url: string }) => {
    if (pa && !deputes.has(pa)) pa = null;
    const dep = pa ? deputes.get(pa)! : null;
    const pp = pa ? posPropre(pa) : { position: "inconnue" as const, a: [] };
    const sources = [sourceRole, ...[...new Map(pp.a.map((x) => [x.source.url, x.source])).values()].slice(0, 3)];
    res.push({
      role,
      depute_id: pa,
      nom: dep ? `${dep.prenom} ${dep.nom}` : nomRepli,
      groupe_id: dep?.groupe_id ?? null,
      position: pp.position,
      preuve: {
        sources,
        raisonnement: `${raisonRole} ${pp.position === "inconnue" ? "Position inconnue : aucun vote ni amendement de sens lisible sur la mesure." : `Position lue sur ses propres actes : ${pp.a.filter((x) => x.sens === "pour").length} pour la mesure, ${pp.a.filter((x) => x.sens === "contre").length} contre.`}`,
        nature: pp.position === "inconnue" ? "inconnue" : "deduction",
      },
    });
  };
  const url = ctx.texteRaw?.url_dossier ?? URL_DOSSIERS_OD;
  // Gouvernement : auteur du projet de loi, donc de l'article de la mesure.
  res.push({
    role: "gouvernement",
    depute_id: null,
    nom: "Ministre chargé des comptes publics",
    groupe_id: null,
    position: articleMesure(d) ? "pour" : "inconnue",
    preuve: {
      sources: [{ label: "Texte du projet de loi", url: ctx.texteRaw?.url_texte ?? url }],
      raisonnement: articleMesure(d) ? `La mesure est l'article ${articleMesure(d)} du projet de loi déposé par le gouvernement : le gouvernement en est l'auteur.` : "La mesure ne figure pas dans le texte du gouvernement ; ses avis sur les amendements qui la créent ne sont publiés ni dans l'open data ni par l'API.",
      nature: articleMesure(d) ? "fait" : "inconnue",
    },
  });
  for (const r of ctx.rapporteurs.filter((r) => r.type === "rapporteur général")) ajouter("rapporteur_general", r.pa, "Rapporteur général", "Rapporteur général de la commission des finances sur ce projet de loi (dossier législatif).", { label: "Dossier législatif", url });
  if (ctx.presidentCF) ajouter("president_commission", ctx.presidentCF, "Président de la commission des finances", "Président de la commission des finances (répertoire des mandats, open data). Mandat lu à la date de génération : à vérifier pour une date passée.", { label: "Députés et organes, open data", url: "https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip" });
  // Chefs de file : député du groupe qui a déposé le plus d'amendements du sujet (déduction).
  for (const g of groupes.keys()) {
    const c = new Map<string, number>();
    for (const a of amdts) if (a.groupe === g && a.auteur && depot(a.dateDepot) && deputes.get(a.auteur)?.groupe_id === g && a.pertinent) c.set(a.auteur, (c.get(a.auteur) ?? 0) + 1);
    const top = [...c.entries()].sort((x, y) => y[1] - x[1])[0];
    if (!top || top[1] < 2) continue;
    ajouter("chef_de_file", top[0], "Chef de file", `Chef de file présumé du groupe ${groupes.get(g)!.sigle} : auteur de ${top[1]} amendements du sujet, le plus actif de son groupe (déduction, pas une désignation publiée).`, { label: "Amendements du sujet", url: URL_AMDTS_OD });
  }
  return res;
}
