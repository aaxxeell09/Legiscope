// Classement d'une prise de parole pour ou contre la mesure (pas l'objectif du client), par le modèle
// Featherless, avec cache sur disque. Constat du 14 novembre (14 h 05, Qwen/Qwen3.8-27B) : le modèle ignore
// `tools` et `tool_choice` et répond par du JSON libre dans `content` ; `appelStructure` de P8 échoue donc.
// Ici : `response_format: json_object`, clés imposées dans la consigne, JSON lu dans le contenu, validé par zod.
// Sans FEATHERLESS_API_KEY, rien n'est appelé : les arguments viennent du seul repli manuel
// pipeline/debats/classement-manuel/<dossier>.json (même format, relu par une personne), et meta.limits le dit.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import OpenAI from "openai";
import { z } from "zod";
import type { DossierConfig } from "../../contracts";
import { BASE_URL, cleDisponible, MODELE } from "../lib/llm";
import { RAW } from "./contexte";
import { citationDansSource } from "./texte";
import type { Intervention } from "./types";

export const ClassementSchema = z.object({
  sur_le_sujet: z.boolean(),
  camp: z.enum(["pour", "contre", "neutre"]),
  argument: z.string(),
  citation: z.string(),
  confiance: z.number().min(0).max(1),
});
export type Classement = z.infer<typeof ClassementSchema>;

export type ClassementVerifie = Classement & { origine: "modele" | "manuel"; modele: string | null };

export { cleDisponible };
const CONCURRENCE = Number(process.env.FEATHERLESS_CONCURRENCE ?? "2");

let client: OpenAI | null = null;
function getClient(): OpenAI {
  client ??= new OpenAI({ baseURL: BASE_URL, apiKey: process.env.FEATHERLESS_API_KEY!.trim(), maxRetries: 0, timeout: 90_000 });
  return client;
}

export function consigne(dossier: DossierConfig): string {
  return [
    "Tu lis une prise de parole d'un débat parlementaire français (séance publique ou commission des finances).",
    `La mesure étudiée : ${dossier.mesure.label} (sujet : ${dossier.sujet.label}).`,
    "Tu dois dire si l'orateur prend explicitement position sur CETTE mesure, dans quel camp, et avec quel argument.",
    "« pour » : il défend, soutient, vote ou veut renforcer la mesure (y compris s'il regrette qu'elle n'aille pas assez loin).",
    "« contre » : il s'y oppose, la refuse, veut la supprimer, la réduire, la reporter, ou dit qu'elle est inefficace, injuste ou contournable.",
    "« neutre » : il parle du sujet sans se prononcer sur la mesure (constat, question, autre proposition, polémique sur un autre point). Dans le doute, « neutre » avec une confiance basse.",
    "Ne juge jamais par rapport à un client ou à un objectif, seulement par rapport à la mesure. N'invente pas une position implicite : une critique du gouvernement ou de la Chine n'est pas une position sur la taxe.",
    "Le contexte dit ce qui est en discussion (article, amendement). Un avis favorable ou défavorable sur un amendement n'est une position sur la mesure que si cet amendement la supprime, la réduit, la reporte ou la renforce ; un avis sur un autre amendement (autre taxe, autre assiette, précision technique) est « neutre ».",
    "L'argument est la raison donnée par l'orateur, en une ligne de 120 caractères au plus, sans nom d'orateur, formulée comme une affirmation sur la mesure (exemples : « La taxe pèse sur les ménages modestes », « La taxe se contourne en regroupant les envois », « La taxe protège les commerces de proximité »).",
    "La citation : 1 à 3 phrases ENTIÈRES recopiées mot pour mot depuis le texte fourni, sans rien changer, qui portent l'argument.",
    "La confiance (0 à 1) : 0,9 et plus seulement si la position est dite en toutes lettres ; 0,7 à 0,85 si elle est claire mais indirecte ; moins de 0,7 si elle est déduite.",
    'Réponds UNIQUEMENT par un objet JSON avec exactement ces clés : "sur_le_sujet" (true/false), "camp" ("pour" | "contre" | "neutre"), "argument" (texte), "citation" (texte), "confiance" (nombre).',
  ].join("\n");
}

function lireJson(contenu: string): unknown {
  const t = contenu.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const sans = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(sans);
  } catch {
    const m = sans.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

/** Un appel au modèle, deux tentatives (la seconde reçoit l'erreur de validation). null si rien de valide. */
async function appelModele(dossier: DossierConfig, it: Intervention, log: (s: string) => void): Promise<Classement | null> {
  const user = `Orateur : ${it.orateur_nom}${it.orateur_qualite ? ` (${it.orateur_qualite})` : ""}, ${it.lieu === "seance" ? "séance publique" : "commission des finances"} du ${it.date}.${it.contexte ? `\nContexte : ${it.contexte}.` : ""}\n\nTexte :\n${it.texte}`;
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: consigne(dossier) },
    { role: "user", content: user },
  ];
  for (let tentative = 0; tentative < 2; tentative++) {
    let r: OpenAI.Chat.Completions.ChatCompletion | null = null;
    for (let essai = 0; essai < 4 && !r; essai++) {
      try {
        r = await getClient().chat.completions.create({
          model: MODELE,
          temperature: 0.1,
          max_tokens: 700,
          chat_template_kwargs: { enable_thinking: false },
          response_format: { type: "json_object" },
          messages,
        } as any);
      } catch (e: any) {
        const statut = e?.status as number | undefined;
        if (statut && statut < 500 && statut !== 429) {
          log(`modèle ${it.id} : HTTP ${statut} ${String(e?.message).slice(0, 120)}`);
          return null;
        }
        await Bun.sleep(1500 * 2 ** essai);
      }
    }
    if (!r) return null;
    const contenu = r.choices?.[0]?.message?.content ?? "";
    const brut = lireJson(contenu);
    const res = ClassementSchema.safeParse(brut);
    if (res.success) return res.data;
    messages.push({ role: "assistant", content: contenu });
    messages.push({ role: "user", content: `Réponse invalide (${res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}). Renvoie uniquement l'objet JSON demandé, avec les cinq clés.` });
  }
  return null;
}

type Cache = Record<string, Classement | null>;

function fichierCache(dossierId: string): string {
  mkdirSync(join(RAW, "debats"), { recursive: true });
  return join(RAW, "debats", `classement-${dossierId}.json`);
}

function lireManuel(dossierId: string): Record<string, Classement> {
  const f = join(import.meta.dir, "classement-manuel", `${dossierId}.json`);
  if (!existsSync(f)) return {};
  const j = JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>;
  const out: Record<string, Classement> = {};
  for (const [k, v] of Object.entries(j)) {
    if (k.startsWith("_")) continue;
    const r = ClassementSchema.safeParse(v);
    if (r.success) out[k] = r.data;
  }
  return out;
}

/**
 * Classe toutes les interventions. Priorité : classement manuel relu, puis cache du modèle, puis appel.
 * Ne renvoie que les classements dont la citation est retrouvée mot pour mot dans le texte source.
 */
export async function classerTout(
  dossier: DossierConfig,
  interventions: Intervention[],
  log: (s: string) => void,
): Promise<{ resultats: Map<string, ClassementVerifie>; modeleUtilise: boolean; rejets: number; appels: number }> {
  const resultats = new Map<string, ClassementVerifie>();
  const manuel = lireManuel(dossier.id);
  const fc = fichierCache(dossier.id);
  const cache: Cache = existsSync(fc) ? JSON.parse(readFileSync(fc, "utf8")) : {};
  let rejets = 0;
  let appels = 0;
  const aAppeler: Intervention[] = [];

  for (const it of interventions) {
    if (manuel[it.id]) {
      const c = manuel[it.id];
      if (citationDansSource(c.citation, it.texte)) resultats.set(it.id, { ...c, origine: "manuel", modele: null });
      else { rejets += 1; log(`manuel ${it.id} : citation introuvable dans le texte, rejetée`); }
      continue;
    }
    if (it.id in cache && cache[it.id] !== null) {
      const c = cache[it.id]!;
      if (citationDansSource(c.citation, it.texte)) resultats.set(it.id, { ...c, origine: "modele", modele: MODELE });
      else rejets += 1;
      continue;
    }
    aAppeler.push(it);
  }

  const modeleUtilise = cleDisponible() && aAppeler.length > 0;
  if (aAppeler.length > 0 && !cleDisponible()) {
    log(`${aAppeler.length} interventions non classées : FEATHERLESS_API_KEY absente`);
    return { resultats, modeleUtilise: false, rejets, appels };
  }

  let i = 0;
  const sauver = () => writeFileSync(fc, JSON.stringify(cache, null, 2));
  const worker = async () => {
    while (i < aAppeler.length) {
      const it = aAppeler[i++];
      try {
        const c = await appelModele(dossier, it, log);
        appels += 1;
        cache[it.id] = c;
        if (c && citationDansSource(c.citation, it.texte)) resultats.set(it.id, { ...c, origine: "modele", modele: MODELE });
        else if (c) { rejets += 1; log(`modèle ${it.id} : citation non retrouvée mot pour mot, rejetée`); }
        else log(`modèle ${it.id} : pas de réponse valide`);
        if (appels % 10 === 0) { sauver(); log(`classement ${appels}/${aAppeler.length}`); }
      } catch (e) {
        log(`modèle ${it.id} : ${String(e).slice(0, 200)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCE) }, worker));
  sauver();
  return { resultats, modeleUtilise, rejets, appels };
}

// --- Regroupement des arguments identiques -------------------------------------------------------

const GroupesSchema = z.object({
  groupes: z.array(z.object({
    argument: z.string(),
    membres: z.array(z.number().int()),
    meilleure: z.number().int(),
  })),
});

export type Groupe = { argument: string; membres: number[]; meilleure: number };

/**
 * Regroupe des arguments d'un même camp qui disent la même chose. Entrée : libellés indexés.
 * Sortie : un libellé commun par groupe, ses membres, l'index de la citation la plus claire.
 * null si le modèle ne répond pas (l'appelant garde alors son dédoublonnage lexical).
 */
export async function regrouper(
  dossier: DossierConfig,
  camp: "pour" | "contre",
  elements: { argument: string; citation: string }[],
  log: (s: string) => void,
): Promise<Groupe[] | null> {
  if (!cleDisponible() || elements.length < 2) return null;
  const system = [
    `Tu regroupes des arguments entendus dans un débat parlementaire, tous ${camp === "pour" ? "en faveur de" : "contre"} la mesure : ${dossier.mesure.label}.`,
    "Deux arguments vont dans le même groupe s'ils avancent la même raison (même idée, même mécanisme), même formulés différemment. Un argument qui ne ressemble à aucun autre forme un groupe seul.",
    "Pour chaque groupe : un libellé commun en une ligne de 120 caractères au plus, formulé comme une affirmation sur la mesure ; la liste des indices membres ; l'indice de la citation la plus claire et la plus courte qui porte l'argument.",
    "Chaque indice apparaît dans exactement un groupe.",
    'Réponds UNIQUEMENT par un objet JSON : {"groupes": [{"argument": texte, "membres": [indices], "meilleure": indice}]}.',
  ].join("\n");
  const user = elements.map((e, i) => `${i}. ${e.argument}\n   Citation : ${e.citation.slice(0, 300)}`).join("\n");
  for (let essai = 0; essai < 3; essai++) {
    try {
      const r = await getClient().chat.completions.create({
        model: MODELE,
        temperature: 0.1,
        max_tokens: 2500,
        chat_template_kwargs: { enable_thinking: false },
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      } as any);
      const res = GroupesSchema.safeParse(lireJson(r.choices?.[0]?.message?.content ?? ""));
      if (!res.success) continue;
      // Validation : chaque indice une fois ; les oubliés deviennent des groupes seuls ; meilleure ∈ membres.
      const vus = new Set<number>();
      const groupes: Groupe[] = [];
      for (const g of res.data.groupes) {
        const membres = [...new Set(g.membres)].filter((i) => i >= 0 && i < elements.length && !vus.has(i));
        if (membres.length === 0) continue;
        membres.forEach((i) => vus.add(i));
        const meilleure = membres.includes(g.meilleure) ? g.meilleure : membres[0];
        groupes.push({ argument: g.argument.trim() || elements[meilleure].argument, membres, meilleure });
      }
      for (let i = 0; i < elements.length; i++) if (!vus.has(i)) groupes.push({ argument: elements[i].argument, membres: [i], meilleure: i });
      return groupes;
    } catch (e) {
      log(`regroupement ${camp} : ${String(e).slice(0, 160)}`);
      await Bun.sleep(1500 * 2 ** essai);
    }
  }
  return null;
}

// --- Contre-vérification du camp ------------------------------------------------------------------

const VerifSchema = z.object({ camp: z.enum(["pour", "contre", "neutre"]), confiance: z.number().min(0).max(1) });

/**
 * Second avis indépendant sur le camp d'un argument retenu (consigne différente, citation et contexte seuls).
 * Renvoie le camp confirmé ou null si le modèle ne répond pas. Cache sur disque (clé id#v).
 */
export async function verifierCamp(
  dossier: DossierConfig,
  it: Intervention,
  c: Classement,
  log: (s: string) => void,
): Promise<{ camp: "pour" | "contre" | "neutre"; confiance: number } | null> {
  const fc = fichierCache(dossier.id);
  const cache: Record<string, unknown> = existsSync(fc) ? JSON.parse(readFileSync(fc, "utf8")) : {};
  const cle = `${it.id}#v`;
  if (cle in cache) {
    const r = VerifSchema.safeParse(cache[cle]);
    return r.success ? r.data : null;
  }
  if (!cleDisponible()) return null;
  const system = [
    `Mesure : ${dossier.mesure.label}.`,
    "On te donne une citation d'un parlementaire, avec ce qui était en discussion. Dis si, dans cette citation, l'orateur est POUR la mesure (il la défend, la soutient, refuse sa suppression, veut la durcir), CONTRE (il la refuse, veut la supprimer, la réduire, la reporter, la juge injuste, inefficace ou contournable) ou NEUTRE (il ne se prononce pas sur la mesure elle-même).",
    "Attention : attaquer un amendement de suppression de la mesure, c'est être POUR la mesure. Défendre un amendement de suppression, c'est être CONTRE. Un avis sur un amendement qui ne touche pas la mesure elle-même est NEUTRE.",
    'Réponds UNIQUEMENT par un objet JSON : {"camp": "pour" | "contre" | "neutre", "confiance": nombre entre 0 et 1}.',
  ].join("\n");
  const user = `Orateur : ${it.orateur_nom}${it.orateur_qualite ? ` (${it.orateur_qualite})` : ""}.${it.contexte ? `\nEn discussion : ${it.contexte}.` : ""}\nArgument relevé : ${c.argument}\nCitation : « ${c.citation} »`;
  for (let essai = 0; essai < 3; essai++) {
    try {
      const r = await getClient().chat.completions.create({
        model: MODELE,
        temperature: 0.1,
        max_tokens: 120,
        chat_template_kwargs: { enable_thinking: false },
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      } as any);
      const res = VerifSchema.safeParse(lireJson(r.choices?.[0]?.message?.content ?? ""));
      if (!res.success) continue;
      const frais: Record<string, unknown> = existsSync(fc) ? JSON.parse(readFileSync(fc, "utf8")) : {};
      frais[cle] = res.data;
      writeFileSync(fc, JSON.stringify(frais, null, 2));
      return res.data;
    } catch (e) {
      log(`vérification ${it.id} : ${String(e).slice(0, 160)}`);
      await Bun.sleep(1500 * 2 ** essai);
    }
  }
  return null;
}
