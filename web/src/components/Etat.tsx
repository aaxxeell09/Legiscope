import type { ReactNode } from "react";
import type { DataState } from "../lib/data";
import { Panel } from "./Panel";

/** Ligne « Chargement » discrète, jamais un écran blanc. */
export function Chargement({ quoi }: { quoi?: string }) {
  return (
    <div className="status" role="status" aria-live="polite">
      Chargement{quoi ? ` : ${quoi}` : ""}
    </div>
  );
}

/** Erreur lisible : le message nomme déjà le fichier (useData). */
export function Erreur({ message }: { message: string }) {
  return (
    <div className="status status-error" role="alert">
      {message}
    </div>
  );
}

/**
 * Enveloppe d'un bloc qui charge un fichier :
 *
 *   const r = useData<Verdict>("verdict", dossier);
 *   return <Etat titre="Verdict" state={r}>{(v) => <>…<Meta meta={v.meta} /></>}</Etat>;
 *
 * Pendant le chargement ou en erreur, rend le panneau avec l'état ; sinon appelle
 * `children(data)` dans le même panneau.
 */
export function Etat<T>({
  titre,
  state,
  aside,
  className,
  children,
}: {
  titre: ReactNode;
  state: DataState<T>;
  aside?: ReactNode;
  className?: string;
  children: (data: T) => ReactNode;
}) {
  return (
    <Panel title={titre} aside={aside} className={className}>
      {state.status === "loading" && <Chargement />}
      {state.status === "error" && <Erreur message={state.error ?? "Erreur inconnue"} />}
      {state.status === "ok" && state.data !== undefined && children(state.data)}
    </Panel>
  );
}
