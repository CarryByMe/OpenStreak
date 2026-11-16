import { describe, expect, test } from '@jest/globals';
import { SWATCHES } from '../swatches';
import { blend, contrastRatio, ensureContrast, readableOn } from '../readable';

describe('readableOn', () => {
  test('светлый на тёмной заливке, тёмный на светлой', () => {
    expect(readableOn('#1D63DD')).toBe('#FFFFFF');
    expect(readableOn('#F59E0B')).toBe('#141A23');
    expect(readableOn('#CDDC39')).toBe('#141A23');
  });

  test('любой цвет из набора монолита даёт контраст не ниже 3 (значок, не текст)', () => {
    const colors = [
      '#2f7cf6',
      '#1fb876',
      '#f59e0b',
      '#ef4444',
      '#a855f7',
      '#14b8a6',
      '#f97316',
      '#ec4899',
      '#607d8b',
      '#8bc34a',
      '#ff5722',
      '#9c27b0',
      '#3f51b5',
      '#009688',
      '#cddc39',
      '#795548',
    ];
    for (const c of colors) {
      expect([c, contrastRatio(readableOn(c), c) >= 3]).toEqual([c, true]);
    }
  });

  test('мусор вместо цвета не роняет отрисовку', () => {
    expect(readableOn('red')).toBe('#FFFFFF');
    expect(readableOn('')).toBe('#FFFFFF');
  });
});

describe('ensureContrast', () => {
  const light = ['#F4F6FA', '#FFFFFF'];
  const dark = ['#0E1217', '#161C24'];

  test('любой цвет набора проходит контраст 3 на светлой и тёмной теме', () => {
    for (const c of SWATCHES) {
      for (const bgs of [light, dark]) {
        const out = ensureContrast(c, bgs);
        for (const b of bgs) expect([c, contrastRatio(out, b) >= 3]).toEqual([c, true]);
      }
    }
  });

  test('достаточно контрастный цвет не меняется, бледный — темнеет с сохранением тона', () => {
    expect(ensureContrast('#1D4FC4', light)).toBe('#1D4FC4');
    const out = ensureContrast('#CDDC39', light);
    expect(out).not.toBe('#CDDC39');
    // жёлто-зелёный: красный и зелёный каналы остаются выше синего
    expect(parseInt(out.slice(1, 3), 16)).toBeGreaterThan(parseInt(out.slice(5, 7), 16));
  });

  test('мусор вместо цвета возвращается как есть', () => {
    expect(ensureContrast('red', light)).toBe('red');
  });
});

describe('blend', () => {
  test('смешивает цвет с фоном по доле', () => {
    expect(blend('#000000', '#FFFFFF', 0)).toBe('#FFFFFF');
    expect(blend('#000000', '#FFFFFF', 1)).toBe('#000000');
    expect(blend('#FF0000', '#FFFFFF', 0.5)).toBe('#FF8080');
  });
  test('не hex — цвет как есть', () => {
    expect(blend('red', '#FFFFFF', 0.5)).toBe('red');
  });
});
