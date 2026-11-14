// A1 : organisations entendues par député, par dossier.
//   bun run auditions                       lit data/ (ou contracts/fixtures si data/config.json manque), écrit data/<dossier>/auditions/
//   bun run auditions --root contracts/fixtures --out /tmp/x --dossier petits-colis
// Rejouable : tout est régénéré depuis la liste de députés courante (groupes-action.json, sinon pivots.json).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AuditionsSchema,
  ConfigSchema,
  DeputesSchema,
  HatvpSchema,
  PivotsSchema,
  type Audition,
  type Auditions,
  type Config,
  type RoleAudition,
} from "../../contracts";
import { ARCHIVE_URL, rapportsDuTexte, telechargerArchive, type RapportFeuille } from "./lib/opendata";
import { lireHtml, sectionsAuditions } from "./lib/rapports";
import { extraireHeuristique, extraireParModele, type OrganisationExtraite } from "./lib/organisations";
import { MODELE, modeleDisponible } from "./lib/llm";

const args = process.argv.slice(2);
const opt = (nom: string): string | undefined => {
  const i = args.indexOf(`--${nom}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const ROOT = opt("root") ?? (existsSync("data/config.json") ? "data" : "contracts/fixtures");
const OUT = opt("out") ?? "data";
const SEUL = opt("dossier");
const CONCURRENCE = Number(opt("concurrence") ?? 4);

const lire = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8"));
const maintenant = () => {
  const d = new Date();
  const tz = -d.getTimezoneOffset();
  const s = (n: number) => String(Math.abs(n)).padStart(2, "0");
  return `${d.getFullYear()}-${s(d.getMonth() + 1)}-${s(d.getDate())}T${s(d.getHours())}:${s(d.getMinutes())}:${s(d.getSeconds())}${tz >= 0 ? "+" : "-"}${s(Math.floor(Math.abs(tz) / 60))}:${s(Math.abs(tz) % 60)}`;
};
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Députés à traiter : groupes-action.json (définitif), sinon pivots.json (provisoire). */
function deputesDuDossier(dossierId: string): { ids: string[]; source: string } {
  const ga = join(ROOT, dossierId, "groupes-action.json");
  if (existsSync(ga)) {
    const g: any = lire(ga);
    const ids = new Set<string>();
    for (const k of ["actionnables", "allies", "perdus"]) for (const d of g[k] ?? []) if (d?.depute_id) ids.add(d.depute_id);
    if (ids.size) return { ids: [...ids], source: ga };
  }
  const pv = join(ROOT, dossierId, "pivots.json");
  if (existsSync(pv)) {
    const p = PivotsSchema.parse(lire(pv));
    return { ids: p.deputes.map((d) => d.id), source: pv };
  }
  throw new Error(`${dossierId} : ni groupes-action.json ni pivots.json dans ${ROOT}`);
}

function roleDe(qualite: string): RoleAudition {
  if (/general/.test(sansAccents(qualite))) return "rapporteur_general";
  if (/avis/.test(sansAccents(qualite))) return "rapporteur_avis";
  if (/president/.test(sansAccents(qualite))) return "president";
  return "rapporteur";
}

interface RapportLu {
  feuille: RapportFeuille;
  date: string;
  organisations: OrganisationExtraite[] | null; // null = pas de liste
  methode: "modele" | "heuristique" | null;
}

async function lireRapport(feuille: RapportFeuille): Promise<RapportLu | null> {
  const html = await lireHtml(feuille.uid);
  if (html === null) return null; // pas en ligne
  const sections = sectionsAuditions(html);
  const date = feuille.date_publication_web ?? feuille.date_depot ?? "";
  if (sections.length === 0) return { feuille, date, organisations: null, methode: null };
  let organisations = await extraireParModele(sections);
  let methode: RapportLu["methode"] = "modele";
  if (!organisations || organisations.length === 0) {
    organisations = extraireHeuristique(sections);
    methode = "heuristique";
  }
  return { feuille, date, organisations: organisations.length ? organisations : null, methode: organisations.length ? methode : null };
}

async function enParallele<T, R>(items: T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await f(items[k]);
      }
    }),
  );
  return out;
}

async function main() {
  const config: Config = ConfigSchema.parse(lire(join(ROOT, "config.json")));
  const deputes = DeputesSchema.parse(lire(join(ROOT, "deputes.json"))).deputes;
  const parId = new Map(deputes.map((d) => [d.id, d]));
  await telechargerArchive();
  const bilan: string[] = [];

  for (const dossier of config.dossiers) {
    if (SEUL && dossier.id !== SEUL) continue;
    const ref = dossier.date_reference;
    console.log(`\n== ${dossier.id} (${dossier.texte_id}${ref ? `, rejoué au ${ref}` : ""})`);
    const { feuilles, titre } = rapportsDuTexte(dossier.texte_id);
    const enLigne = feuilles.filter((f) => f.date_publication_web !== null);
    const avantRef = enLigne.filter((f) => !ref || (f.date_publication_web as string) <= ref);
    console.log(`${feuilles.length} feuilles de rapport dans l'archive, ${enLigne.length} publiées en ligne, ${avantRef.length} à la date de référence`);

    const lus = (await enParallele(avantRef, CONCURRENCE, lireRapport)).filter((r): r is RapportLu => r !== null);
    const avecListe = lus.filter((r) => r.organisations);
    console.log(`${lus.length} pages lues, ${avecListe.length} avec une liste de personnes entendues (${avecListe.filter((r) => r.methode === "modele").length} par modèle, ${avecListe.filter((r) => r.methode === "heuristique").length} par heuristique)`);
    for (const r of lus) console.log(`  ${r.organisations ? "liste" : "  -  "} ${r.feuille.uid} ${r.date} ${r.feuille.titre.slice(0, 60)}${r.organisations ? ` : ${r.organisations.length} org.` : ""}`);

    // HATVP : identifiants par nom quand le fichier du dossier existe.
    const hatvpPath = join(ROOT, dossier.id, "hatvp.json");
    const hatvp = existsSync(hatvpPath) ? HatvpSchema.parse(lire(hatvpPath)).organisations : [];
    const hatvpId = (nom: string): string | null => {
      const n = sansAccents(nom);
      const sigle = nom.match(/\(([^)]+)\)\s*$/)?.[1];
      for (const o of hatvp) {
        const h = sansAccents(o.nom);
        if (h === n || (h.length > 5 && n.includes(h)) || (n.length > 5 && h.includes(n))) return o.hatvp_id;
        if (sigle && sansAccents(sigle).length > 2 && h.includes(sansAccents(sigle))) return o.hatvp_id;
      }
      return null;
    };

    const { ids, source } = deputesDuDossier(dossier.id);
    const outDir = join(OUT, dossier.id, "auditions");
    mkdirSync(outDir, { recursive: true });
    let avecRapport = 0;
    let avecAudition = 0;
    for (const id of ids) {
      const d = parId.get(id);
      if (!d) {
        console.warn(`  ${id} absent de deputes.json, ignoré`);
        continue;
      }
      const auditions: Audition[] = [];
      let total = 0;
      for (const r of lus) {
        const rapp = r.feuille.rapporteurs.find((x) => x.acteurRef === id);
        const membre = r.feuille.organe !== null && d.commissions.includes(r.feuille.organe);
        if (!rapp && !membre) continue;
        total++;
        if (!r.organisations) continue;
        auditions.push({
          texte_id: dossier.texte_id,
          rapport_url: r.feuille.url,
          date: r.date,
          role: rapp ? roleDe(rapp.qualite) : "membre",
          organisations: r.organisations.map((o) => ({ nom: o.nom, type: o.type, hatvp_id: hatvpId(o.nom) })),
        });
      }
      auditions.sort((a, b) => a.date.localeCompare(b.date) || (a.rapport_url ?? "").localeCompare(b.rapport_url ?? ""));
      if (total) avecRapport++;
      if (auditions.length) avecAudition++;
      const limites = [
        total === 0
          ? "Aucun rapport de ce texte rattaché à ce député (ni rapporteur, ni membre d'une commission qui a produit un rapport)."
          : `${total} rapport(s) rattaché(s) (rapporteur ou membre de la commission), ${auditions.length} avec une liste de personnes entendues ; le rôle « membre » signifie que la commission du député a produit le rapport, pas que le député a assisté à l'audition.`,
        `Listes lues dans les pages HTML des rapports (${modeleDisponible() ? `extraction par le modèle ${MODELE}, repli heuristique` : "extraction heuristique : gras = organisation, M./Mme = personne ; clé Featherless absente"}) ; types d'organisation déduits du nom, « autre » quand le nom ne suffit pas.`,
        `${feuilles.length - enLigne.length} feuille(s) de rapport sans page en ligne ignorée(s)`,
        ref ? `Rien de postérieur au ${ref} (${enLigne.length - avantRef.length} rapport(s) publié(s) après cette date ignoré(s)).` : "",
        hatvp.length ? "Identifiants HATVP rapprochés par nom avec hatvp.json." : "Identifiants HATVP non rapprochés (hatvp.json absent).",
      ]
        .filter(Boolean)
        .join(" ");
      const fichier: Auditions = {
        meta: {
          generated_at: maintenant(),
          sources: [
            { label: "Open data Assemblée nationale, dossiers législatifs", url: ARCHIVE_URL },
            ...(auditions.length ? [{ label: `Rapports sur le ${titre}`, url: auditions[0].rapport_url as string }] : []),
          ],
          limits: limites,
          producer: "pipeline/auditions",
          dossier_id: dossier.id,
        },
        depute_id: id,
        auditions,
        couverture: { rapports_total: total, rapports_avec_liste: auditions.length },
      };
      const valide = AuditionsSchema.safeParse(fichier);
      if (!valide.success) throw new Error(`${id} : ${JSON.stringify(valide.error.issues[0])}`);
      writeFileSync(join(outDir, `${id}.json`), JSON.stringify(fichier, null, 2) + "\n");
    }
    const ligne = `${dossier.id} : ${ids.length} députés (${source}), ${avecRapport} avec au moins un rapport rattaché, ${avecAudition} avec au moins une liste d'organisations ; ${avecListe.length}/${lus.length} rapports en ligne avec liste`;
    console.log(ligne);
    bilan.push(ligne);
  }
  console.log(`\n${bilan.join("\n")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
