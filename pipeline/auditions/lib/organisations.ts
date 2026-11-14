// Des lignes d'une annexe « personnes entendues » aux organisations typées.
// Deux voies : extraction par modèle (Featherless, `appelStructure`) quand la clé est
// là, sinon lecture heuristique des mêmes lignes (gras = organisation, « M. / Mme » = personne).
import { z } from "zod";
import { TypeOrganisationSchema, type TypeOrganisation } from "../../../contracts";
import type { Ligne, SectionAuditions } from "./rapports";
import { appelStructure, modeleDisponible } from "./llm";

export interface OrganisationExtraite {
  nom: string;
  type: TypeOrganisation;
  personnes: { personne: string; fonction: string | null }[];
}

const nettoyer = (s: string) => s.replace(/[\u00a0\u2007\u202f]/g, " ").replace(/[\uE000-\uF8FF]/g, " ").replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();
const PUCE = /^[\s\u2013\u2014\u2011\-•·*\u2022\u2023\u2043\u25A0-\u25FF\u2192\u27A2►▪➢✓§]+/;
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Lignes qui ne sont ni une organisation ni une personne.
const GENERIQUE =
  /^(table[s]? ronde[s]?|audition[s]?( commune[s]?)?|contribution[s]? ecrite[s]?|deplacement[s]?|dans le cadre|lors d|a l'occasion|visite|reunion|entretien|echange|le \d|les \d|du \d|au \d|dans le cadre|lors d|a l'occasion|visite|reunion|entretien|echange|le \d|les \d|du \d|au \d|par ordre (chronologique|alphabetique)|\(par ordre|liste des|personnes? (entendue|auditionne|rencontre)|le rapporteur|la rapporteure|les rapporteurs|ces representants|\*|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|\d{1,2}(er)? (janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)|a paris|en visioconference|visioconference|[\d/ .-]+$)/;

const PERSONNE = /^(m\.|mm\.|mme|mmes|mlle|dr|pr|me|mr|monsieur|madame|messieurs|mesdames|general|amiral|colonel|professeur|docteur|maitre)(?=\s|$)/;

function nettoyerNom(s: string): string {
  return nettoyer(
    s
      .replace(PUCE, "")
      .replace(/[\s–—‑\-:;,.*]+$/, "")
      .replace(/\s*\(\s*\d+\s*\)\s*$/, "")
      .replace(/\s*\*+\s*$/, ""),
  );
}

/** Coupe « Organisation – M. X, fonction » en tête et reste. */
function couper(texte: string): { tete: string; reste: string } {
  const t = texte.replace(PUCE, "");
  const m = t.match(/^(.*?)(?:\s+[–—‑-]\s+|\s*:\s*|\s+[–—‑-]\s*(?=(M\.|Mme|MM\.|Mmes)\b))(.*)$/);
  if (!m) return { tete: t, reste: "" };
  return { tete: m[1], reste: m[3] ?? "" };
}

function personnesDe(reste: string): OrganisationExtraite["personnes"] {
  const out: OrganisationExtraite["personnes"] = [];
  for (const morceau of reste.split(/\s*(?:;|\bet\b(?=\s+(?:M\.|Mme|MM\.|Mmes)))\s*/)) {
    const m = morceau.match(/^\s*(?:M\.|Mme|MM\.|Mmes|Mlle|Dr|Pr|Me)\s+([^,]+)(?:,\s*(.+))?/);
    if (m) out.push({ personne: nettoyer(m[1]), fonction: m[2] ? nettoyerNom(m[2]) : null });
  }
  return out;
}

/** Lecture heuristique : une organisation par ligne en gras ou avant le séparateur ; les personnes suivent. */
export function extraireHeuristique(sections: SectionAuditions[]): OrganisationExtraite[] {
  const orgs = new Map<string, OrganisationExtraite>();
  let courante: OrganisationExtraite | null = null;
  const ajouter = (nom: string, personnes: OrganisationExtraite["personnes"]) => {
    const cle = sansAccents(nom);
    let o = orgs.get(cle);
    if (!o) {
      o = { nom, type: typerOrganisation(nom), personnes: [] };
      orgs.set(cle, o);
    }
    o.personnes.push(...personnes);
    courante = o;
  };
  for (const s of sections) {
    for (const l of s.lignes) {
      const texte = nettoyer(l.texte);
      const brut = texte.replace(PUCE, "");
      const bas = sansAccents(brut);
      if (!brut || brut.length < 3) continue;
      // Contribution écrite de X.
      const contrib = bas.match(/contributions? ecrites? (?:de la |du |des |de l'|d'|de )(.+)/);
      if (contrib) {
        const nom = nettoyerNom(brut.slice(brut.length - contrib[1].length));
        if (nom.length > 2 && !PERSONNE.test(sansAccents(nom))) ajouter(nom, []);
        continue;
      }
      if (GENERIQUE.test(bas)) continue;
      if (PERSONNE.test(bas)) {
        if (courante) courante.personnes.push(...personnesDe(brut));
        continue;
      }
      const { tete, reste } = couper(brut);
      const nom = nettoyerNom(l.gras && !PERSONNE.test(sansAccents(l.gras)) && l.gras.length <= tete.length + 5 && tete.startsWith(l.gras.slice(0, 8)) ? couper(l.gras).tete : tete);
      if (nom.length < 3 || nom.length > 180) continue;
      if (PERSONNE.test(sansAccents(nom))) continue;
      if (l.italique && !l.gras && !reste) continue; // sous-titre en italique (« Table ronde des syndicats »)
      if (!/[A-Za-zÀ-ÿ]{3}/.test(nom)) continue;
      if (nom.split(" ").length > 16) continue; // phrase, pas un nom d'organisation
      ajouter(nom, personnesDe(reste));
    }
  }
  return [...orgs.values()];
}

const REGLES: [RegExp, TypeOrganisation][] = [
  // Organisations patronales ou professionnelles nommées « syndicat » : des fédérations, pas des syndicats de salariés.
  [/\b(syndicat|chambre syndicale|union)( national| nationale| professionnel| professionnelle| general| generale| francais| francaise| interprofessionnel| interprofessionnelle)?( des| de la| de l'| du| d')\s*(entreprises|industries?|industriels|producteurs|editeurs|exploitants|fabricants|constructeurs|importateurs|professionnels|independants|employeurs|commerces?|commercants|artisans|agences|cabinets|societes|cinemas|labels|presse|medias|eaux|energies|marques|distributeurs|transporteurs|loueurs|armateurs|courtiers|banques|assureurs|promoteurs|architectes|pharmaciens|medecins|avocats|notaires|huissiers|biologistes|dentistes|veterinaires|infirmiers|kinesitherapeutes|pecheurs|viticulteurs|brasseurs|boulangers|bouchers|hoteliers|restaurateurs|cafetiers|bijoutiers|opticiens|libraires|disquaires|radios|television|edition|auteurs|compositeurs|realisateurs|photographes|musiciens|artistes)\b/, "federation"],
  [/\b(syndeac|snep|sacem|sacd|scam|adami|spedidam|spiil|apig|sepm|sne\b|snjv|sell\b|sfib|snitem|leem|gemme|afipa|febea|fcd|fevad|procos|unibail)\b/, "federation"],
  [/\b(cgt|cfdt|cftc|cfe-cgc|cfe cgc|unsa|fsu|solidaires|sud\b|force ouvriere|\bfo\b|fgf-fo|snes|snuipp|sgen|federation syndicale|intersyndicale|union syndicale|unef|fage|snj\b|snpl|cnt\b|snesup|sncs|ferc|snptes|sud recherche|snu|snop|snpa|snm\b|snmsu|snpha|smps|cfdt-|cgt-|fo-|unsa-|snep-)\b/, "syndicat"],
  [/\b(cabinet|avocats?|law\b|conseil juridique|notaires?|experts?-comptables?|commissaires? aux comptes|consulting|lobbying|affaires publiques|public affairs|conseil en|associes|llp|avocat)\b/, "cabinet"],
  [/\b(ministere|ministre|direction|dg[a-z]{0,6}\b|secretariat general|secretariat d'etat|prefecture|prefet|agence( nationale| francaise| de l'etat| regionale| du| de la| des| pour)|autorite|haute? conseil|haute? commissa|haute autorite|conseil (d'etat|superieur|national|de l'immobilier|des prelevements|constitutionnel|economique|d'orientation|d'analyse)|cour des comptes|cour de cassation|cour d'appel|tribunal|inspection generale|insee|banque de france|caisse (nationale|des depots|generale|primaire|regionale|centrale|d'allocations)|commission europeenne|parlement europeen|tresor|douane|dgfip|urssaf|france travail|pole emploi|etablissement public|operateur|universite|cnrs|inserm|inrae|inria|cea\b|ademe|anses|arcom|arcep|acpr|cnil|cnam|cnaf|cnav|cnsa|acoss|ars\b|rectorat|academie|ambassade|gendarmerie|police nationale|armee|etat-major|service (central|national|des|du|de la|d')|office (national|francais)|institut (national|de recherche|francais|regional|universitaire|polytechnique)|ecole (nationale|superieure|normale|polytechnique|centrale|des mines|des ponts)|conservatoire|manufacture|musee|bibliotheque nationale|opera|theatre national|comedie-francaise|cite de|centre (national|hospitalier|de cooperation|des monuments)|delegation (interministerielle|generale)|mission (interministerielle|libération)|defenseur des droits|mutualite sociale agricole|msa\b|observatoire (national|francais|des)|cnes|onf\b|ofb\b|ifremer|meteo-france|igas|igf\b|igesr|igedd|igpn|chambre regionale|collectivite|region |departement |mairie|ville de|metropole|communaute (urbaine|d'agglomeration|de communes)|senat|assemblee nationale|conseil regional|conseil departemental|hopital|chu\b|ap-hp|has\b|efs\b|bpifrance|afd\b|expertise france|business france|atout france|france competences|anct|anah|anru|dinum|disp\b|onac|commissariat|secretariat|prefecture|ministere|gouvernement|elysee|matignon|cabinet du|unicancer|sncf reseau|voies navigables|grand port|rte\b|reseau de transport|enedis|grdf|cnrs|cirad|ird\b|ifpen|brgm|ineris|ifsttar|cstb|cerema|onisep|cned|canope|france universites|cpu\b|hceres|anr\b|cnous|crous|cnc\b|cnl\b|cnm\b|institut national du sport|insep|afld|agence du sport|grand palais|louvre|versailles|chambord|monuments nationaux|archives nationales|bnf\b|inp\b|ina\b|afp\b|agence france-presse|arte\b|france televisions|radio france|france medias monde|tv5)\b/, "administration"],
  [/\b(federation|confederation|union (nationale|des|francaise|professionnelle|patronale|interprofessionnelle|sociale|regionale|generale)|medef|cpme|u2p|afep|france invest|chambre (de commerce|des metiers|d'agriculture|nationale|syndicale)|cci\b|cma\b|fnsea|ordre (national|des)|conseil national (des barreaux|de l'ordre)|association francaise des (entreprises|banques|societes)|groupement (professionnel|des|d')|interprofession|organisation professionnelle|club des|cercle des|alliance|assemblee des (departements|communes|regions)|association des maires|maires de france|departements de france|regions de france|france urbaine|villes de france|intercommunalites|france assureurs|fbf\b|federation bancaire|afg\b|ania|coop de france|la cooperation agricole|fevad|alliance du commerce|procos|fcd\b|uimm|fnaim|unpi|snpi|unapl|fnmf|mutualite francaise|france industrie|france digitale|afdel|numeum|syntec|apel\b|peep\b|fcpe|unaf|familles de france|ligue de l'enseignement|comite national olympique|cnosf|federation francaise|ligue (nationale|professionnelle)|france hydrogene|france renouvelables|ser\b|ufe\b|afgnv|afpac|afpg|afhypac)\b/, "federation"],
  [/\b(association|fondation|ligue|collectif|ong\b|reseau|mouvement|comite|secours (catholique|populaire)|restos du coeur|croix-rouge|emmaus|atd quart monde|greenpeace|wwf|france nature environnement|fne\b|oxfam|amnesty|transparency|attac|think tank|institut (montaigne|des politiques publiques|terram|rousseau|thomas more|jean jaures|sapiens|de l'entreprise|economique)|terra nova|ifrap|anticor|sherpa|demeure historique|vieilles maisons|maisons paysannes|sites et monuments|reporters sans frontieres|apf\b|unapei|aides\b|medecins (du monde|sans frontieres)|cimade|ligue des droits|fnars|fas\b|uniopss|uriopss|coorace|samu social|armee du salut|petits freres|france benevolat|france generosites|amicale|club\b)\b/, "association"],
  [/\b(sa\b|sas\b|sarl|sasu|snc\b|scop\b|groupe|holding|banque|credit (agricole|mutuel|lyonnais|du nord)|bnp|societe generale|axa|allianz|generali|totalenergies|total\b|engie|edf\b|orange|sncf|ratp|air france|renault|stellantis|airbus|thales|safran|dassault|vinci|bouygues|eiffage|carrefour|leclerc|auchan|intermarche|systeme u|lidl|aldi|amazon|alibaba|aliexpress|shein|temu|wish|ebay|google|alphabet|meta\b|facebook|apple|microsoft|uber|la poste|chronopost|colissimo|dhl|fedex|ups\b|geodis|cma cgm|veolia|suez|saint-gobain|michelin|l'oreal|lvmh|kering|hermes|danone|nestle|pernod|sanofi|servier|capgemini|atos|sopra|accenture|deloitte|kpmg|ey\b|pwc|mazars|forvis|mckinsey|bcg\b|roland berger|wavestone|bpce|la banque postale|natixis|amundi|cnp\b|covea|maif|macif|matmut|groupama|ag2r|malakoff|klesia|swiss life|cie\b|compagnie|entreprise|industries?\b(?! (francaises?|du|de))|\bsociete\b|france sa|tf1|m6\b|canal\+|canal plus|bollore|vivendi|lagardere|hachette|editis|fnac|darty|decathlon|leroy merlin|ikea|cdiscount|veepee|vinted|leboncoin|mistral|doctolib|blablacar|back market|criteo|dassault systemes|ovh|scaleway|iliad|free\b|sfr|bouygues telecom|altice|eutelsat|arianespace|naval group|mbda|nexter|knds|disney|netflix|spotify|deezer|tiktok|bytedance|twitter|snap\b|pinterest|linkedin|salesforce|oracle|sap\b|ibm|nvidia|intel|samsung|huawei|xiaomi|sony|nintendo|ubisoft|warner|universal|paramount|studios?|company|corporation|inc\b|ltd|gmbh|plc\b|co\.|limited|international|partners|capital|invest|gestion|assurances?|mutuelle|prevoyance|retraite|banque|financ|immobili|promotion|construction|energie|petrol|gaz\b|electri|telecom|media|editions?|productions?|distribution|logistique|transport|aeroport|port de|autoroutes?|eau de|eaux de|france telecom|renault trucks|alstom|siemens|schneider|legrand|nexans|valeo|faurecia|plastic omnium|arkema|solvay|air liquide|vallourec|arcelormittal|eramet|imerys|orano|framatome|technip|vinci|colas|spie|fayat|nge\b|demathieu|bouygues|kaufman|nexity|icade|gecina|covivio|unibail|klepierre|altarea|mercialys|carmila|foncia|nexity|century 21|orpi|laforet|guy hoquet|seloger|bien'ici|pap\b|meilleurs agents)\b/, "entreprise"],
];

/** Type d'organisation par mots-clés (repli sans modèle). */
export function typerOrganisation(nom: string): TypeOrganisation {
  const bas = sansAccents(nom);
  for (const [re, type] of REGLES) if (re.test(bas)) return type;
  if (/\b(france|french)\b/.test(bas) && /^[A-Z][a-z]+ France$/.test(nom)) return "entreprise";
  return "autre";
}

// Voie modèle : même entrée (les lignes), sortie structurée validée par zod.
const SortieModele = z.object({
  organisations: z.array(
    z.object({
      nom: z.string().min(1),
      type: TypeOrganisationSchema,
      personne: z.string().nullable(),
      fonction: z.string().nullable(),
    }),
  ),
});

const SYSTEME = `Tu lis l'annexe « personnes entendues » d'un rapport parlementaire français.
Rends la liste des organisations entendues. Pour chaque ligne qui nomme une personne, donne l'organisation qu'elle représente, son nom et sa fonction.
Types possibles : entreprise (société privée), federation (organisation professionnelle, patronale ou interprofessionnelle, ordre, chambre), cabinet (avocats, conseil, affaires publiques), association (association, fondation, ONG, think tank), administration (ministère, direction, agence, autorité, établissement public, collectivité, juridiction, université), syndicat (syndicat de salariés), autre (personnalité qualifiée, chercheur sans organisation, inconnu).
Réponds uniquement en JSON : {"organisations":[{"nom":"...","type":"...","personne":"M. ... ou null","fonction":"... ou null"}]}. N'invente rien : chaque organisation doit apparaître dans le texte.`;

export async function extraireParModele(sections: SectionAuditions[]): Promise<OrganisationExtraite[] | null> {
  if (!modeleDisponible()) return null;
  const texte = sections.map((s) => `## ${s.titre}\n${s.lignes.map((l) => l.texte).join("\n")}`).join("\n\n");
  const sortie = await appelStructure(SortieModele, SYSTEME, texte.slice(0, 60_000));
  if (!sortie) return null;
  const orgs = new Map<string, OrganisationExtraite>();
  const corpus = sansAccents(texte);
  for (const o of sortie.organisations) {
    const nom = nettoyerNom(o.nom);
    if (!nom) continue;
    // Garde-fou : le nom (ou son sigle) doit apparaître dans l'annexe.
    const sigle = nom.match(/\(([^)]+)\)\s*$/)?.[1];
    const base = nom.replace(/\s*\([^)]*\)\s*$/, "");
    if (!corpus.includes(sansAccents(base).slice(0, 25)) && !(sigle && corpus.includes(sansAccents(sigle)))) continue;
    const cle = sansAccents(nom);
    let x = orgs.get(cle);
    if (!x) {
      x = { nom, type: o.type, personnes: [] };
      orgs.set(cle, x);
    }
    if (o.personne) x.personnes.push({ personne: o.personne, fonction: o.fonction });
  }
  return [...orgs.values()];
}

export type { Ligne };
