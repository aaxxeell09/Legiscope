import { afterEach, describe, expect, test } from "bun:test";
import { z } from "zod";
import { appelStructure, chiffresUtilises, redigerVerifie, zodVersJsonSchema } from "./llm";

const fetchOrigine = globalThis.fetch;
const cleOrigine = process.env.FEATHERLESS_API_KEY;
afterEach(() => {
  globalThis.fetch = fetchOrigine;
  process.env.FEATHERLESS_API_KEY = cleOrigine ?? "";
});

/** Simule Featherless : chaque appel renvoie la réponse suivante de la liste. */
function simuler(reponses: Array<{ content?: string; args?: unknown }>) {
  process.env.FEATHERLESS_API_KEY = "test";
  const corps: any[] = [];
  let i = 0;
  globalThis.fetch = (async (_url: any, init: any) => {
    corps.push(JSON.parse(init.body));
    const r = reponses[Math.min(i++, reponses.length - 1)];
    const message = r.args !== undefined
      ? { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "repondre", arguments: JSON.stringify(r.args) } }] }
      : { role: "assistant", content: r.content };
    return new Response(JSON.stringify({ id: "x", object: "chat.completion", created: 0, model: "m", choices: [{ index: 0, message, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 50 } }), { status: 200, headers: { "content-type": "application/json" } });
  }) as any;
  return corps;
}

describe("redigerVerifie", () => {
  test("sans clé : gabarit, modele null, vérifié si le gabarit passe", async () => {
    process.env.FEATHERLESS_API_KEY = "";
    const r = await redigerVerifie("x", ["806", "0.24"], "L'amendement n° 806 est prédit à 24 %.");
    expect(r.mode).toBe("gabarit");
    expect(r.modele).toBeNull();
    expect(r.verifie).toBe(true);
    expect(r.chiffres_utilises.sort()).toEqual(["0.24", "806"]);
  });

  test("sortie fautive puis corrigée : mode llm à la 2e tentative, jetons fautifs renvoyés au modèle", async () => {
    const corps = simuler([{ content: "Il y a 12 groupes et l'amendement n° 806." }, { content: "L'amendement n° 806 est en attente." }]);
    const r = await redigerVerifie({ system: "s", user: "u" }, ["806"], "gabarit");
    expect(r.mode).toBe("llm");
    expect(r.tentatives).toBe(2);
    expect(r.chiffres_utilises).toEqual(["806"]);
    expect(corps[1].messages.at(-1).content).toContain("12");
    expect(corps[0].temperature).toBe(0.2);
    expect(corps[0].chat_template_kwargs).toEqual({ enable_thinking: false });
  });

  test("3 sorties fautives : gabarit avec les jetons fautifs du modèle", async () => {
    simuler([{ content: "Soit 99 députés." }]);
    const r = await redigerVerifie("u", ["3"], "Trois groupes.");
    expect(r.mode).toBe("gabarit");
    expect(r.tentatives).toBe(3);
    expect(r.fautifs).toEqual(["99"]);
    expect(r.verifie).toBe(true);
  });

  test("bloc <think> retiré", async () => {
    simuler([{ content: "<think>calcul 42</think>Texte sans nombre." }]);
    const r = await redigerVerifie("u", [], "g");
    expect(r).toMatchObject({ mode: "llm", texte: "Texte sans nombre." });
  });
});

describe("appelStructure", () => {
  const S = z.object({ titre: z.string(), score: z.number().nullable(), tags: z.array(z.enum(["a", "b"])) });

  test("outil unique forcé, objet validé", async () => {
    const corps = simuler([{ args: { titre: "t", score: null, tags: ["a"] } }]);
    const r = await appelStructure("s", "u", S);
    expect(r).toEqual({ titre: "t", score: null, tags: ["a"] });
    expect(corps[0].tools).toHaveLength(1);
    expect(corps[0].tool_choice.function.name).toBe("repondre");
  });

  test("objet invalide puis valide : seconde tentative", async () => {
    simuler([{ args: { titre: 3 } }, { args: { titre: "t", score: 1, tags: [] } }]);
    expect((await appelStructure("s", "u", S)).score).toBe(1);
  });

  test("sans clé : lève LLMIndisponible", async () => {
    process.env.FEATHERLESS_API_KEY = "";
    await expect(appelStructure("s", "u", S)).rejects.toThrow("FEATHERLESS_API_KEY");
  });
});

test("zodVersJsonSchema : objet, nullable, enum, requis", () => {
  const j: any = zodVersJsonSchema(z.object({ a: z.string(), b: z.number().int().nullable(), c: z.enum(["x"]).optional() }));
  expect(j.required).toEqual(["a", "b"]);
  expect(j.properties.b.anyOf[0].type).toBe("integer");
  expect(j.properties.c.enum).toEqual(["x"]);
});

test("chiffresUtilises : date ISO, probabilité, année jamais attribuée à tort", () => {
  const t = "Le 18 novembre 2025, l'amendement a obtenu 71 %. En 2026, rien.";
  expect(chiffresUtilises(t, ["2025-11-18", "0.71", "2026-01-01", "5"]).sort()).toEqual(["0.71", "2025-11-18"]);
});
