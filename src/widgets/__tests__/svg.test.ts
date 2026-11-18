import { describe, expect, test } from '@jest/globals';
import { resolvePalette } from '../../theme/palette';
import { contrastRatio } from '../../theme/readable';
import { checkSvg, doneMarkSvg, doneRingSvg, markSvg, moonSvg, plusSvg, ringSvg } from '../svg';
import type { WidgetColors } from '../view';

const p = resolvePalette('light', 'auf');
const c: WidgetColors = {
  surface: p.surface,
  text: p.text,
  muted: p.muted,
  ring: p.ring,
  line: p.line,
  shadow: p.shadow,
  divider: p.divider,
  track: p.track,
  accent: p.sun,
  onAccent: p.onSun,
  ok: p.teal,
  onOk: p.onTeal,
  red: p.red,
  onRed: p.onRed,
  tag: p.tag,
  crater: p.crater,
  craterRed: p.craterRed,
};

const all = [
  ringSvg(30, 0.4, c),
  doneRingSvg(30, c),
  checkSvg(14, c.ok),
  moonSvg(24, 0.5, c),
  markSvg(22, 'square', 0.5, '#1fb876', c),
  plusSvg(44, 'soft', c),
  plusSvg(44, 'mult', c),
  doneMarkSvg(22, 'circle', '#1fb876', c),
  doneMarkSvg(22, 'square', '#2f7cf6', c),
];

describe('SVG виджета', () => {
  test('каждая картинка — одно корректное SVG-дерево', () => {
    for (const s of all) {
      expect(s.startsWith('<svg ')).toBe(true);
      expect(s.endsWith('</svg>')).toBe(true);
      expect(s.match(/<svg /g)).toHaveLength(1);
      // нет «NaN» и «undefined» из-за плохих чисел или цветов
      expect(s).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  test('дуга: от нуля — только дорожка, от единицы — полный круг', () => {
    expect(ringSvg(30, 0, c)).not.toContain('stroke-dasharray');
    expect(ringSvg(30, 1, c)).toContain(`stroke="${c.accent}"`);
    expect(ringSvg(30, Number.NaN, c)).not.toContain('stroke-dasharray');
    expect(ringSvg(30, 7, c)).toContain('stroke-dasharray'); // больше единицы — как полный
  });

  test('луна: у полной кратеры, у пустой нет освещённой части', () => {
    expect(moonSvg(24, 1, c).match(/<circle/g)).toHaveLength(5);
    expect(moonSvg(24, 0, c).match(/<path/g)).toBeNull();
    expect(moonSvg(24, 0.5, c).match(/<path/g)).toHaveLength(1);
  });

  test('долг рисуется красной луной и красной рамкой', () => {
    expect(moonSvg(24, 1, c, { tone: 'red', ring: c.red })).toContain(c.red);
    expect(markSvg(22, 'circle', 0, '#2f7cf6', c, true)).toContain(c.red);
    expect(markSvg(22, 'circle', 0, '#2f7cf6', c, true)).not.toContain('#2f7cf6');
  });

  test('отметка: заливка только у начатой, не выходит за пределы 0…1', () => {
    expect(markSvg(22, 'square', 0, '#1fb876', c)).not.toContain('clip-path');
    expect(markSvg(22, 'square', 0.4, '#1fb876', c)).toContain('clip-path');
    expect(markSvg(22, 'square', 5, '#1fb876', c)).toContain('y="0"');
  });

  test('отмеченная строка: залита цветом и галочка читается на нём в обеих темах', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const p2 = resolvePalette(scheme, 'normal');
      const c2 = { ...c, text: p2.text, surface: p2.surface };
      for (const color of ['#1fb876', '#cddc39', '#2f7cf6', '#795548', '#f59e0b']) {
        const svg = doneMarkSvg(22, 'circle', color, c2);
        const check = /<path[^>]*stroke="(#[0-9A-Fa-f]{6})"/.exec(svg)![1];
        expect(svg).toContain(`fill="${color}"`);
        expect([scheme, color, contrastRatio(check, color) >= 3]).toEqual([scheme, color, true]);
      }
    }
  });
});
