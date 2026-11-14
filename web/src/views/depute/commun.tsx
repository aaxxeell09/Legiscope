/**
 * Libellés et petits composants partagés par le bloc Action, le bloc Compte rendu
 * et la page Député (session P7). Rien ici n'est en dur côté données : tout vient
 * de deputes.json, groupes.json et des contrats.
 */
import type {
  Deputes,
  Fondement,
  Groupes,
  Lieu,
  Mode,
  PositionDecideur,
  RoleAudition,
  RoleDecideur,
  Sort,
  TypeOrganisation,
} from "@contracts/index";
import { GroupeTag } from "../../components";
import { useData } from "../../lib/data";
import { formatDate, formatNom } from "../../lib/format";

export const ROLE_DECIDEUR: Record<RoleDecideur, string> = {
  rapporteur: "Rapporteur",
  rapporteur_general: "Rapporteur général",
  rapporteur_avis: "Rapporteur pour avis",
  gouvernement: "Gouvernement",
  chef_de_file: "Chef de file",
  president_commission: "Président de la commission",
};

export const POSITION_DECIDEUR: Record<PositionDecideur, string> = {
  pour: "pour la mesure",
  contre: "contre la mesure",
  inconnue: "position inconnue",
};

export const FONDEMENT: Record<Fondement, string> = {
  vote: "a voté",
  depose: "a déposé",
  dit: "a dit",
};

export const LIEU: Record<Lieu, string> = {
  seance: "en séance",
  commission: "en commission",
};

// Les sorts ne se mélangent jamais (garde-fou du rendu final).
export const SORT: Record<Sort, string> = {
  en_attente: "en attente",
  adopte: "adopté",
  rejete: "rejeté",
  retire: "retiré",
  tombe: "tombé",
  non_examine: "non examiné",
  irrecevable: "irrecevable",
  non_soutenu: "non soutenu",
};

export const ROLE_AUDITION: Record<RoleAudition, string> = {
  rapporteur: "rapporteur",
  rapporteur_general: "rapporteur général",
  rapporteur_avis: "rapporteur pour avis",
  president: "président",
  membre: "membre",
};

export const TYPE_ORG: Record<TypeOrganisation, string> = {
  entreprise: "entreprise",
  federation: "fédération",
  cabinet: "cabinet",
  association: "association",
  administration: "administration",
  syndicat: "syndicat",
  autre: "autre",
};

export const GROUPE_ACTION = {
  actionnables: "Sur qui agir encore",
  allies: "Alliés à protéger",
  perdus: "Perdus",
} as const;
export type CleGroupeAction = keyof typeof GROUPE_ACTION;

export type Annuaire = {
  pret: boolean;
  nom: (pa: string | null | undefined) => string;
  depute: (pa: string | null | undefined) => Deputes["deputes"][number] | undefined;
  groupe: (po: string | null | undefined) => Groupes["groupes"][number] | undefined;
};

/** Députés et groupes indexés par identifiant (fichiers racine, mis en cache par useData). */
export function useAnnuaire(): Annuaire {
  const d = useData<Deputes>("deputes");
  const g = useData<Groupes>("groupes");
  const deps = new Map((d.data?.deputes ?? []).map((x) => [x.id, x]));
  const grps = new Map((g.data?.groupes ?? []).map((x) => [x.id, x]));
  return {
    pret: d.status !== "loading" && g.status !== "loading",
    depute: (pa) => (pa ? deps.get(pa) : undefined),
    groupe: (po) => (po ? grps.get(po) : undefined),
    nom: (pa) => {
      const x = pa ? deps.get(pa) : undefined;
      return x ? formatNom(x.prenom, x.nom) : (pa ?? "");
    },
  };
}

/** Tag du groupe à partir de son identifiant ; rien si le groupe est inconnu. */
export function Tag({ annuaire, groupeId }: { annuaire: Annuaire; groupeId: string | null | undefined }) {
  if (!groupeId) return null;
  const g = annuaire.groupe(groupeId);
  return <GroupeTag sigle={g?.sigle ?? groupeId} couleur={g?.couleur} title={g?.nom} />;
}

/** Indication éditoriale discrète, sans exposer modèle, date ni métadonnée technique. */
export function Redaction({ mode }: { mode: Mode; verifie: boolean; modele?: string | null; date?: string | null }) {
  return (
    <span className="p7-redaction">
      <span className="text-2">{mode === "gabarit" ? "Synthèse structurée" : "Analyse proposée"}</span>
    </span>
  );
}

/** « le 19 nov. 2025 en séance ». */
export function quandOu(date: string, lieu: Lieu): string {
  return `le ${formatDate(date)} ${LIEU[lieu]}`;
}
