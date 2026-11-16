import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as A from '../actions';
import { MemoryStorage } from '../storage/memory';
import { initData, resetForTests, setClock, useDataStore } from '../store';

const NOW = new Date('2026-11-04T12:00:00').getTime();
let tick = 0;

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(NOW));
  tick = 0;
  setClock(() => NOW + tick++);
  resetForTests();
  await initData({ storage: new MemoryStorage() });
});

afterEach(() => {
  jest.useRealTimers();
});

const habit = (id: string) => useDataStore.getState().data.habits[id]!;

describe('normalizeDays', () => {
  test('пусто и все семь дней — каждый день', () => {
    expect(A.normalizeDays(null)).toBeNull();
    expect(A.normalizeDays([])).toBeNull();
    expect(A.normalizeDays([0, 1, 2, 3, 4, 5, 6])).toBeNull();
  });
  test('сортирует, убирает повторы и мусор', () => {
    expect(A.normalizeDays([5, 1, 3, 1, 9, -1, 2.5])).toEqual([1, 3, 5]);
  });
});

describe('дни недели привычки из шторки', () => {
  test('быстрая привычка получает расписание', () => {
    const id = A.createQuickHabit({ name: 'Зал', kind: 'good', remindAt: '', days: [5, 1, 3] });
    expect(habit(id).days).toEqual([1, 3, 5]);
  });

  test('без расписания — каждый день', () => {
    const id = A.createQuickHabit({ name: 'Вода', kind: 'good', remindAt: '' });
    expect(habit(id).days).toBeNull();
  });

  test('правка меняет дни, не трогая значок; undefined оставляет как было', () => {
    const id = A.createQuickHabit({
      name: 'Бег',
      kind: 'good',
      remindAt: '',
      icon: 'running',
      days: [1, 2],
    });
    A.editHabitBasics(id, { name: 'Бег', kind: 'good', remindAt: '' });
    expect(habit(id).days).toEqual([1, 2]);
    A.editHabitBasics(id, { name: 'Бег', kind: 'good', remindAt: '', days: [6, 0] });
    expect(habit(id).days).toEqual([0, 6]);
    expect(habit(id).icon).toBe('running');
    A.editHabitBasics(id, { name: 'Бег', kind: 'good', remindAt: '', days: null });
    expect(habit(id).days).toBeNull();
  });
});
