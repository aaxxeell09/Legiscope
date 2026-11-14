const NBSP_FINE = " "; // espace fine insécable, avant « % »

/** 0.71 → « 71 % ». null ou undefined → « pas de prédiction ». */
export function formatProba(p: number | null | undefined): string {
  if (p === null || p === undefined || Number.isNaN(p)) return "pas de prédiction";
  const pct = Math.round(Math.min(1, Math.max(0, p)) * 100);
  return `${pct}${NBSP_FINE}%`;
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** « 2026-11-03 » ou ISO complet → « 3 nov. 2026 ». Chaîne vide si invalide. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateFmt.format(d);
}

/** ISO complet → « 14 nov. 2026 14:02 ». */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateTimeFmt.format(d);
}

/** « 2026-07 » → « juil. 2026 ». */
export function formatMois(yyyyMm: string): string {
  const d = new Date(`${yyyyMm}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return yyyyMm;
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(d);
}

/** (« Marie », « Dupont ») → « Marie Dupont ». Tolère un prénom ou un nom absent. */
export function formatNom(prenom: string | null | undefined, nom: string | null | undefined): string {
  return [prenom, nom]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

/** 1234 → « 1 234 » (espace fine). */
export function formatNombre(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}
