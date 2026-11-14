import { useMemo, type ReactNode } from "react";
import type { Note } from "@contracts/index";
import { Etat, Meta } from "../../../components";
import { useDossier } from "../../../lib/config";
import { useData } from "../../../lib/data";
import { formatDate } from "../../../lib/format";
import { chiffresAutorises, decouperChiffres } from "./chiffres";
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
  const dossier = useDossier();
  const texteInitial = useMemo(() => nettoyerTexte(n.texte), [n.texte]);
  const autorises = chiffresAutorises(n.chiffres_utilises);
  const { essentiel, paragraphes } = structurerTexte(texteInitial);
  const titre = dossier.status === "ok" ? dossier.label : null;
  const dateReference = dossier.status === "ok" && dossier.dateReference ? formatDate(dossier.dateReference) : null;
  const metaNote = useMemo(() => ({ ...n.meta, sources: n.sources }), [n.meta, n.sources]);

  return (
    <div className="note-layout">
      <article className="note-document">
        <header className="note-document-head">
          <p className="note-eyebrow">Note de situation</p>
          <h3 className="note-title">{titre ? `${n.client} — ${titre}` : n.client}</h3>
          {dateReference && <p className="note-date">Date de référence : {dateReference}.</p>}
        </header>

        <div className="note-reading">
          <section className="note-essential" aria-labelledby="note-essentiel">
            <h4 id="note-essentiel">L’essentiel</h4>
            <p>{rendreChiffres(essentiel, autorises, "essentiel")}</p>
          </section>
          {paragraphes.length > 0 && (
            <section className="note-body" aria-label="Synthèse complète">
              {paragraphes.map((paragraphe, i) => <p key={i}>{rendreChiffres(paragraphe, autorises, `corps-${i}`)}</p>)}
            </section>
          )}
        </div>

        <div className="note-sources">
          <Meta meta={metaNote} />
        </div>
      </article>
    </div>
  );
}

/** Retire du brief les phrases techniques, sans modifier la donnée source. */
function nettoyerTexte(texte: string) {
  const sansLimites = texte.replace(/\s+Limites\s*:\s*.*$/is, "").trim();
  const phrases = sansLimites.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) ?? [sansLimites];
  const lisibles = phrases.map((phrase) => phrase.trim()).filter((phrase) => phrase && !/\b(?:Orcet|prédictions?)\b/i.test(phrase));
  return (lisibles.length > 0 ? lisibles.join(" ") : sansLimites).trim();
}

function structurerTexte(texte: string) {
  const phrases = texte.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)?.map((p) => p.trim()).filter(Boolean) ?? [texte];
  const essentiel = phrases.slice(0, 2).join(" ") || texte;
  const paragraphes: string[] = [];
  for (let i = 2; i < phrases.length; i += 2) paragraphes.push(phrases.slice(i, i + 2).join(" "));
  return { essentiel, paragraphes };
}

function rendreChiffres(texte: string, autorises: (valeur: number) => boolean, prefixe: string): ReactNode[] {
  return decouperChiffres(texte).map((m, i) =>
    m.chiffre && m.valeur !== null && autorises(m.valeur) ? (
      <span key={`${prefixe}-${i}`} className="p7-chiffre" data-chiffre>{m.texte}</span>
    ) : (
      <span key={`${prefixe}-${i}`}>{m.texte}</span>
    ),
  );
}
