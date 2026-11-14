import { Meta, Panel } from "../../../components";
import { metaExemple } from "../../../lib/meta-exemple";

/** Bloc Verdict : composant vide, remplacé par la session propriétaire de ce dossier. */
export default function VerdictBloc({ dossier }: { dossier: string }) {
  return (
    <Panel title="Verdict" className="bloc bloc-verdict" aside={dossier}>
      <div className="status">Bloc vide</div>
      <Meta meta={metaExemple} />
    </Panel>
  );
}
