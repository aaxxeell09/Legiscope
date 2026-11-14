import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const data = join(import.meta.dirname, "..", "..", "data");

for (const dossier of readdirSync(data)) {
  const nouveautesPath = join(data, dossier, "nouveautes.json");
  const verdictPath = join(data, dossier, "verdict.json");
  if (!existsSync(nouveautesPath)) continue;

  const nouveautes = JSON.parse(readFileSync(nouveautesPath, "utf8"));
  const renommages = new Map();
  const ids = new Set();

  for (const evenement of nouveautes.evenements ?? []) {
    let prochain = evenement.id;
    if (evenement.type === "amendement_depose") {
      const numero = String(evenement.url ?? "").match(/N0*(\d+)(?:\D|$)/)?.[1]
        ?? String(evenement.id).match(/(?:depot-)?(\d+)(?:-\d+)?$/)?.[1];
      if (numero) prochain = `ev-depot-${numero}`;
    }
    const base = prochain;
    for (let suffixe = 2; ids.has(prochain); suffixe++) prochain = `${base}-${suffixe}`;
    ids.add(prochain);
    if (prochain !== evenement.id) renommages.set(evenement.id, prochain);
    evenement.id = prochain;
  }

  if (renommages.size > 0) writeFileSync(nouveautesPath, `${JSON.stringify(nouveautes, null, 2)}\n`);

  if (existsSync(verdictPath)) {
    const verdict = JSON.parse(readFileSync(verdictPath, "utf8"));
    let verdictModifie = false;
    for (const objectif of verdict.verdicts ?? []) {
      const cause = objectif.cause_du_changement;
      if (!cause) continue;
      let prochain = renommages.get(cause.evenement_id);
      if (!prochain) {
        const url = cause.preuve?.sources?.find((source) => source.url)?.url;
        prochain = (nouveautes.evenements ?? []).find((evenement) =>
          evenement.titre === cause.titre
          || (url && evenement.preuve?.sources?.some((source) => source.url === url)),
        )?.id;
      }
      if (prochain && prochain !== cause.evenement_id) {
        cause.evenement_id = prochain;
        verdictModifie = true;
      }
    }
    if (verdictModifie) writeFileSync(verdictPath, `${JSON.stringify(verdict, null, 2)}\n`);
  }

  if (renommages.size > 0) console.log(`${dossier}: ${renommages.size} identifiant(s) stabilisé(s)`);
}
