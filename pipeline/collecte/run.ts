// bun run collecte : régénère tout depuis zéro. Open data d'abord (sans clé), API ensuite si la clé est présente.
import { $ } from "bun";
import { existsSync } from "node:fs";
import { ROOT } from "./lib/config";
const OD = ROOT + "data/raw/opendata/";
const B = "https://data.assemblee-nationale.fr/static/openData/repository/17";
const SOURCES: [string, string][] = [
  ["AMO10", `${B}/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip`],
  ["Agenda", `${B}/vp/reunions/Agenda.json.zip`],
  ["Scrutins", `${B}/loi/scrutins/Scrutins.json.zip`],
  ["Dossiers_Legislatifs", `${B}/loi/dossiers_legislatifs/Dossiers_Legislatifs.json.zip`],
  ["Amendements", `${B}/loi/amendements_div_legis/Amendements.json.zip`],
];
await $`mkdir -p ${OD}`;
const frais = process.argv.includes("--frais");
for (const [nom, url] of SOURCES) {
  const zip = OD + url.split("/").pop();
  if (frais || !existsSync(zip)) await $`curl -sS -L -o ${zip} ${url}`;
  if (frais || !existsSync(OD + nom)) await $`mkdir -p ${OD + nom} && unzip -q -o ${zip} -d ${OD + nom}`;
}
const hatvp = OD + "agora_repertoire_opendata.json";
if (frais || !existsSync(hatvp)) await $`curl -sS -L -o ${hatvp} https://www.hatvp.fr/agora/opendata/agora_repertoire_opendata.json`;
const dir = ROOT + "pipeline/collecte/";
for (const s of ["groupes-deputes", "scrutins-opendata", "amendements-opendata", "dossiers-opendata", "hatvp", "api"]) {
  console.log("==>", s); await $`bun ${dir + s + ".ts"}`;
}
