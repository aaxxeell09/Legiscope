import { useState, type ReactNode } from "react";
import type { Note } from "@contracts/index";
import { Etat, Meta } from "../../../components";
import { useData } from "../../../lib/data";
import { Redaction } from "../../depute/commun";
import { chiffresAutorises, decouperChiffres } from "./chiffres";
import "../../depute/p7.css";
import "./note.css";

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
  const [edition, setEdition] = useState(false);
  const [texte, setTexte] = useState(n.texte);
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
    <div className="note-layout">
      <article className="note-document">
        <header className="note-document-head"><div><span>Note de situation</span><strong>{n.client}</strong></div><button type="button" className="note-edit" onClick={() => setEdition((v) => !v)}>{edition ? "Terminer" : "Ajuster localement"}</button></header>
        <p className="note-objectif">Objectif suivi · {principal.texte}</p>
        {edition ? <><textarea className="note-editor" value={texte} onChange={(e) => setTexte(e.target.value)} aria-label="Modifier localement le compte rendu" /><p className="note-local-hint">Modification locale uniquement — les données sources ne sont pas enregistrées.</p></> : <p className="p7-texte note-text">{texte === n.texte ? morceaux : texte}</p>}
      </article>
      <div className="p7-actions note-actions">
        <BoutonCopier note={n} texte={texte} />
        <Redaction mode={n.mode} verifie={n.verifie} modele={n.modele} date={n.meta.generated_at.slice(0, 10)} />
      </div>
      <Meta meta={n.meta} />
    </div>
  );
}

function BoutonCopier({ note, texte: corps }: { note: Note; texte: string }) {
  const [etat, setEtat] = useState<"" | "copié" | "copie impossible">("");
  const texte = [corps, "", "Sources :", ...note.sources.map((s, i) => `${i + 1}. ${s.label} : ${s.url}`)].join("\n");
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
        {etat === "copié" ? "Copié" : "Copier le compte rendu"}
      </button>
      {etat && (
        <span className="text-2" role="status">
          {etat}
        </span>
      )}
    </>
  );
}
