import { describe, expect, test } from '@jest/globals';
import { HABIT_ICONS, UI_ICONS } from '../icons/paths';

describe('набор иконок (один на все оформления)', () => {
  test('каждая иконка что-то рисует и укладывается в сетку 24', () => {
    for (const [name, spec] of [...Object.entries(UI_ICONS), ...Object.entries(HABIT_ICONS)]) {
      expect([name, (spec.d + (spec.dots ?? '')).length > 0]).toEqual([name, true]);
      // Абсолютные координаты команд верхнего регистра лежат в [0, 24].
      const absolute = (spec.d + ' ' + (spec.dots ?? '')).match(/[MLHVC][^A-Za-z]*/g) ?? [];
      for (const seg of absolute) {
        for (const n of seg.slice(1).match(/-?\d*\.?\d+/g) ?? []) {
          expect([name, Number(n) >= -0.01 && Number(n) <= 24.01]).toEqual([name, true]);
        }
      }
    }
  });
});
