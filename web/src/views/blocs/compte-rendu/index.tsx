import { Meta, Panel } from "../../../components";
import { metaExemple } from "../../../lib/meta-exemple";

/** Bloc Compte rendu : composant vide, remplacé par la session propriétaire de ce dossier. */
export default function CompteRenduBloc({ dossier }: { dossier: string }) {
  return (
    <Panel title="Compte rendu" className="bloc bloc-compte-rendu" aside={dossier}>
      <div className="status">Bloc vide</div>
      <Meta meta={metaExemple} />
    </Panel>
  );
}
