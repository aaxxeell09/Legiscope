import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Cohesion, DossierConfig, Groupes } from "@contracts/index";
import { Curseur, GroupeTag, Meta } from "../../../components";
import { useConfig } from "../../../lib/config";
import { useData } from "../../../lib/data";
import { formatMois, formatProba } from "../../../lib/format";

const COULEURS = ["var(--accent)", "var(--warning)", "var(--success)"];

type Ligne = { month: string } & Record<string, number | null | string>;

/**
 * Panneau repliable « Tendance » : accord mensuel entre 1 à 3 paires de groupes
 * (config.cohesion.paires_demo), traits verticaux aux censures, curseur de date.
 * Rien après la date de référence du dossier quand elle est posée.
 */
export function Tendance({ dossier }: { dossier: DossierConfig | null }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <section className="verdict-tendance-panneau">
      <button type="button" className="verdict-tendance-toggle" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        {ouvert ? "Masquer la tendance" : "Tendance"}
      </button>
      {ouvert && <TendanceContenu dossier={dossier} />}
    </section>
  );
}

function TendanceContenu({ dossier }: { dossier: DossierConfig | null }) {
  const config = useConfig();
  const coh = useData<Cohesion>("cohesion");
  const grp = useData<Groupes>("groupes");
  const dateRef = dossier?.date_reference ?? null;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const borne = dateRef ?? aujourdhui;
  const [curseur, setCurseur] = useState<string>(borne);

  const prepa = useMemo(() => {
    if (coh.status !== "ok" || !coh.data || !config) return null;
    const c = coh.data;
    const moisMax = borne.slice(0, 7);
    const voulues = config.cohesion.paires_demo.slice(0, 3);
    const paires = voulues
      .map(([a, b]) => c.pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a)))
      .filter((p): p is Cohesion["pairs"][number] => Boolean(p));
    const mois = Array.from(new Set(paires.flatMap((p) => p.series.map((s) => s.month))))
      .filter((m) => m <= moisMax)
      .sort();
    const lignes: Ligne[] = mois.map((m) => {
      const l: Ligne = { month: m };
      paires.forEach((p, i) => {
        const pt = p.series.find((s) => s.month === m);
        l[`p${i}`] = pt && pt.accord !== null ? Math.round(pt.accord * 1000) / 10 : null;
      });
      return l;
    });
    const censures = c.events.filter((e) => e.type === "censure" && e.date <= borne && mois.includes(e.date.slice(0, 7)));
    return { paires, lignes, mois, censures, meta: c.meta };
  }, [coh.status, coh.data, config, borne]);

  if (coh.status === "loading") return <div className="status">Chargement</div>;
  if (coh.status === "error") return <div className="status status-error">{coh.error}</div>;
  if (!prepa || prepa.paires.length === 0 || prepa.mois.length === 0) {
    return <p className="text-2">Aucune paire de groupes disponible pour cette période.</p>;
  }

  const groupes = grp.status === "ok" && grp.data ? grp.data.groupes : [];
  const g = (id: string) => groupes.find((x) => x.id === id);
  const sigle = (id: string) => g(id)?.sigle ?? id;
  const nomPaire = (i: number) => `${sigle(prepa.paires[i].a)} et ${sigle(prepa.paires[i].b)}`;

  const min = `${prepa.mois[0]}-01`;
  const moisCurseur = curseur.slice(0, 7);
  const ligneCurseur = prepa.lignes.find((l) => l.month === moisCurseur);

  return (
    <div className="verdict-tendance-contenu">
      <div className="verdict-tendance-legende">
        {prepa.paires.map((p, i) => (
          <span key={`${p.a}-${p.b}`} className="verdict-tendance-paire">
            <span className="verdict-tendance-trait" style={{ background: COULEURS[i] }} aria-hidden="true" />
            <PairTag id={p.a} g={g(p.a)} /> <PairTag id={p.b} g={g(p.b)} />
            <span className="text-2">
              {ligneCurseur && typeof ligneCurseur[`p${i}`] === "number"
                ? `${formatProba((ligneCurseur[`p${i}`] as number) / 100)} d'accord en ${formatMois(moisCurseur)}`
                : `pas de scrutin en ${formatMois(moisCurseur)}`}
            </span>
          </span>
        ))}
      </div>
      <div className="verdict-tendance-graphe">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={prepa.lignes} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis dataKey="month" tickFormatter={formatMois} stroke="var(--text-2)" tick={{ fontSize: 14 }} minTickGap={24} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v} %`} stroke="var(--text-2)" tick={{ fontSize: 14 }} width={56} />
            <Tooltip
              contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 14 }}
              labelFormatter={(m) => formatMois(String(m))}
              formatter={(val, name) => [val === null || val === undefined ? "pas de scrutin" : `${val} %`, nomPaire(Number(String(name).slice(1)))]}
            />
            {prepa.censures.map((e) => (
              <ReferenceLine key={e.date} x={e.date.slice(0, 7)} stroke="var(--danger)" strokeWidth={2} strokeDasharray="4 4" label={{ value: "censure", fill: "var(--danger)", fontSize: 14, position: "insideTopRight" }} />
            ))}
            {ligneCurseur && <ReferenceLine x={moisCurseur} stroke="var(--text)" strokeWidth={2} />}
            {prepa.paires.map((_, i) => (
              <Line key={i} type="monotone" dataKey={`p${i}`} stroke={COULEURS[i]} strokeWidth={3} dot={false} connectNulls={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Curseur min={min} max={borne} value={curseur} onChange={setCurseur} presets={config?.cohesion.curseur_presets ?? []} />
      <Meta meta={prepa.meta} />
    </div>
  );
}

function PairTag({ id, g }: { id: string; g?: { sigle: string; couleur: string } }) {
  if (!g) return <span>{id}</span>;
  return <GroupeTag sigle={g.sigle} couleur={g.couleur} />;
}
