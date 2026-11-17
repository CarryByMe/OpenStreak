/**
 * Картинки виджета строками SVG: луна, кольцо прогресса, отметки, кнопка «+».
 * Android-виджет рисует их через `SvgWidget`: канвы и `react-native-svg` в фоновой задаче нет.
 * Чистые функции, цвета приходят снаружи (из `WidgetColors`).
 */
import { litPath } from '../ui/moon';
import { UI_ICONS } from '../ui/icons/paths';
import type { WidgetColors } from './view';

const NS = 'xmlns="http://www.w3.org/2000/svg"';

const num = (n: number) => String(Math.round(n * 100) / 100);

function svg(w: number, h: number, viewBox: string, body: string): string {
  return `<svg ${NS} width="${num(w)}" height="${num(h)}" viewBox="${viewBox}">${body}</svg>`;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

/** Дуга прогресса «Обычного»: дорожка и цветная дуга от верха по часовой стрелке. */
export function ringSvg(size: number, progress: number, c: WidgetColors, stroke = 5): string {
  const r = (size - stroke) / 2;
  const mid = size / 2;
  const len = 2 * Math.PI * r;
  const p = clamp01(progress);
  const arc =
    p > 0
      ? `<circle cx="${num(mid)}" cy="${num(mid)}" r="${num(r)}" fill="none" stroke="${c.accent}" stroke-width="${stroke}" stroke-linecap="${p >= 1 ? 'butt' : 'round'}" stroke-dasharray="${num(len * p)} ${num(len)}" transform="rotate(-90 ${num(mid)} ${num(mid)})"/>`
      : '';
  return svg(
    size,
    size,
    `0 0 ${size} ${size}`,
    `<circle cx="${num(mid)}" cy="${num(mid)}" r="${num(r)}" fill="none" stroke="${c.track}" stroke-width="${stroke}"/>${arc}`
  );
}

/** Галочка из общего набора иконок (24×24) своим цветом и толщиной. */
function checkPath(color: string, width: number, transform = ''): string {
  return `<path d="${UI_ICONS.check.d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${transform ? ` transform="${transform}"` : ''}/>`;
}

/** «Обычный»: день собран — зелёное кольцо с галочкой. */
export function doneRingSvg(size: number, c: WidgetColors, stroke = 5): string {
  const r = (size - stroke) / 2;
  const mid = size / 2;
  // галочка 24×24 вписана в центральную половину круга
  const s = (size * 0.5) / 24;
  const off = size * 0.25;
  return svg(
    size,
    size,
    `0 0 ${size} ${size}`,
    `<circle cx="${num(mid)}" cy="${num(mid)}" r="${num(r)}" fill="none" stroke="${c.ok}" stroke-width="${stroke}"/>${checkPath(c.ok, 2.6, `translate(${num(off)} ${num(off)}) scale(${num(s)})`)}`
  );
}

/** Маленькая галочка «Сделано · N». */
export function checkSvg(size: number, color: string): string {
  return svg(size, size, '0 0 24 24', checkPath(color, 3));
}

/**
 * Луна «Мульта» (как `ui/Moon.tsx`): тёмная сторона, освещённая часть, кратеры у полной, кольцо.
 * `tone` — освещённая часть: жёлтая или красная (долг).
 */
export function moonSvg(
  size: number,
  phase: number,
  c: WidgetColors,
  opts: { tone?: 'sun' | 'red'; ring?: string; ringWidth?: number } = {}
): string {
  const tone = opts.tone ?? 'sun';
  const lit = tone === 'red' ? c.red : c.accent;
  const crater = tone === 'red' ? c.craterRed : c.crater;
  const ring = opts.ring ?? c.ring;
  const d = litPath(phase);
  const full = phase >= 0.999;
  const rw = opts.ringWidth ?? (size <= 36 ? 8 : 5);
  return svg(
    size,
    size,
    '0 0 100 100',
    `<circle cx="50" cy="50" r="46" fill="${c.track}"/>` +
      (d ? `<path d="${d}" fill="${lit}"/>` : '') +
      (full
        ? `<circle cx="36" cy="38" r="8" fill="${crater}"/><circle cx="62" cy="62" r="11" fill="${crater}"/><circle cx="66" cy="32" r="5" fill="${crater}"/>`
        : '') +
      `<circle cx="50" cy="50" r="46" fill="none" stroke="${ring}" stroke-width="${rw}"/>`
  );
}

/**
 * Отметка строки «Обычного»: дело — круг, привычка — скруглённый квадрат; рамка цвета сферы или
 * привычки (долг — красная), у числовой привычки в процессе — заливка снизу.
 */
export function markSvg(
  size: number,
  shape: 'circle' | 'square',
  fraction: number,
  color: string,
  c: WidgetColors,
  debt = false
): string {
  const stroke = 2;
  const tone = debt ? c.red : color;
  const half = stroke / 2;
  const inner = size - stroke;
  const f = clamp01(fraction);
  const outline =
    shape === 'circle'
      ? `<circle cx="${num(size / 2)}" cy="${num(size / 2)}" r="${num(inner / 2)}" fill="none" stroke="${tone}" stroke-width="${stroke}"/>`
      : `<rect x="${half}" y="${half}" width="${num(inner)}" height="${num(inner)}" rx="${num(size * 0.24)}" fill="none" stroke="${tone}" stroke-width="${stroke}"/>`;
  if (f <= 0) return svg(size, size, `0 0 ${size} ${size}`, outline);
  const shapePath =
    shape === 'circle'
      ? `<circle cx="${num(size / 2)}" cy="${num(size / 2)}" r="${num(inner / 2)}"/>`
      : `<rect x="${half}" y="${half}" width="${num(inner)}" height="${num(inner)}" rx="${num(size * 0.24)}"/>`;
  const top = size - size * f;
  return svg(
    size,
    size,
    `0 0 ${size} ${size}`,
    `<defs><clipPath id="m${size}">${shapePath}</clipPath></defs><rect x="0" y="${num(top)}" width="${size}" height="${num(size - top)}" fill="${tone}" clip-path="url(#m${size})"/>${outline}`
  );
}

/** Кнопка «+»: «Обычный» — круг акцента; «Мульт» — жёлтая наклейка с обводкой и жёсткой тенью. */
export function plusSvg(size: number, look: 'soft' | 'mult', c: WidgetColors): string {
  const plus = (color: string, width: number, transform: string) =>
    `<path d="${UI_ICONS.plus.d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" transform="${transform}"/>`;
  if (look === 'soft') {
    const s = (size * 0.46) / 24;
    const off = size * 0.27;
    return svg(
      size,
      size,
      `0 0 ${size} ${size}`,
      `<circle cx="${num(size / 2)}" cy="${num(size / 2)}" r="${num(size / 2)}" fill="${c.accent}"/>${plus(c.onAccent, 2.6, `translate(${num(off)} ${num(off)}) scale(${num(s)})`)}`
    );
  }
  const sh = 3;
  const body = size - sh;
  const stroke = 2.5;
  const r = (body - stroke) / 2;
  const mid = body / 2;
  const s = (body * 0.46) / 24;
  const off = body * 0.27;
  return svg(
    size,
    size,
    `0 0 ${size} ${size}`,
    `<circle cx="${num(mid + sh)}" cy="${num(mid + sh)}" r="${num(r + stroke / 2)}" fill="${c.shadow}"/>` +
      `<circle cx="${num(mid)}" cy="${num(mid)}" r="${num(r)}" fill="${c.accent}" stroke="${c.line}" stroke-width="${stroke}"/>` +
      plus(c.line, 2.8, `translate(${num(off)} ${num(off)}) scale(${num(s)})`)
  );
}
