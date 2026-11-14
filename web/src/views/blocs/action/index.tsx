import { Meta, Panel } from "../../../components";
import { metaExemple } from "../../../lib/meta-exemple";

/** Bloc Action : composant vide, remplacé par la session propriétaire de ce dossier. */
export default function ActionBloc({ dossier }: { dossier: string }) {
  return (
    <Panel title="Action" className="bloc bloc-action" aside={dossier}>
      <div className="status">Bloc vide</div>
      <Meta meta={metaExemple} />
    </Panel>
  );
}
