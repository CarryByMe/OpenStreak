import { describe, expect, test } from '@jest/globals';
import { habitColor } from '../colors';
import type { Area } from '../model';

const area = (color: string, deletedAt: number | null = null): Area => ({
  id: 'a',
  createdAt: 1,
  updatedAt: 1,
  deletedAt,
  name: 'Здоровье',
  color,
  icon: 'apple',
});

describe('цвет привычки', () => {
  test('в сфере — цвет сферы, меняется вместе с ней', () => {
    const h = { color: '#2f7cf6', areaId: 'a' };
    expect(habitColor(h, { a: area('#1fb876') })).toBe('#1fb876');
    expect(habitColor(h, { a: area('#ec4899') })).toBe('#ec4899');
  });

  test('без сферы или при удалённой сфере — собственный цвет', () => {
    expect(habitColor({ color: '#a855f7', areaId: null }, { a: area('#1fb876') })).toBe('#a855f7');
    expect(habitColor({ color: '#a855f7', areaId: 'a' }, { a: area('#1fb876', 5) })).toBe(
      '#a855f7'
    );
    expect(habitColor({ color: '#a855f7', areaId: 'gone' }, {})).toBe('#a855f7');
  });
});
