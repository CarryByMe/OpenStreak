import { describe, expect, test } from '@jest/globals';
import { dayBars, indexByDay, monthGrid, shiftCursor, weekDays, yearMonths } from '../calendar';
import { addMonths, startOfMonth } from '../dates';
import type { Goal, RecordMeta, Task } from '../model';

const meta = (id: string): RecordMeta => ({ id, createdAt: 1, updatedAt: 1, deletedAt: null });

const task = (id: string, over: Partial<Task> = {}): Task => ({
  ...meta(id),
  title: id,
  notes: '',
  date: null,
  priority: 0,
  doneOn: null,
  doneAt: null,
  areaId: null,
  remindAt: '',
  placeId: null,
  placeTrigger: null,
  ...over,
});

const goal = (id: string, over: Partial<Goal> = {}): Goal => ({
  ...meta(id),
  areaId: null,
  text: id,
  criterion: '',
  reward: '',
  penalty: '',
  deadline: null,
  doneOn: null,
  ...over,
});

const byId = <T extends { id: string }>(...xs: T[]) => Object.fromEntries(xs.map((x) => [x.id, x]));

describe('addMonths / startOfMonth', () => {
  test('сохраняет день и подрезает до конца месяца', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-11-16', 1)).toBe('2026-12-16');
    expect(addMonths('2026-12-16', 1)).toBe('2027-01-16');
    expect(addMonths('2026-01-16', -1)).toBe('2025-12-16');
    expect(addMonths('2026-03-31', -13)).toBe('2025-02-28');
  });
  test('первое число', () => expect(startOfMonth('2026-11-16')).toBe('2026-11-01'));
});

describe('сетки', () => {
  test('месяц: 42 клетки с понедельника, соседние месяцы помечены', () => {
    const g = monthGrid('2026-11-16', 1);
    expect(g).toHaveLength(42);
    expect(g[0]).toEqual({ date: '2026-10-26', inMonth: false });
    expect(g[6]).toEqual({ date: '2026-11-01', inMonth: true });
    expect(g.filter((c) => c.inMonth)).toHaveLength(30);
  });
  test('месяц с воскресенья', () => {
    expect(monthGrid('2026-11-16', 0)[0]!.date).toBe('2026-11-01');
  });
  test('неделя', () => {
    expect(weekDays('2026-11-18', 1)[0]).toBe('2026-11-16');
    expect(weekDays('2026-11-18', 1)[6]).toBe('2026-11-22');
    expect(weekDays('2026-11-18', 0)[0]).toBe('2026-11-15');
  });
  test('год: двенадцать месяцев, смещение первого числа', () => {
    const y = yearMonths('2026-11-16', 1);
    expect(y).toHaveLength(12);
    expect(y[1]!.days).toHaveLength(28);
    expect(y[0]!.offset).toBe(3); // 1 января 2026 — четверг
    expect(yearMonths('2026-11-16', 0)[0]!.offset).toBe(4);
  });
  test('сдвиг курсора', () => {
    expect(shiftCursor('2026-11-16', 'week', 1)).toBe('2026-11-23');
    expect(shiftCursor('2026-11-16', 'month', -1)).toBe('2026-10-16');
    expect(shiftCursor('2026-11-16', 'year', 1)).toBe('2027-11-16');
  });
});

describe('indexByDay и плашки', () => {
  const snap = {
    tasks: byId(
      task('a', { date: '2026-11-16', priority: 1 }),
      task('b', { date: '2026-11-16', priority: 3 }),
      task('c', { date: '2026-11-16', doneOn: '2026-11-16' }),
      task('d', { date: null }),
      task('e', { date: '2026-11-17', areaId: 'x' }),
      { ...task('f', { date: '2026-11-17' }), deletedAt: 5 }
    ),
    goals: byId(
      goal('g1', { deadline: '2026-11-17', areaId: 'x' }),
      goal('g2', { deadline: '2026-11-17' }),
      goal('g3', { deadline: null })
    ),
  };

  test('дела по дням: важные выше, выполненные в конце; без даты и удалённых нет', () => {
    const idx = indexByDay(snap, null);
    expect(idx.get('2026-11-16')!.tasks.map((t) => t.id)).toEqual(['b', 'a', 'c']);
    expect(idx.get('2026-11-17')!.tasks.map((t) => t.id)).toEqual(['e']);
    expect(
      idx
        .get('2026-11-17')!
        .goals.map((g) => g.id)
        .sort()
    ).toEqual(['g1', 'g2']);
    expect([...idx.keys()].sort()).toEqual(['2026-11-16', '2026-11-17']);
  });

  test('фильтр по сфере действует и на дела, и на цели', () => {
    const idx = indexByDay(snap, 'x');
    expect(idx.has('2026-11-16')).toBe(false);
    expect(idx.get('2026-11-17')!.tasks.map((t) => t.id)).toEqual(['e']);
    expect(idx.get('2026-11-17')!.goals.map((g) => g.id)).toEqual(['g1']);
  });

  test('плашки: долг, открытое, сделано', () => {
    const idx = indexByDay(snap, null);
    const tasks = idx.get('2026-11-16')!.tasks;
    expect(dayBars(tasks, '2026-11-16')).toEqual(['open', 'open', 'done']);
    expect(dayBars(tasks, '2026-11-18')).toEqual(['debt', 'debt', 'done']);
  });
});
