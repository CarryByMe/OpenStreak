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

/** Смешать `#RRGGBB` с чёрным или белым: `amount` 0…1, `to` — цвет, к которому смешиваем. */
function mix(hex: string, to: 0 | 255, amount: number): string {
  const part = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(c + (to - c) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${part(1)}${part(3)}${part(5)}`.toUpperCase();
}

/**
 * Цвет сферы или привычки для отметки (рамка, заливка, точка): если он слишком бледный на фоне
 * экрана или карточки, затемняем (на тёмной теме — осветляем), пока контраст не станет не ниже
 * `min` (3 — для значков и отметок, WCAG 2.x). Тон сохраняется, цвет из набора не теряется.
 */
export function ensureContrast(color: string, backgrounds: string[], min = 3): string {
  if (!HEX.test(color) || backgrounds.some((b) => !HEX.test(b))) return color;
  const ok = (c: string) => backgrounds.every((b) => contrastRatio(c, b) >= min);
  if (ok(color)) return color;
  // Фон светлый — темним, фон тёмный — светлим.
  const light = backgrounds.reduce((n, b) => n + luminance(b), 0) / backgrounds.length > 0.4;
  for (let step = 1; step <= 20; step++) {
    const next = mix(color, light ? 0 : 255, step * 0.05);
    if (ok(next)) return next;
  }
  return light ? '#000000' : '#FFFFFF';
}

/** Смешать `#RRGGBB` с фоном: `amount` — доля цвета (0…1). Не hex — вернём цвет как есть. */
export function blend(color: string, bg: string, amount: number): string {
  if (!HEX.test(color) || !HEX.test(bg)) return color;
  const part = (i: number) => {
    const c = parseInt(color.slice(i, i + 2), 16);
    const b = parseInt(bg.slice(i, i + 2), 16);
    return Math.round(b + (c - b) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${part(1)}${part(3)}${part(5)}`.toUpperCase();
}
