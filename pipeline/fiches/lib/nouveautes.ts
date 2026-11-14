// Bloc Nouveautés : événements du dossier assemblés depuis texte.json (dépôts et
// sorts d'amendements), data/raw/scrutins/ (scrutins liés), auditions/ (rapports,
// auditions), debats/ et arguments.json (séances et commissions), etat.json
// (modifications de la mesure), agenda open data (réunions passées liées au texte).
// Importance : 3 = scrutin, sort d'un amendement du camp du client ; 2 = rapport,
// audition, dépôt d'amendement de groupe ; 1 = le reste. Effet sur le verdict de
// l'objectif visé : déduction écrite dans la preuve. Rien après date_reference.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { dataPath, type AmendementTexte, type Effet, type Evenement, type Nouveautes, type Preuve, type Sort, type Source } from "../../../contracts/index";
import { candidats } from "./fiches";
import { amendementDuTexte, dateEtape, sigleGroupe, type Contexte } from "./contexte";
import { aujourdhui, dateFr, ecrireJson, fusionnerSources, lireJsonBrut, lireKind, listerJson, maintenant, noter, posterieur, slug } from "./io";
import { SORT_LIBELLE } from "./gabarits";
import { datesDepotDepuisEvenements, lireEvenementsTexte, type EvenementsTexte } from "./evenements-api";

type Camp = "contre_mesure" | "pour_mesure" | "inconnu";

const MOTS_ADOUCIT = /supprim|rel[eè]ve le seuil|relever|exon[eéè]r|exclut|exclu|r[eé]duit|r[eé]duire|abaiss|report|repouss|diff[eéè]r|limite|plafonn|all[eéè]g/i;
const MOTS_DURCIT = /augment|porte (?:la|le|les|l')? ?.{0,30}? à|avance|[eé]tend|[eé]largi|renforc|cr[eé]e une taxe|instaure|rel[eè]ve le taux|double/i;
const MOTS_CALENDRIER = /entr[eé]e en vigueur|report|repouss|diff[eéè]r|application|calendrier|à compter/i;
const MOTS_MONTANT = /seuil|montant|taux|assiette|plafon|exon[eéè]r|exclu|euros|%|franchise|r[eé]duit|abaiss|all[eéè]g/i;

/** Camp de l'amendement par rapport à la mesure : son résumé, sinon la position du groupe de l'auteur. */
export function campAmendement(ctx: Contexte, a: AmendementTexte): { camp: Camp; raison: string; fonde: "resume" | "groupe" | "aucun" } {
  if (/supprim/i.test(a.resume)) return { camp: "contre_mesure", raison: "amendement de suppression", fonde: "resume" };
  if (/demande (?:d'|un )?rapport|rapport au parlement|remise d'un rapport|r[eé]dactionnel|de coordination|de pr[eé]cision/i.test(a.resume)) return { camp: "inconnu", raison: "demande de rapport ou amendement rédactionnel, sans effet sur la mesure", fonde: "aucun" };
  if (MOTS_DURCIT.test(a.resume)) return { camp: "pour_mesure", raison: "le résumé renforce ou étend la mesure", fonde: "resume" };
  if (MOTS_ADOUCIT.test(a.resume)) return { camp: "contre_mesure", raison: "le résumé réduit, exonère ou reporte la mesure", fonde: "resume" };
  // Le groupe de l'auteur ne dit pas le sens de l'amendement : camp retenu comme indice seulement, effet neutre.
  const pos = ctx.texte?.positions.find((p) => p.groupe_id === a.groupe_id)?.position ?? null;
  if (pos === "pour") return { camp: "pour_mesure", raison: `résumé neutre, groupe de l'auteur (${sigleGroupe(ctx, a.groupe_id)}) classé pour la mesure ; sens de l'amendement non lu, effet neutre`, fonde: "groupe" };
  if (pos === "contre") return { camp: "contre_mesure", raison: `résumé neutre, groupe de l'auteur (${sigleGroupe(ctx, a.groupe_id)}) classé contre la mesure ; sens de l'amendement non lu, effet neutre`, fonde: "groupe" };
  return { camp: "inconnu", raison: "résumé neutre et pas de position de groupe connue", fonde: "aucun" };
}

/** L'objectif visé : repli « repousser » pour le calendrier, repli « réduire/limiter » pour le montant, sinon le principal. */
export function objectifVise(ctx: Contexte, a: AmendementTexte): number {
  const objectifs = ctx.dossier.objectifs;
  if (/supprim/i.test(a.resume)) return objectifs[0].rang;
  const parMots = (re: RegExp) => objectifs.find((o) => o.rang !== objectifs[0].rang && re.test(o.texte));
  if (MOTS_CALENDRIER.test(a.resume)) {
    const o = parMots(/repouss|report|entr[eé]e en vigueur|application|diff[eé]r/i);
    if (o) return o.rang;
  }
  if (MOTS_MONTANT.test(a.resume)) {
    const o = parMots(/r[eé]duire|montant|assiette|limiter|taux|seuil|all[eéè]g/i);
    if (o) return o.rang;
  }
  return objectifs[0].rang;
}

function campClient(ctx: Contexte): Camp {
  return ctx.dossier.objectifs[0].position_cible === "contre" ? "contre_mesure" : "pour_mesure";
}

/** Effet d'un dépôt (sens +1), d'une adoption (+1) ou d'un rejet (-1) selon le camp. */
function effet(ctx: Contexte, camp: Camp, sens: 1 | -1 | 0): Effet {
  if (camp === "inconnu" || sens === 0) return "neutre";
  const allie = camp === campClient(ctx);
  return (allie ? sens : -sens) > 0 ? "renforce" : "affaiblit";
}

function sensDuSort(sort: Sort): 1 | -1 | 0 {
  if (sort === "adopte") return 1;
  if (sort === "rejete") return -1;
  return 0;
}

type Scrutin = { id: string; numero: string | null; titre: string; date: string; url: string; chemin: string };

function texteBrut(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Lecture tolérante des scrutins bruts de P1 : `_index.json` s'il existe (évite d'ouvrir 10 000 fichiers de votes), sinon un fichier par scrutin. */
export function lireScrutins(ctx: Contexte): Scrutin[] {
  const dir = join(ctx.root, "raw", "scrutins");
  const out: Scrutin[] = [];
  const index = lireJsonBrut(join(dir, "_index.json")) as any;
  const entrees: { s: any; chemin: string }[] = [];
  if (index) {
    const liste: any[] = Array.isArray(index) ? index : Array.isArray(index.scrutins) ? index.scrutins : Object.values(index);
    for (const s of liste) if (s && typeof s === "object") entrees.push({ s, chemin: join(dir, `${s.id ?? s.uid}.json`) });
  } else {
    for (const chemin of listerJson(dir)) {
      if (chemin.endsWith("_index.json")) continue;
      const b = lireJsonBrut(chemin) as any;
      if (b && typeof b === "object") entrees.push({ s: b.scrutin ?? b, chemin });
    }
  }
  // Écarts des pivots (P3) : scrutins liés au sujet déjà datés et titrés, sans appel API.
  for (const pv of ctx.pivots?.deputes ?? []) for (const e of pv.ecarts) entrees.push({ s: { id: e.scrutin_id, date: e.date, titre: e.titre, url: e.url }, chemin: "pivots.json" });
  const vus = new Set<string>();
  for (const { s, chemin } of entrees) {
    const id = texteBrut(s.id ?? s.uid ?? s.scrutin_id);
    const titre = texteBrut(s.titre ?? s.title ?? s.objet ?? s.libelle ?? s.intitule);
    const dateBrute = texteBrut(s.date ?? s.dateScrutin ?? s.date_scrutin);
    const date = dateBrute.slice(0, 10);
    if (!id || !titre || !/^\d{4}-\d{2}-\d{2}$/.test(date) || vus.has(id)) continue;
    vus.add(id);
    const numero = (id.match(/V(\d+)$/) ?? [null, null])[1] ?? (typeof s.numero === "number" || typeof s.numero === "string" ? String(s.numero) : null);
    const url = texteBrut(s.url) || (numero ? `https://www.assemblee-nationale.fr/dyn/17/scrutins/${numero}` : "");
    if (!url) continue;
    out.push({ id, numero, titre, date, url, chemin });
  }
  return out;
}

function scrutinLie(ctx: Contexte, s: Scrutin): boolean {
  const t = s.titre.toLowerCase();
  if (t.includes(ctx.dossier.texte_id.toLowerCase())) return true;
  const mots = ctx.dossier.sujet.mots_cles.map((m) => m.toLowerCase());
  if (mots.some((m) => t.includes(m))) return true;
  const numeros = new Set((ctx.texte?.amendements ?? []).map((a) => a.numero));
  for (const m of s.titre.matchAll(/n[°º]\s*(\d+)/g)) if (numeros.has(m[1])) return true;
  return false;
}

function numerosDuTitre(titre: string): string[] {
  return [...titre.matchAll(/n[°º]\s*(\d+)/g)].map((m) => m[1]);
}

function preuve(sources: Source[], raisonnement: string, nature: Preuve["nature"]): Preuve {
  return { sources, raisonnement, nature };
}

/** Identifiants stables et uniques : `ev-<numero>` pour l'événement principal d'un amendement ou un scrutin, sinon `ev-<type>-<date>[-n]`. */
function fabriqueIds() {
  const pris = new Set<string>();
  return (base: string): string => {
    let id = base;
    for (let n = 2; pris.has(id); n++) id = `${base}-${n}`;
    pris.add(id);
    return id;
  };
}

type DatesBrutes = { depot: Map<string, string>; sort: Map<string, string> };

/** data/raw/<dossier>/amendements.json (P1, open data) : date_depot et date_sort par identifiant, lecture tolérante. */
function lireDatesBrutes(ctx: Contexte): DatesBrutes | null {
  const chemin = join(ctx.root, "raw", ctx.dossier.id, "amendements.json");
  const b = lireJsonBrut(chemin) as any;
  if (!b) return null;
  const liste: any[] = Array.isArray(b) ? b : Array.isArray(b.amendements) ? b.amendements : Array.isArray(b.data) ? b.data : [];
  const out: DatesBrutes = { depot: new Map(), sort: new Map() };
  for (const a of liste) {
    const id = texteBrut(a?.id ?? a?.uid);
    if (!id) continue;
    const dd = texteBrut(a?.date_depot ?? a?.dateDepot).slice(0, 10);
    const ds = texteBrut(a?.date_sort ?? a?.dateSort).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dd)) out.depot.set(id, dd);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) out.sort.set(id, ds);
  }
  return out;
}

export async function construireNouveautes(ctx: Contexte, argumentsEntendus: { pour: any[]; contre: any[] } | null, rafraichirApi = false): Promise<Nouveautes> {
  const { dossier, root } = ctx;
  const ref = dossier.date_reference;
  const limite = ref ?? aujourdhui();
  const evenements: Evenement[] = [];
  const limites: string[] = [];
  const idUnique = fabriqueIds();
  const sources: Source[] = fusionnerSources(ctx.texte?.meta.sources);
  const texteSource: Source = ctx.texte
    ? { label: `Texte ${ctx.texte.texte.id}`, url: ctx.texte.texte.url }
    : { label: "Assemblée nationale", url: "https://www.assemblee-nationale.fr/" };

  // Amendements « travaillés avec » le client (fichiers A3) : importance 3 à leur dépôt et à leur sort.
  const avecClient = new Set<string>();
  for (const pa of candidats(ctx)) {
    const am = lireKind(root, dossier.id, "amendements", pa);
    for (const a of am?.amendements ?? []) if (a.travaille_avec.some((o) => o.toLowerCase().includes(dossier.client.toLowerCase().split(" ")[0]))) avecClient.add(a.id);
  }

  // Scrutins bruts liés au sujet (P1).
  const scrutins = lireScrutins(ctx).filter((s) => scrutinLie(ctx, s) && !posterieur(s.date, ref));
  if (!existsSync(join(root, "raw", "scrutins"))) limites.push("data/raw/scrutins absent : aucun scrutin nominatif lu.");
  const scrutinParNumero = new Map<string, Scrutin>();
  for (const s of scrutins) for (const n of numerosDuTitre(s.titre)) if (!scrutinParNumero.has(n)) scrutinParNumero.set(n, s);

  // Dates publiées : brut P1 (date_depot, date_sort), puis exemples du jeu evenements_parlementaires.
  const brutes = lireDatesBrutes(ctx);
  const evTexte: EvenementsTexte | null = await lireEvenementsTexte(dossier.texte_id, rafraichirApi);
  const depotsJeu = datesDepotDepuisEvenements(evTexte);
  if (!brutes) limites.push(`data/raw/${dossier.id}/amendements.json (P1) absent sur cette machine : dates de dépôt et de sort non publiées.`);
  const dateDepotPubliee = (a: AmendementTexte): { date: string; provenance: string } | null => {
    if (a.date_depot) return { date: a.date_depot, provenance: "date de dépôt publiée (texte.json)" };
    const d1 = brutes?.depot.get(a.id);
    if (d1) return { date: d1, provenance: "date de dépôt de l'open data (brut P1)" };
    const d2 = depotsJeu.get(a.id);
    if (d2) return { date: d2, provenance: "date de dépôt lue dans le jeu evenements_parlementaires d'Hémicycle" };
    return null;
  };

  // 1. Amendements du texte, regroupés quand ils sont identiques (même résumé, même groupe, même sort :
  //    les séries déposées par un groupe). L'événement principal (le sort s'il existe, sinon le dépôt)
  //    porte l'identifiant `ev-<numero>` du premier amendement du groupe, que verdict.json (P3) référence.
  //    Importance : 3 = scrutin, adoption, amendement du client ou suppression de l'article de la mesure ;
  //    2 = rejet d'un amendement au camp connu, dépôt de groupe au camp connu ; 1 = le reste.
  //    Un dépôt sans date publiée n'est listé que si l'amendement est encore en attente ou d'importance 3.
  const dateRepli = dateEtape(ctx, limite);
  const dateModification = (numero: string): string | null =>
    ctx.etat?.mesure.modifications.find((m) => numerosDuTitre(`${m.par} ${m.quoi}`).includes(numero))?.date ?? null;
  const article = dossier.mesure.article;
  const supprimeLaMesure = (a: AmendementTexte) =>
    /supprim/i.test(a.resume) && (new RegExp(`article\\s+${article}(?!\\d)`, "i").test(a.resume) || dossier.sujet.mots_cles.some((m) => a.resume.toLowerCase().includes(m.toLowerCase())));
  const cleGroupe = (a: AmendementTexte) => `${a.resume.toLowerCase().replace(/\s+/g, " ").slice(0, 80)}|${a.groupe_id ?? "NI"}|${a.sort}`;
  const groupesAm = new Map<string, AmendementTexte[]>();
  for (const a of ctx.texte?.amendements ?? []) {
    const k = cleGroupe(a);
    groupesAm.set(k, [...(groupesAm.get(k) ?? []), a]);
  }
  const extrait = (s: string, n = 90) => {
    const t = s.trim().replace(/\s+/g, " ");
    if (t.length <= n) return t.replace(/[.]$/, "");
    const coupe = t.slice(0, n);
    return coupe.slice(0, Math.max(coupe.lastIndexOf(" "), 40)) + "…";
  };
  const libelleNumeros = (liste: AmendementTexte[]) => {
    const nums = liste.map((a) => a.numero);
    if (nums.length === 1) return `Amendement n° ${nums[0]}`;
    const tete = nums.slice(0, 4).map((n) => `n° ${n}`).join(", ");
    return `${nums.length} amendements identiques (${tete}${nums.length > 4 ? ` et ${nums.length - 4} autres` : ""})`;
  };

  for (const liste of groupesAm.values()) {
    const a = liste[0];
    const { camp: campBrut, raison, fonde } = campAmendement(ctx, a);
    // Effet et importance ne s'appuient que sur un camp lu dans le résumé ; le groupe seul ne suffit pas.
    const camp: Camp = fonde === "resume" ? campBrut : "inconnu";
    const rang = objectifVise(ctx, a);
    const groupe = sigleGroupe(ctx, a.groupe_id);
    const srcAm: Source[] = liste.slice(0, 3).map((x) => ({ label: `Amendement n° ${x.numero}`, url: x.url }));
    const scrutin = liste.map((x) => scrutinParNumero.get(x.numero) ?? null).find(Boolean) ?? null;
    const allie = camp !== "inconnu" && camp === campClient(ctx);
    const duClient = liste.some((x) => avecClient.has(x.id));
    const suppression = supprimeLaMesure(a);
    const pluriel = liste.length > 1;
    const resumeCourt = extrait(a.resume);

    // Dépôt.
    const publiee = dateDepotPubliee(a);
    const dateDepot = publiee?.date ?? a.prediction?.date ?? dateRepli ?? limite;
    const provenanceDate = publiee?.provenance ?? (a.prediction?.date ? "date de la prédiction Orcet (date de dépôt non publiée dans texte.json)" : "date de la dernière étape connue du texte (date de dépôt non publiée)");
    const importanceDepot = duClient || (suppression && allie) ? 3 : camp !== "inconnu" && a.groupe_id ? 2 : 1;
    const listerDepot = a.sort === "en_attente" || publiee !== null || importanceDepot === 3;
    if (listerDepot && !posterieur(dateDepot, ref)) {
      evenements.push({
        id: idUnique(a.sort === "en_attente" ? `ev-${a.numero}` : `ev-depot-${a.numero}`),
        date: dateDepot,
        type: "amendement_depose",
        titre: `${libelleNumeros(liste)}${groupe ? ` (${groupe})` : ""} déposé${pluriel ? "s" : ""} : ${resumeCourt}`,
        detail: `${a.resume.trim()}${pluriel ? ` Déposé par ${liste.length} auteurs du même groupe.` : ""}`,
        importance: importanceDepot,
        url: a.url,
        effet: effet(ctx, camp, 1),
        objectif_rang: rang,
        preuve: preuve(publiee ? [...srcAm, { label: "Hémicycle, jeu evenements_parlementaires", url: "https://hemicycle.ai" }] : [...srcAm, texteSource], `Dépôt lu dans le texte ${dossier.texte_id} ; ${provenanceDate}. Camp : ${raison}${duClient ? " ; amendement travaillé avec le client" : ""}${suppression ? " ; supprime l'article de la mesure" : ""}. Effet déduit du camp de l'amendement par rapport à la position du client.`, "deduction"),
      });
    }

    // Sort.
    if (a.sort !== "en_attente") {
      const dateSort = scrutin?.date ?? a.date_sort ?? liste.map((x) => brutes?.sort.get(x.id)).find(Boolean) ?? dateModification(a.numero) ?? dateRepli ?? limite;
      if (posterieur(dateSort, ref)) continue;
      const sens = sensDuSort(a.sort);
      const importanceSort = scrutin || a.sort === "adopte" || (a.sort === "rejete" && (duClient || (suppression && allie))) ? 3 : a.sort === "rejete" && camp !== "inconnu" ? 2 : 1;
      evenements.push({
        id: idUnique(`ev-${a.numero}`),
        date: dateSort,
        type: scrutin ? "scrutin" : "amendement_sort",
        titre: `${libelleNumeros(liste)}${groupe ? ` (${groupe})` : ""} ${SORT_LIBELLE[a.sort]}${pluriel ? "s" : ""}${scrutin?.numero ? ` (scrutin n° ${scrutin.numero})` : ""} : ${resumeCourt}`,
        detail: a.resume.trim(),
        importance: importanceSort,
        url: scrutin?.url ?? a.url,
        effet: effet(ctx, camp, sens),
        objectif_rang: rang,
        preuve: preuve(
          scrutin ? [{ label: `Scrutin n° ${scrutin.numero ?? scrutin.id}`, url: scrutin.url }, ...srcAm] : [...srcAm, texteSource],
          `Sort « ${SORT_LIBELLE[a.sort]} » lu dans le texte ${dossier.texte_id}${scrutin ? `, scrutin nominatif du ${dateFr(scrutin.date)}` : a.date_sort ? " ; date du sort publiée (texte.json)" : liste.some((x) => brutes?.sort.get(x.id)) ? " ; date du sort de l'open data (brut P1)" : dateModification(a.numero) ? " ; date de la modification de la mesure dans etat.json" : " ; date du sort non publiée, date de la dernière étape connue"}. Camp : ${raison}. Un amendement retiré, tombé, non soutenu, irrecevable ou non examiné n'a pas d'effet sur le verdict.`,
          "deduction",
        ),
      });
    }
  }

  // 2. Scrutins liés non rattachés à un amendement du texte.
  const numerosCouverts = new Set((ctx.texte?.amendements ?? []).map((a) => a.numero));
  for (const s of scrutins) {
    if (numerosDuTitre(s.titre).some((n) => numerosCouverts.has(n))) continue;
    evenements.push({
      id: idUnique(`ev-${s.numero ?? slug(s.id)}`),
      date: s.date,
      type: "scrutin",
      titre: `Scrutin${s.numero ? ` n° ${s.numero}` : ""} lié au sujet`,
      detail: s.titre,
      importance: 3,
      url: s.url,
      effet: "neutre",
      objectif_rang: dossier.objectifs[0].rang,
      preuve: preuve([{ label: `Scrutin n° ${s.numero ?? s.id}`, url: s.url }], "Scrutin nominatif dont l'intitulé cite le texte ou les mots-clés du sujet ; effet non déduit faute de rattachement à un amendement du dossier.", "fait"),
    });
    sources.push({ label: "Hémicycle API scrutins", url: "https://api.hemicycle.ai/v1/scrutins" });
  }

  // 3. Étapes du texte conclues par un scrutin (etat.json) : le texte porte la mesure, son rejet
  //    joue contre la mesure, son adoption pour elle.
  const scrutinsVus = new Set(scrutins.map((s) => s.numero).filter(Boolean) as string[]);
  for (const et of ctx.etat?.etapes ?? []) {
    const num = (et.url.match(/\/scrutins\/(\d+)/) ?? [null, null])[1];
    if (!num || !et.date || et.statut === "a_venir" || posterieur(et.date, ref) || scrutinsVus.has(num)) continue;
    const sens: 1 | -1 | 0 = /rejet/i.test(et.nom) ? -1 : /adopt/i.test(et.nom) ? 1 : 0;
    evenements.push({
      id: idUnique(`ev-${num}`),
      date: et.date,
      type: "scrutin",
      titre: `${et.nom} (scrutin n° ${num})`,
      detail: `Étape du texte ${dossier.texte_id} conclue par le scrutin n° ${num}.`,
      importance: 3,
      url: et.url,
      effet: effet(ctx, "pour_mesure", sens),
      objectif_rang: dossier.objectifs[0].rang,
      preuve: preuve([{ label: `Scrutin n° ${num}`, url: et.url }], `Étape « ${et.nom} » lue dans etat.json avec son scrutin. ${sens === 0 ? "Sens du vote non lisible dans le nom de l'étape : effet neutre." : "Le texte porte la mesure : son " + (sens < 0 ? "rejet joue contre" : "adoption joue pour") + " la mesure, d'où l'effet sur l'objectif du client."}`, "deduction"),
    });
  }

  // 4. Modifications de la mesure (etat.json) non couvertes par un amendement du texte.
  for (const m of ctx.etat?.mesure.modifications ?? []) {
    if (posterieur(m.date, ref)) continue;
    const nums = numerosDuTitre(`${m.par} ${m.quoi}`);
    if (nums.some((n) => numerosCouverts.has(n))) continue;
    evenements.push({
      id: idUnique(`ev-modification-${m.date}`),
      date: m.date,
      type: /commission/i.test(m.par) ? "commission" : "amendement_sort",
      titre: `Mesure modifiée : ${m.quoi}`,
      detail: `Par ${m.par}.`,
      importance: 2,
      url: m.url,
      effet: "neutre",
      objectif_rang: dossier.objectifs[0].rang,
      preuve: { ...m.preuve, nature: "deduction", raisonnement: `${m.preuve.raisonnement} Effet non déduit : la modification n'est pas rattachée à un amendement du texte.` },
    });
  }

  // 5. Rapports et auditions (A1). Les rapports du texte sont nombreux (PLF : un par mission) : un événement
  //    par jour en importance 1, et un événement d'importance 2 par rapport où une organisation du dossier
  //    (client, organisations déclarées à la HATVP sur ce texte) a été entendue.
  const orgsDossier = new Set([dossier.client.toLowerCase(), ...(ctx.hatvp?.organisations ?? []).map((o) => o.nom.toLowerCase())]);
  const concerne = (nom: string) => { const n = nom.toLowerCase(); return [...orgsDossier].some((o) => n.includes(o) || o.includes(n.split(" (")[0])); };
  const rapportsVus = new Set<string>();
  const parJourRapports = new Map<string, { n: number; orgs: Set<string>; url: string }>();
  for (const pa of candidats(ctx)) {
    const au = lireKind(root, dossier.id, "auditions", pa);
    for (const a of au?.auditions ?? []) {
      if (posterieur(a.date, ref) || a.date > limite) continue;
      const cle = `${a.rapport_url ?? "audition"}|${a.date}`;
      if (rapportsVus.has(cle)) continue;
      rapportsVus.add(cle);
      const orgs = a.organisations.map((o) => o.nom);
      const url = a.rapport_url ?? au!.meta.sources[0]?.url ?? "https://www.assemblee-nationale.fr/";
      const entenduesDuDossier = orgs.filter(concerne);
      if (entenduesDuDossier.length > 0) {
        evenements.push({
          id: idUnique(`ev-${a.rapport_url ? "rapport" : "audition"}-${a.date}`),
          date: a.date,
          type: a.rapport_url ? "rapport" : "audition",
          titre: `${entenduesDuDossier.slice(0, 3).join(", ")} entendu${entenduesDuDossier.length > 1 ? "es" : "e"} ${a.rapport_url ? "pour un rapport" : "en audition"} (${a.role === "rapporteur_general" ? "rapporteur général" : a.role === "membre" ? "membre de la commission" : a.role.replace("_", " ")})`,
          detail: `Organisations entendues : ${orgs.join(", ")}.`,
          importance: 2,
          url,
          effet: "neutre",
          objectif_rang: dossier.objectifs[0].rang,
          preuve: preuve([{ label: a.rapport_url ? `Rapport du ${dateFr(a.date)}` : "Auditions", url }], "Annexe « personnes entendues » du rapport ; une organisation du dossier (client ou déclarée à la HATVP sur ce texte) y figure. Une audition ne change pas le verdict par elle-même.", "fait"),
        });
      }
      const j = parJourRapports.get(a.date) ?? { n: 0, orgs: new Set<string>(), url };
      j.n += 1;
      for (const o of orgs) j.orgs.add(o);
      parJourRapports.set(a.date, j);
    }
  }
  for (const [date, j] of parJourRapports) {
    evenements.push({
      id: idUnique(`ev-rapports-${date}`),
      date,
      type: "rapport",
      titre: `${j.n} rapport${j.n > 1 ? "s" : ""} du texte publié${j.n > 1 ? "s" : ""} avec la liste des personnes entendues (${j.orgs.size} organisation${j.orgs.size > 1 ? "s" : ""})`,
      detail: j.orgs.size > 0 ? `Organisations entendues : ${[...j.orgs].slice(0, 12).join(", ")}${j.orgs.size > 12 ? "…" : ""}.` : "Liste des organisations non publiée.",
      importance: 1,
      url: j.url,
      effet: "neutre",
      objectif_rang: dossier.objectifs[0].rang,
      preuve: preuve([{ label: `Rapports du ${dateFr(date)}`, url: j.url }], "Rapports lus par le producteur des auditions, sur l'ensemble du texte et pas seulement sur la mesure ; sans effet sur le verdict.", "fait"),
    });
  }

  // 6. Séances et commissions où le sujet a été abordé (A2 : debats/<PA> et arguments.json).
  const seances = new Map<string, { date: string; lieu: "seance" | "commission"; url: string; citations: string[] }>();
  const ajouterSeance = (date: string, lieu: "seance" | "commission", url: string, citation: string) => {
    if (posterieur(date, ref)) return;
    const s = seances.get(url) ?? { date, lieu, url, citations: [] };
    if (!s.citations.includes(citation)) s.citations.push(citation);
    seances.set(url, s);
  };
  for (const pa of candidats(ctx)) {
    const de = lireKind(root, dossier.id, "debats", pa);
    for (const d of de?.debats ?? []) ajouterSeance(d.date, d.lieu, d.url, d.citation);
  }
  for (const a of [...(argumentsEntendus?.pour ?? []), ...(argumentsEntendus?.contre ?? [])]) {
    if (a?.date && a?.lieu && a?.url && a?.citation) ajouterSeance(a.date, a.lieu, a.url, a.citation);
  }
  for (const s of seances.values()) {
    evenements.push({
      id: idUnique(`ev-${s.lieu}-${s.date}`),
      date: s.date,
      type: s.lieu,
      titre: `Sujet abordé en ${s.lieu === "seance" ? "séance publique" : "commission"} le ${dateFr(s.date)}`,
      detail: `${s.citations.length} intervention${s.citations.length > 1 ? "s" : ""} relevée${s.citations.length > 1 ? "s" : ""}, dont : « ${s.citations[0]} »`,
      importance: 1,
      url: s.url,
      effet: "neutre",
      objectif_rang: dossier.objectifs[0].rang,
      preuve: preuve([{ label: `Compte rendu du ${dateFr(s.date)}`, url: s.url }], "Interventions sur le sujet relevées dans le compte rendu ; une prise de parole ne change pas le verdict par elle-même.", "fait"),
    });
  }

  // 7. Flux Hémicycle : dépôts d'amendements sur l'ensemble du texte, un événement par jour (bruit utile, importance 1).
  if (evTexte) {
    const parJour = new Map<string, { nb: number; groupes: Set<string> }>();
    for (const l of evTexte.lignes) {
      if (l.event_type !== "amendements" || !/^\d{4}-\d{2}-\d{2}$/.test(l.event_date) || l.event_date > limite) continue;
      const j = parJour.get(l.event_date) ?? { nb: 0, groupes: new Set<string>() };
      j.nb += Number(l.nb) || 0;
      if (l.sous_titre) j.groupes.add(l.sous_titre);
      parJour.set(l.event_date, j);
    }
    for (const [date, j] of parJour) {
      evenements.push({
        id: idUnique(`ev-depots-${date}`),
        date,
        type: "amendement_depose",
        titre: `${j.nb} amendement${j.nb > 1 ? "s" : ""} déposé${j.nb > 1 ? "s" : ""} sur le texte${j.groupes.size ? ` (${[...j.groupes].join(", ")})` : ""}`,
        detail: "Dépôts sur l'ensemble du texte, toutes parties et tous sujets confondus, pas seulement sur la mesure suivie.",
        importance: 1,
        url: texteSource.url,
        effet: "neutre",
        objectif_rang: dossier.objectifs[0].rang,
        preuve: preuve([{ label: "Hémicycle, jeu evenements_parlementaires", url: "https://hemicycle.ai" }, texteSource], `Compte des dépôts par jour et par groupe dans le flux Hémicycle${evTexte.consulte_le ? ` consulté le ${evTexte.consulte_le.slice(0, 10)}` : ""} ; sans effet sur le verdict faute de lien avec la mesure.`, "fait"),
      });
    }
    sources.push({ label: "Hémicycle, jeu evenements_parlementaires", url: "https://hemicycle.ai" });
    limites.push(`Flux Hémicycle (${evTexte.provenance}) : ${evTexte.lignes.length} lignes sur 30 jours, dépôts comptés par jour.`);
  } else limites.push("Flux Hémicycle evenements_parlementaires non lu (pas de cache ; lancer avec --api).");

  // 8. HATVP : une déclaration n'est un événement que si elle est datée (date_declaration, P1) ; les autres ne sont pas datées par nous.
  let hatvpSansDate = 0;
  for (const o of ctx.hatvp?.organisations ?? []) {
    if (!o.date_declaration) { hatvpSansDate += 1; continue; }
    if (posterieur(o.date_declaration, ref) || o.date_declaration > limite) continue;
    evenements.push({
      id: idUnique(`ev-hatvp-${slug(o.nom)}`),
      date: o.date_declaration,
      type: "hatvp",
      titre: `${o.nom} déclare une action auprès de la HATVP`,
      detail: `Objet : ${o.objet}.${o.actions.length ? ` Actions : ${o.actions.join(", ")}.` : ""}`,
      importance: 1,
      url: o.fiche_url,
      effet: "neutre",
      objectif_rang: dossier.objectifs[0].rang,
      preuve: preuve([{ label: `Fiche HATVP de ${o.nom}`, url: o.fiche_url }], "Déclaration publiée au répertoire des représentants d'intérêts (HATVP) ; sans effet sur le verdict par elle-même.", "fait"),
    });
  }
  if (hatvpSansDate > 0) limites.push(`${hatvpSansDate} déclaration(s) HATVP sans date dans hatvp.json, non listée(s) comme événement.`);

  // 9. Agenda open data : réunions passées liées au texte.
  const agenda = lireAgenda(ctx, limite, idUnique);
  if (agenda === null) limites.push("Agenda open data absent (data/raw/opendata/Agenda.json.zip).");
  else {
    for (const r of agenda) evenements.push(r);
    if (agenda.length === 0) limites.push("Agenda open data lu, aucune réunion passée ne cite le texte.");
  }

  // Tri : importance décroissante puis date décroissante, identifiant pour la stabilité.
  const uniques = new Map<string, Evenement>();
  for (const e of evenements) if (!uniques.has(e.id)) uniques.set(e.id, e);
  const tries = [...uniques.values()].sort((a, b) => b.importance - a.importance || (b.date > a.date ? 1 : b.date < a.date ? -1 : 0) || a.id.localeCompare(b.id));

  if (ref) limites.unshift(`Événements jusqu'au ${dateFr(ref)} inclus (date de référence).`);
  const sansDate = (ctx.texte?.amendements ?? []).filter((a) => !a.date_depot).length;
  if (sansDate > 0) limites.push(`${sansDate} amendement(s) sans date de dépôt publiée : prédiction Orcet ou dernière étape du texte, dit dans chaque preuve.`);
  const nouveautes: Nouveautes = {
    meta: { generated_at: maintenant(), sources: fusionnerSources(sources), limits: limites.join(" "), producer: "pipeline/fiches", dossier_id: dossier.id },
    evenements: tries,
  };
  ecrireJson(dataPath(dossier.id, "nouveautes", undefined, root), nouveautes);
  noter(`${dossier.id}/nouveautes : ${tries.length} événements (${tries.filter((e) => e.importance === 3).length} d'importance 3)`);
  return nouveautes;
}

/** Réunions passées de l'agenda open data qui citent le numéro du texte ou les mots-clés ; null si le zip est absent. */
function lireAgenda(ctx: Contexte, limite: string, idUnique: (base: string) => string): Evenement[] | null {
  const zip = join(ctx.root, "raw", "opendata", "Agenda.json.zip");
  if (!existsSync(zip)) return null;
  const numeroTexte = (ctx.dossier.texte_id.match(/B(\d+)$/) ?? [null, null])[1];
  const mots = ctx.dossier.sujet.mots_cles.map((m) => m.toLowerCase());
  const out: Evenement[] = [];
  try {
    const liste = Bun.spawnSync(["unzip", "-Z1", zip]).stdout.toString().split("\n").filter((n) => n.endsWith(".json"));
    const lot = 400;
    for (let i = 0; i < liste.length; i += lot) {
      const noms = liste.slice(i, i + lot);
      const brut = Bun.spawnSync(["unzip", "-p", zip, ...noms]).stdout.toString();
      for (const texte of decouperJson(brut)) {
        let obj: any;
        try { obj = JSON.parse(texte); } catch { continue; }
        const r = obj?.reunion ?? obj;
        const date = String(r?.timeStamp?.dateDebut ?? r?.dateDebut ?? "").slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > limite) continue;
        if (/annul/i.test(String(r?.cycleDeVie?.etat ?? ""))) continue;
        const points = r?.ODJ?.pointsODJ?.pointODJ;
        const objets: string[] = (Array.isArray(points) ? points : points ? [points] : []).map((p: any) => String(p?.objet ?? "")).filter(Boolean);
        const tout = objets.join(" | ").toLowerCase();
        const lie = (numeroTexte && new RegExp(`n[°º]\\s*${numeroTexte}(?!\\d)`).test(tout)) || mots.some((m) => tout.includes(m));
        if (!lie || objets.length === 0) continue;
        const uid = String(r?.uid ?? `${date}-${out.length}`);
        const organe = String(r?.lieu?.libelleLong ?? r?.organeReuniRef ?? "réunion");
        out.push({
          id: idUnique(`ev-agenda-${slug(uid)}`),
          date,
          type: "agenda",
          titre: `Réunion du ${dateFr(date)} sur le texte (${organe})`,
          detail: objets[0].slice(0, 300),
          importance: 1,
          url: "https://data.assemblee-nationale.fr/reunions/reunions",
          effet: "neutre",
          objectif_rang: ctx.dossier.objectifs[0].rang,
          preuve: { sources: [{ label: "Agenda open data de l'Assemblée", url: "https://data.assemblee-nationale.fr/reunions/reunions" }], raisonnement: "Réunion de l'agenda open data dont l'ordre du jour cite le texte ou le sujet ; sans effet sur le verdict par elle-même.", nature: "fait" },
        });
      }
    }
  } catch (e) {
    noter(`! agenda illisible : ${String(e).slice(0, 100)}`);
    return null;
  }
  return out;
}

/** Découpe des objets JSON concaténés (sortie de `unzip -p` sur plusieurs fichiers). */
export function decouperJson(brut: string): string[] {
  const out: string[] = [];
  let prof = 0, debut = -1, enChaine = false, echappe = false;
  for (let i = 0; i < brut.length; i++) {
    const c = brut[i];
    if (enChaine) {
      if (echappe) echappe = false;
      else if (c === "\\") echappe = true;
      else if (c === '"') enChaine = false;
      continue;
    }
    if (c === '"') enChaine = true;
    else if (c === "{") { if (prof === 0) debut = i; prof += 1; }
    else if (c === "}") { prof -= 1; if (prof === 0 && debut >= 0) { out.push(brut.slice(debut, i + 1)); debut = -1; } }
  }
  return out;
}
