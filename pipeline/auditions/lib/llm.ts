// Appel minimal à Featherless (chat/completions, sortie JSON validée par zod).
// À remplacer par `pipeline/lib/llm.ts` (P8) dès qu'il existe : même signature `appelStructure`.
import type { z } from "zod";

const BASE = "https://api.featherless.ai/v1";
export const MODELE = process.env.FEATHERLESS_MODEL ?? "Qwen/Qwen3.8-27B";

export function modeleDisponible(): boolean {
  return Boolean(process.env.FEATHERLESS_API_KEY) && process.env.AUDITIONS_SANS_MODELE !== "1";
}

export async function appelStructure<T>(schema: z.ZodType<T>, systeme: string, utilisateur: string, essais = 2): Promise<T | null> {
  const cle = process.env.FEATHERLESS_API_KEY;
  if (!cle) return null;
  for (let i = 0; i < essais; i++) {
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODELE,
          temperature: 0,
          max_tokens: 6000,
          response_format: { type: "json_object" },
          chat_template_kwargs: { enable_thinking: false },
          messages: [
            { role: "system", content: systeme },
            { role: "user", content: utilisateur },
          ],
        }),
      });
      if (res.status === 429) {
        await Bun.sleep(3000 * (i + 1));
        continue;
      }
      if (!res.ok) {
        console.warn(`  modèle : HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
        continue;
      }
      const json: any = await res.json();
      let contenu: string = json?.choices?.[0]?.message?.content ?? "";
      contenu = contenu.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      const debut = contenu.indexOf("{");
      const fin = contenu.lastIndexOf("}");
      if (debut < 0 || fin < 0) continue;
      const parsed = schema.safeParse(JSON.parse(contenu.slice(debut, fin + 1)));
      if (parsed.success) return parsed.data;
      console.warn(`  modèle : sortie invalide (${parsed.error.issues[0]?.message})`);
    } catch (e) {
      console.warn(`  modèle : ${(e as Error).message}`);
    }
  }
  return null;
}
