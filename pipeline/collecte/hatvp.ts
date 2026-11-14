// Livrable 6 (repli open data HATVP) : organisations ayant déclaré une action sur le sujet du dossier.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { ROOT, lireConfig, filtreMotsCles, nowIso, sansAccents } from "./lib/config";
const SRC = { label: "Répertoire des représentants d'intérêts, HATVP (open data)", url: "https://www.hatvp.fr/agora/opendata/agora_repertoire_opendata.json" };
const d = JSON.parse(readFileSync(ROOT + "data/raw/opendata/agora_repertoire_opendata.json", "utf8"));
const typeDe = (c: any): string => {
  const l = sansAccents(c.label);
  if (c.categorie === "ENTREPRISE" || c.categorie === "SOCIETE") return "entreprise";
  if (/federation|organisation professionnelle|organisation syndicale et professionnelle|chambre/.test(l)) return "federation";
  if (/syndic/.test(l)) return "syndicat";
  if (/cabinet|consultant|avocat|travailleur/.test(l)) return "cabinet";
  if (/association|fondation/.test(l)) return "association";
  if (/etablissement public/.test(l)) return "administration";
  return "autre";
};
const actionCourte = (s: string) => {
  const l = sansAccents(s);
  if (/discussions informelles|tete-a-tete|reunion/.test(l)) return "rencontre";
  if (/correspondance/.test(l)) return "correspondance";
  if (/suggestions|redaction/.test(l)) return "envoi de propositions de rédaction";
  if (/informations, expertises/.test(l)) return "transmission d'expertise";
  if (/debats publics|campagne|communication|petition/.test(l)) return "campagne publique";
  if (/consultations|auditions/.test(l)) return "réponse à consultation ou audition";
  return s;
};
const cfg = lireConfig(); const resume: any = {}; const brut: any = {};
for (const dos of cfg.dossiers) {
  const garde = filtreMotsCles(dos.sujet.mots_cles);
  // Fenêtre : exercices 2024 à 2026 (les activités d'un exercice sont publiées jusqu'à trois mois après sa clôture).
  const orgs: any[] = [];
  for (const p of d.publications) {
    const hits: any[] = [];
    for (const e of p.exercices ?? []) {
      const pc = e.publicationCourante; if (!pc || !/202[4-6]$/.test(pc.dateDebut ?? "")) continue;
      for (const a of pc.activites ?? []) {
        const x = a.publicationCourante; const obs = (x.actionsRepresentationInteret ?? []).map((r: any) => r.observation ?? "").join(" ");
        if (!garde(`${x.objet} ${obs}`)) continue;
        // Il faut viser le Parlement ou une loi (pas seulement un décret).
        const ari = x.actionsRepresentationInteret ?? [];
        const parlement = ari.some((r: any) => (r.reponsablesPublics ?? []).some((rp: string) => /Député|sénateur/i.test(rp)) || (r.decisionsConcernees ?? []).some((dc: string) => /Lois/.test(dc)));
        if (!parlement) continue;
        hits.push({ exercice: pc.dateDebut.slice(-4), fiche: x.identifiantFiche, objet: x.objet, publication: x.publicationDate, observation: obs || null,
          actions: [...new Set(ari.flatMap((r: any) => r.actionsMenees ?? []))], responsables: [...new Set(ari.flatMap((r: any) => r.reponsablesPublics ?? []))] });
      }
    }
    if (!hits.length) continue;
    hits.sort((a, b) => b.exercice.localeCompare(a.exercice));
    orgs.push({ hatvp_id: p.identifiantNational, nom: p.denomination, type: typeDe(p.categorieOrganisation),
      fiche_url: `https://www.hatvp.fr/fiche-organisation/?organisation=${p.identifiantNational}`,
      objet: hits[0].objet.slice(0, 400), actions: [...new Set(hits.flatMap((h) => h.actions.map(actionCourte)))], _n: hits.length, _hits: hits });
  }
  orgs.sort((a, b) => b._n - a._n || a.nom.localeCompare(b.nom));
  brut[dos.id] = orgs;
  const lettres = (x: string) => sansAccents(x).replace(/[^a-z]/g, "");
  // Afep est déclarée sous « ASSO FRANCAI ENTREPRIS PRIVEES » (SIREN 326943016).
  const client = orgs.find((o) => lettres(o.nom).includes(lettres(dos.client)) || lettres(dos.client).includes(lettres(o.nom)) || (lettres(dos.client) === "afep" && o.hatvp_id === "326943016"));
  mkdirSync(ROOT + `data/raw/${dos.id}`, { recursive: true });
  writeFileSync(ROOT + `data/raw/${dos.id}/hatvp.json`, JSON.stringify({ source: "opendata", generated_at: nowIso(), mots_cles: dos.sujet.mots_cles, organisations: orgs }, null, 1));
  mkdirSync(ROOT + `data/${dos.id}`, { recursive: true });
  writeFileSync(ROOT + `data/${dos.id}/hatvp.json`, JSON.stringify({
    meta: { generated_at: nowIso(), sources: [SRC], producer: "pipeline/collecte", dossier_id: dos.id,
      limits: `Fiches d'activité HATVP des exercices 2024 à 2026 dont l'objet ou l'observation contient un mot-clé du sujet (${dos.sujet.mots_cles.join(", ")}) et qui visent le Parlement ou une loi. Les activités de l'exercice en cours ne sont publiées qu'après sa clôture : les actions de l'automne 2026 n'y sont pas encore. Une fiche peut viser un autre texte que ${dos.texte_id} sur le même sujet. Faux positifs possibles sur des mots-clés courts. Source open data HATVP, pas l'API Hémicycle.` },
    organisations: orgs.map(({ _n, _hits, ...o }) => o) }, null, 2));
  resume[dos.id] = { organisations: orgs.length, client: dos.client, client_trouve: client ? `${client.nom} (${client._n} fiches)` : null, top: orgs.slice(0, 8).map((o) => `${o.nom} (${o._n})`) };
}
console.log(JSON.stringify(resume, null, 1));
