// Проверка контраста всех пар цветов из src/theme/palettes.json для каждой темы.
// Формула — WCAG 2.x (relative luminance). Падает с кодом 1, если хоть одна пара не проходит.
import { readFileSync } from 'node:fs';

const MIN = { text: 4.5, large: 3, ui: 3 };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const { themes, checks, mood } = JSON.parse(
  readFileSync(new URL('../src/theme/palettes.json', import.meta.url), 'utf8')
);

let failed = 0;
for (const [name, t] of Object.entries(themes)) {
  console.log(`\n${name}`);
  for (const [fg, bg, kind, onlyThemes] of checks) {
    // Необязательный четвёртый элемент — темы, в которых пара проверяется.
    if (onlyThemes && !onlyThemes.includes(name)) continue;
    if (!t[fg] || !t[bg] || !MIN[kind]) {
      console.log(`  MISSING  ${fg} / ${bg} / ${kind}`);
      failed++;
      continue;
    }
    const ratio = contrast(t[fg], t[bg]);
    const ok = ratio >= MIN[kind];
    if (!ok) failed++;
    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'} ${ratio.toFixed(2).padStart(5)} ≥ ${MIN[kind]}  ${fg} (${t[fg]}) на ${bg} (${t[bg]})`
    );
  }
}

// Лица оценки дня («Обычный»): каждая кайма видна на фоне экрана и на карточке,
// черты лица читаются на заливке.
for (const [scheme, theme] of [
  ['light', 'normalLight'],
  ['dark', 'normalDark'],
]) {
  console.log(`\nmood ${scheme} (${theme})`);
  const t = themes[theme];
  const m = mood[scheme];
  for (let i = 0; i < 5; i++) {
    const pairs = [
      [`ring${i + 1}`, m.ring[i], 'bg', t.bg],
      [`ring${i + 1}`, m.ring[i], 'surface', t.surface],
      [`ink${i + 1}`, m.ink[i], `fill${i + 1}`, m.fill[i]],
    ];
    for (const [fn, fg, bn, bg] of pairs) {
      const ratio = contrast(fg, bg);
      const ok = ratio >= MIN.ui;
      if (!ok) failed++;
      console.log(
        `  ${ok ? 'ok  ' : 'FAIL'} ${ratio.toFixed(2).padStart(5)} ≥ ${MIN.ui}  ${fn} (${fg}) на ${bn} (${bg})`
      );
    }
  }
}

if (failed) {
  console.error(`\n${failed} пар(ы) не проходят контраст`);
  process.exit(1);
}
console.log('\nВсе пары проходят.');
