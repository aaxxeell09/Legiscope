/** Sigle du groupe sur fond de sa couleur, texte noir ou blanc selon la luminance. */
export function GroupeTag({
  sigle,
  couleur,
  title,
}: {
  sigle: string | null | undefined;
  couleur?: string | null;
  title?: string;
}) {
  const bg = couleur && /^#[0-9a-f]{6}$/i.test(couleur) ? couleur : "#2a3340";
  const fg = textColorFor(bg);
  return (
    <span className="groupe-tag" style={{ background: bg, color: fg }} title={title}>
      {sigle || "NI"}
    </span>
  );
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

/** Choisit le texte qui a le meilleur contraste sur `bg`. */
export function textColorFor(bg: string): string {
  const L = luminance(bg);
  const white = 1.05 / (L + 0.05);
  const black = (L + 0.05) / 0.05;
  return white >= black ? "#ffffff" : "#0b0e14";
}
