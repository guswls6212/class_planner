/**
 * Mix a hex color with white by `ratio` (0 = original, 1 = white).
 * Shared by SessionCard (3-tone bg) and PDF renderer for cross-platform visual parity.
 */
export function tintFromHex(hex: string, ratio = 0.8): string {
  const h = hex.replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(h)) {
    throw new Error(`tintFromHex: expected 6-digit hex, got "${hex}"`);
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const tr = Math.round(r * (1 - ratio) + 255 * ratio);
  const tg = Math.round(g * (1 - ratio) + 255 * ratio);
  const tb = Math.round(b * (1 - ratio) + 255 * ratio);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(tr)}${toHex(tg)}${toHex(tb)}`;
}
