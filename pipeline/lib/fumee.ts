// Test de fumée réel Featherless : bun pipeline/lib/fumee.ts
// Teste les deux façons de couper le thinking, un appel structuré, une rédaction vérifiée.
import { z } from "zod";
import { appelStructure, cleDisponible, coutCumule, MODELE, redigerVerifie } from "./llm";

if (!cleDisponible()) {
  console.log("FEATHERLESS_API_KEY absente : test de fumée impossible.");
  process.exit(1);
}
for (const mode of ["kwargs", "effort"]) {
  process.env.FEATHERLESS_THINKING = mode;
  const t0 = Date.now();
  try {
    const r = await redigerVerifie(
      "Écris une phrase : l'amendement n° 806 de suppression de la taxe sur les petits colis est prédit à 24 % de votes pour.",
      ["806", "0.24"],
      "L'amendement n° 806 est prédit à 24 % de votes pour.",
    );
    console.log(`[${mode}] ${Date.now() - t0} ms`, JSON.stringify(r));
  } catch (e) {
    console.log(`[${mode}] échec`, String(e));
  }
}
const t1 = Date.now();
try {
  const o = await appelStructure(
    "Tu classes une intervention parlementaire.",
    "« Cette taxe va tuer le petit commerce en ligne. » Le député est-il pour ou contre la taxe ?",
    z.object({ position: z.enum(["pour", "contre", "inconnue"]), raison: z.string() }),
  );
  console.log(`[structure] ${Date.now() - t1} ms`, JSON.stringify(o));
} catch (e) {
  console.log("[structure] échec", String(e));
}
console.log(`Modèle ${MODELE}, coût`, JSON.stringify(coutCumule()));
