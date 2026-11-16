/**
 * Цвет значка или текста поверх произвольной заливки (цвет сферы или привычки): тёмный или
 * светлый — тот, у которого контраст выше (WCAG 2.x). Так контраст проходит для любого цвета.
 */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Не `#RRGGBB` — вернём светлый: данные из импорта нельзя считать надёжными. */
const HEX = /^#[0-9a-fA-F]{6}$/;

export function readableOn(bg: string, light = '#FFFFFF', dark = '#141A23'): string {
  if (!HEX.test(bg)) return light;
  return contrastRatio(light, bg) >= contrastRatio(dark, bg) ? light : dark;
}
