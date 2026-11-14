// Client Featherless (PLAN.md annexe A) et rédaction vérifiée (règle 5.13).
// Signatures documentées dans pipeline/lib/README.md : ne pas les changer.

import OpenAI from "openai";
import { z, type ZodTypeAny } from "zod";
import { etendreAutorises, extraireJetons, extraireMotsNombres, normaliser, verifierChiffres } from "./verif";

export const MODELE = process.env.FEATHERLESS_MODEL || "Qwen/Qwen3.8-27B";
export const BASE_URL = "https://api.featherless.ai/v1";
const TEMPERATURE = 0.2;
const MAX_PARALLELE = 2; // 2 unités de concurrence par appel (27B).
const PRIX_ENTREE = 0.4 / 1e6; // $ par jeton
const PRIX_SORTIE = 3 / 1e6;

/** Erreur levée quand le modèle n'est pas joignable (clé absente, réseau, 4xx/5xx répétés). */
export class LLMIndisponible extends Error {}

export function cleDisponible(): boolean {
  return Boolean(process.env.FEATHERLESS_API_KEY?.trim());
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!cleDisponible()) throw new LLMIndisponible("FEATHERLESS_API_KEY absente de .env");
  client ??= new OpenAI({ baseURL: BASE_URL, apiKey: process.env.FEATHERLESS_API_KEY!.trim(), maxRetries: 0, timeout: 90_000, fetch: (...a: Parameters<typeof fetch>) => globalThis.fetch(...a) });
  return client;
}

// --- Désactivation du thinking -------------------------------------------------
// « kwargs » = chat_template_kwargs {enable_thinking: false} ; « effort » = reasoning_effort "low" ;
// « aucun » = rien. Choix par FEATHERLESS_THINKING (défaut kwargs), voir status/P8.md.
function paramsThinking(): Record<string, unknown> {
  const m = process.env.FEATHERLESS_THINKING || "kwargs";
  if (m === "effort") return { reasoning_effort: "low" };
  if (m === "aucun") return {};
  return { chat_template_kwargs: { enable_thinking: false } };
}

// --- Concurrence et coût ---------------------------------------------------------
let enCours = 0;
const file: (() => void)[] = [];
async function avecJeton<T>(f: () => Promise<T>): Promise<T> {
  if (enCours >= MAX_PARALLELE) await new Promise<void>((r) => file.push(r));
  enCours += 1;
  try {
    return await f();
  } finally {
    enCours -= 1;
    file.shift()?.();
  }
}

const usage = { appels: 0, entree: 0, sortie: 0 };
/** Coût cumulé du processus en dollars, et jetons consommés. */
export function coutCumule() {
  return { ...usage, dollars: usage.entree * PRIX_ENTREE + usage.sortie * PRIX_SORTIE };
}

type Message = { role: "system" | "user" | "assistant"; content: string };

async function chat(body: Record<string, unknown>): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const c = getClient();
  return avecJeton(async () => {
    let derniere: unknown;
    for (let essai = 0; essai < 4; essai++) {
      try {
        const r = (await c.chat.completions.create({
          model: MODELE,
          temperature: TEMPERATURE,
          ...paramsThinking(),
          ...body,
        } as any)) as OpenAI.Chat.Completions.ChatCompletion;
        usage.appels += 1;
        usage.entree += r.usage?.prompt_tokens ?? 0;
        usage.sortie += r.usage?.completion_tokens ?? 0;
        return r;
      } catch (e: any) {
        derniere = e;
        const statut = e?.status as number | undefined;
        if (statut && statut < 500 && statut !== 429) break; // erreur de requête : inutile d'insister
        const attente = Number(e?.headers?.["retry-after"]) * 1000 || 1500 * 2 ** essai;
        await new Promise((r) => setTimeout(r, attente));
      }
    }
    throw new LLMIndisponible(`Featherless : ${(derniere as any)?.message ?? derniere}`);
  });
}

/** Retire un éventuel bloc de réflexion <think>...</think> et les espaces de bord. */
export function nettoyer(texte: string): string {
  return texte.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^<think>[\s\S]*$/, "").trim();
}

// --- Schéma zod -> JSON Schema (sous-ensemble utile aux outils) -------------------
export function zodVersJsonSchema(s: ZodTypeAny): Record<string, unknown> {
  const def: any = s._def;
  const desc = def.description ? { description: def.description } : {};
  switch (def.typeName) {
    case "ZodObject": {
      const shape = def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [k, v] of Object.entries(shape)) {
        properties[k] = zodVersJsonSchema(v as ZodTypeAny);
        if (!(v as ZodTypeAny).isOptional()) required.push(k);
      }
      return { type: "object", properties, required, additionalProperties: false, ...desc };
    }
    case "ZodString": return { type: "string", ...desc };
    case "ZodNumber": return { type: def.checks?.some((c: any) => c.kind === "int") ? "integer" : "number", ...desc };
    case "ZodBoolean": return { type: "boolean", ...desc };
    case "ZodArray": return { type: "array", items: zodVersJsonSchema(def.type), ...desc };
    case "ZodEnum": return { type: "string", enum: def.values, ...desc };
    case "ZodLiteral": return { const: def.value, ...desc };
    case "ZodNullable": return { anyOf: [zodVersJsonSchema(def.innerType), { type: "null" }], ...desc };
    case "ZodOptional": return zodVersJsonSchema(def.innerType);
    case "ZodDefault": return zodVersJsonSchema(def.innerType);
    case "ZodEffects": return zodVersJsonSchema(def.schema);
    case "ZodUnion": return { anyOf: def.options.map((o: ZodTypeAny) => zodVersJsonSchema(o)), ...desc };
    case "ZodRecord": return { type: "object", additionalProperties: zodVersJsonSchema(def.valueType), ...desc };
    default: return { ...desc };
  }
}

/**
 * Appel structuré : le schéma est passé comme unique outil `repondre`, le modèle est forcé à l'appeler,
 * les arguments sont validés par zod. Deux tentatives (la seconde reçoit l'erreur de validation).
 * Lève LLMIndisponible si le modèle n'est pas joignable ou ne rend jamais d'objet valide.
 */
export async function appelStructure<T>(system: string, user: string, schemaZod: z.ZodType<T>): Promise<T> {
  const outil = {
    type: "function" as const,
    function: {
      name: "repondre",
      description: "Rend la réponse structurée demandée.",
      parameters: zodVersJsonSchema(schemaZod as unknown as ZodTypeAny),
    },
  };
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  let erreur = "";
  for (let essai = 0; essai < 2; essai++) {
    const r = await chat({ messages, tools: [outil], tool_choice: { type: "function", function: { name: "repondre" } } });
    const msg = r.choices[0]?.message;
    const brut = msg?.tool_calls?.[0] && "function" in msg.tool_calls[0] ? msg.tool_calls[0].function.arguments : nettoyer(msg?.content ?? "");
    try {
      const json = JSON.parse(brut.replace(/^```(?:json)?\s*|\s*```$/g, ""));
      const res = schemaZod.safeParse(json);
      if (res.success) return res.data;
      erreur = res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (e) {
      erreur = `JSON illisible : ${String(e)}`;
    }
    messages.push({ role: "assistant", content: brut }, { role: "user", content: `Réponse invalide (${erreur}). Rappelle l'outil repondre avec un objet conforme.` });
  }
  throw new LLMIndisponible(`appelStructure : sortie invalide après 2 tentatives (${erreur})`);
}

export type Redaction = {
  texte: string;
  mode: "llm" | "gabarit";
  /** Entrées de chiffresAutorises effectivement présentes dans le texte (à recopier dans le JSON). */
  chiffres_utilises: string[];
  /** Jetons fautifs de la dernière tentative du modèle ([] si le texte du modèle est passé). */
  fautifs: string[];
  /** MODELE en mode llm, null en mode gabarit (contrat : gabarit implique modele null). */
  modele: string | null;
  /** true si le texte rendu passe le vérificateur. */
  verifie: boolean;
  tentatives: number;
};

/** Entrées de la liste autorisée dont au moins une valeur apparaît dans le texte. */
export function chiffresUtilises(texte: string, autorises: string[]): string[] {
  const n = normaliser(texte);
  const valeurs = [...extraireJetons(n), ...extraireMotsNombres(n)].map((j) => j.valeur);
  const proche = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const utilises: string[] = [];
  for (const e of autorises) {
    // Date ISO : comptée si son jour (ou son mois pour AAAA-MM) apparaît, l'année seule ne suffit pas.
    const date = String(e).trim().match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
    const ext = date
      ? [Number(date[3] ?? date[2])]
      : [...etendreAutorises([e])].filter((v) => ![2024, 2025, 2026, 2027].includes(v) || String(e).includes(String(v)));
    if (ext.some((v) => valeurs.some((x) => proche(x, v)))) utilises.push(e);
  }
  return [...new Set(utilises)];
}

/**
 * Rédaction vérifiée : jusqu'à 3 tentatives du modèle, chaque sortie passe verifierChiffres ;
 * une sortie fautive renvoie au modèle la liste des jetons à retirer. Échec ou modèle absent :
 * le gabarit (texte à trous déjà rempli par l'appelant) est rendu avec mode "gabarit".
 * Ne lève jamais d'exception.
 */
export async function redigerVerifie(
  prompt: string | { system: string; user: string },
  chiffresAutorises: string[],
  gabarit: string | (() => string),
): Promise<Redaction> {
  const autorises = chiffresAutorises.map(String);
  const { system, user } = typeof prompt === "string"
    ? { system: "Tu rédiges en français, phrases courtes, sans jargon. Tu n'écris aucun nombre absent de la liste fournie.", user: prompt }
    : prompt;
  const consigne = `\n\nChiffres autorisés (tu n'en écris aucun autre, ni en chiffres ni en lettres) : ${autorises.join(", ") || "aucun"}.\nRends uniquement le texte, sans titre ni guillemets.`;
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: user + consigne },
  ];
  let fautifs: string[] = [];
  let tentatives = 0;
  if (cleDisponible()) {
    for (; tentatives < 3; ) {
      tentatives += 1;
      let texte: string;
      try {
        const r = await chat({ messages });
        texte = nettoyer(r.choices[0]?.message?.content ?? "");
      } catch {
        break; // modèle indisponible : gabarit
      }
      if (!texte) continue;
      const v = verifierChiffres(texte, autorises);
      if (v.ok) {
        return { texte, mode: "llm", chiffres_utilises: chiffresUtilises(texte, autorises), fautifs: [], modele: MODELE, verifie: true, tentatives };
      }
      fautifs = v.fautifs;
      messages.push(
        { role: "assistant", content: texte },
        { role: "user", content: `Ces nombres ne figurent pas dans la liste autorisée : ${v.fautifs.join(", ")}. Réécris le texte en les retirant, sans en ajouter d'autres.` },
      );
    }
  }
  const texte = typeof gabarit === "function" ? gabarit() : gabarit;
  const v = verifierChiffres(texte, autorises);
  return {
    texte,
    mode: "gabarit",
    chiffres_utilises: chiffresUtilises(texte, autorises),
    fautifs: fautifs.length ? fautifs : v.fautifs,
    modele: null,
    verifie: v.ok,
    tentatives,
  };
}
