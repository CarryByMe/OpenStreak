import { describe, expect, test } from '@jest/globals';
import { contrastRatio, readableOn } from '../readable';

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
