import { useState, type ReactNode } from "react";
import type { Note } from "@contracts/index";
import { Etat, Meta } from "../../../components";
import { useData } from "../../../lib/data";
import { Redaction } from "../../depute/commun";
import { chiffresAutorises, decouperChiffres } from "./chiffres";
import "../../depute/p7.css";

/** Bloc 5, Compte rendu : quelques lignes à reprendre pour le client. */
export default function CompteRenduBloc({ dossier }: { dossier: string }) {
  const r = useData<Note>("note", dossier);
  return (
    <Etat titre="Compte rendu" state={r} className="bloc bloc-compte-rendu">
      {(n) => <CompteRenduContenu n={n} />}
    </Etat>
  );
}

function CompteRenduContenu({ n }: { n: Note }) {
  const principal = n.objectifs.find((o) => o.rang === 1) ?? n.objectifs[0];
  const autorises = chiffresAutorises(n.chiffres_utilises);
  const morceaux: ReactNode[] = decouperChiffres(n.texte).map((m, i) =>
    m.chiffre && m.valeur !== null && autorises(m.valeur) ? (
      <span key={i} className="p7-chiffre" data-chiffre>
        {m.texte}
      </span>
    ) : (
      <span key={i}>{m.texte}</span>
    ),
  );

  return (
    <>
      <p className="p7-rappel">
        {n.client} · {principal.texte}
      </p>
      <p className="p7-texte">{morceaux}</p>
      {n.sources.length > 0 && (
        <ol className="p7-sources">
          {n.sources.map((s, i) => (
            <li key={`${s.url}-${i}`}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      )}
      {n.limites && <p className="p7-limites">{n.limites}</p>}
      <div className="p7-actions">
        <BoutonCopier note={n} />
        <Redaction mode={n.mode} verifie={n.verifie} modele={n.modele} date={n.meta.generated_at.slice(0, 10)} />
      </div>
      <Meta meta={n.meta} />
    </>
  );
}

function BoutonCopier({ note }: { note: Note }) {
  const [etat, setEtat] = useState<"" | "copié" | "copie impossible">("");
  const texte = [note.texte, "", "Sources :", ...note.sources.map((s, i) => `${i + 1}. ${s.label} : ${s.url}`)].join("\n");
  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setEtat("copié");
    } catch {
      setEtat("copie impossible");
    }
    window.setTimeout(() => setEtat(""), 2000);
  }
  return (
    <>
      <button type="button" className="p7-btn" onClick={copier}>
        Copier
      </button>
      {etat && (
        <span className="text-2" role="status">
          {etat}
        </span>
      )}
    </>
  );
}
