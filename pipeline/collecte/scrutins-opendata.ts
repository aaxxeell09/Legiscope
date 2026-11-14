// Livrable 3 (repli open data) : un fichier par scrutin depuis le 1er juillet 2024, votes nominatifs + résultat par groupe.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { ROOT } from "./lib/config";
const DIR = ROOT + "data/raw/opendata/Scrutins/json/";
const OUT = ROOT + "data/raw/scrutins/"; mkdirSync(OUT, { recursive: true });
const arr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const N = (x: any) => Number(x ?? 0);
let n = 0, nv = 0;
const index: any[] = [];
for (const f of readdirSync(DIR)) {
  const s = JSON.parse(readFileSync(DIR + f, "utf8")).scrutin;
  if (s.dateScrutin < "2024-07-01") continue;
  const votes: any[] = []; const groupes: any[] = [];
  for (const g of arr(s.ventilationVotes?.organe?.groupes?.groupe)) {
    const v = g.vote; const d = v.decompteVoix;
    groupes.push({ groupe_id: g.organeRef, membres: N(g.nombreMembresGroupe), position_majoritaire: v.positionMajoritaire, pour: N(d.pour), contre: N(d.contre), abstention: N(d.abstentions), non_votants: N(d.nonVotants) + N(d.nonVotantsVolontaires) });
    const dn = v.decompteNominatif ?? {};
    for (const [cle, pos] of [["pours", "pour"], ["contres", "contre"], ["abstentions", "abstention"], ["nonVotants", "non_votant"]] as const)
      for (const x of arr(dn[cle]?.votant)) votes.push({ acteur: x.acteurRef, groupe: g.organeRef, position: pos, par_delegation: x.parDelegation === "true", cause: x.causePositionVote ?? null });
  }
  const sv = s.syntheseVote; const d = sv.decompte;
  const sortie = {
    source: "opendata", url: `https://www.assemblee-nationale.fr/dyn/17/scrutins/${s.numero}`,
    id: s.uid, numero: Number(s.numero), date: s.dateScrutin, type: s.typeVote?.codeTypeVote ?? null, titre: s.titre, objet: s.objet?.libelle ?? null,
    dossier_ref: s.objet?.dossierLegislatif?.dossierRef ?? null, resultat: s.sort?.code ?? null,
    decompte: { pour: N(d.pour), contre: N(d.contre), abstention: N(d.abstentions), non_votants: N(d.nonVotants) + N(d.nonVotantsVolontaires) },
    resultat_groupes: groupes, votes, brut: s,
  };
  writeFileSync(OUT + s.uid + ".json", JSON.stringify(sortie));
  index.push({ id: s.uid, numero: Number(s.numero), date: s.dateScrutin, titre: s.titre, resultat: sortie.resultat, dossier_ref: sortie.dossier_ref, n_votes: votes.length });
  n++; nv += votes.length;
}
index.sort((a, b) => a.numero - b.numero);
writeFileSync(OUT + "_index.json", JSON.stringify(index));
console.log(n, "scrutins", nv, "votes nominatifs", index[0]?.date, "→", index.at(-1)?.date);
