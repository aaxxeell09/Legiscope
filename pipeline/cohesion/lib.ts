// Chargement partagé par pipeline/cohesion et pipeline/suite : config, groupes, scrutins open data.
import { existsSync, readdirSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const ROOT = join(import.meta.dir, "..", "..");
export const CACHE = join(import.meta.dir, ".cache");
export const SCRUTINS_URL = "https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip";

export function lireJson<T = any>(...candidats: string[]): { data: T; chemin: string } {
  for (const c of candidats) {
    const p = join(ROOT, c);
    if (existsSync(p)) return { data: JSON.parse(readFileSync(p, "utf8")), chemin: c };
  }
  throw new Error(`aucun fichier trouvé parmi ${candidats.join(", ")}`);
}

export function chargerConfig() {
  return lireJson("data/config.json", "contracts/fixtures/config.json");
}

export function chargerGroupes() {
  return lireJson<{ groupes: { id: string; sigle: string; nom: string }[] }>("data/groupes.json", "contracts/fixtures/groupes.json");
}

function run(cmd: string[]) {
  const r = Bun.spawnSync(cmd, { stdout: "inherit", stderr: "inherit" });
  if (r.exitCode !== 0) throw new Error(`échec : ${cmd.join(" ")}`);
}

// Dossier contenant les fichiers VTANR5L17V*.json. Ordre : zip de P1 dans data/raw/opendata, sinon cache local, sinon téléchargement.
export function dossierScrutins(): string {
  const dir = join(CACHE, "scrutins", "json");
  if (existsSync(dir) && readdirSync(dir).length > 0) return dir;
  mkdirSync(CACHE, { recursive: true });
  const zipP1 = join(ROOT, "data/raw/opendata/Scrutins.json.zip");
  const zip = existsSync(zipP1) ? zipP1 : join(CACHE, "Scrutins.json.zip");
  if (!existsSync(zip)) run(["curl", "-sSfL", "-o", zip, SCRUTINS_URL]);
  run(["unzip", "-q", "-o", zip, "-d", join(CACHE, "scrutins")]);
  return dir;
}

export type VoixGroupe = { organe: string; pour: number; contre: number; abstention: number; membres: number };
export type ScrutinOD = {
  uid: string; numero: number; date: string; type: string; sort: string; titre: string;
  pour: number; contre: number; groupes: VoixGroupe[];
};

const n = (x: unknown) => Number(x ?? 0) || 0;

export function chargerScrutins(): ScrutinOD[] {
  const dir = dossierScrutins();
  const out: ScrutinOD[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const s = JSON.parse(readFileSync(join(dir, f), "utf8")).scrutin;
    let gs = s.ventilationVotes?.organe?.groupes?.groupe ?? [];
    if (!Array.isArray(gs)) gs = [gs];
    out.push({
      uid: s.uid, numero: n(s.numero), date: s.dateScrutin, type: s.typeVote?.codeTypeVote ?? "", sort: s.sort?.code ?? "",
      titre: s.titre ?? "", pour: n(s.syntheseVote?.decompte?.pour), contre: n(s.syntheseVote?.decompte?.contre),
      groupes: gs.map((g: any) => ({
        organe: g.organeRef, membres: n(g.nombreMembresGroupe),
        pour: n(g.vote?.decompteVoix?.pour), contre: n(g.vote?.decompteVoix?.contre), abstention: n(g.vote?.decompteVoix?.abstentions),
      })),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.numero - b.numero);
}

export const urlScrutin = (numero: number) => `https://www.assemblee-nationale.fr/dyn/17/scrutins/${numero}`;

// Position majoritaire : la plus fréquente parmi les votants (pour, contre, abstention) ; null si moins de 5 votants ou égalité en tête.
export function positionMajoritaire(v: { pour: number; contre: number; abstention: number }): "pour" | "contre" | "abstention" | null {
  const total = v.pour + v.contre + v.abstention;
  if (total < 5) return null;
  const tri = (Object.entries({ pour: v.pour, contre: v.contre, abstention: v.abstention }) as [any, number][]).sort((a, b) => b[1] - a[1]);
  if (tri[0][1] === tri[1][1]) return null;
  return tri[0][0];
}

// Rattache les identifiants historiques d'un groupe à l'identifiant présent dans groupes.json (UDR : PO847173 jusqu'en juillet 2025, PO872880 ensuite).
export function aliasGroupes(groupes: { id: string; sigle: string }[]): Record<string, string> {
  const ids = new Set(groupes.map((g) => g.id));
  const alias: Record<string, string> = {};
  const udr = groupes.find((g) => g.sigle.toUpperCase().includes("UDR"));
  if (udr && !ids.has("PO847173")) alias["PO847173"] = udr.id;
  return alias;
}
