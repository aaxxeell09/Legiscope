import { Meta, Panel } from "../../../components";
import { metaExemple } from "../../../lib/meta-exemple";

/** Bloc Nouveautés : composant vide, remplacé par la session propriétaire de ce dossier. */
export default function NouveautesBloc({ dossier }: { dossier: string }) {
  return (
    <Panel title="Nouveautés" className="bloc bloc-nouveautes" aside={dossier}>
      <div className="status">Bloc vide</div>
      <Meta meta={metaExemple} />
    </Panel>
  );
}
