import { Meta, Panel } from "../../../components";
import { metaExemple } from "../../../lib/meta-exemple";

/** Bloc Suite : composant vide, remplacé par la session propriétaire de ce dossier. */
export default function SuiteBloc({ dossier }: { dossier: string }) {
  return (
    <Panel title="Suite" className="bloc bloc-suite" aside={dossier}>
      <div className="status">Bloc vide</div>
      <Meta meta={metaExemple} />
    </Panel>
  );
}
