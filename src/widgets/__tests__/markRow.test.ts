import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as A from '../../core/actions';
import { liveCheck } from '../../core/habits';
import { MemoryStorage } from '../../core/storage/memory';
import { initData, resetForTests, setClock, useDataStore } from '../../core/store';
import { markRow, parseMarkTarget } from '../markRow';

const TODAY = '2026-11-16';
const NOW = new Date(`${TODAY}T12:00:00`).getTime();
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

const data = () => useDataStore.getState().data;

const habitInput = (over: Partial<A.HabitInput> = {}): A.HabitInput => ({
  name: 'Отжимания',
  kind: 'good',
  icon: 'target',
  color: '#2f7cf6',
  days: null,
  question: '',
  remindAt: '',
  areaId: null,
  measure: 'numeric',
  unit: 'count',
  target: 100,
  ...over,
});

describe('отметка из виджета', () => {
  test('дело отмечается сегодняшним днём', () => {
    const id = A.createTask({ title: 'Позвонить' });
    expect(markRow({ kind: 'task', id })).toBe(true);
    expect(data().tasks[id].doneOn).toBe(TODAY);
  });

  test('повторное нажатие по устаревшему виджету дело не снимает', () => {
    const id = A.createTask({ title: 'Позвонить' });
    A.toggleTask(id); // уже отмечено в приложении
    const at = data().tasks[id].doneAt;
    expect(markRow({ kind: 'task', id })).toBe(false);
    expect(data().tasks[id]).toMatchObject({ doneOn: TODAY, doneAt: at });
  });

  test('долг отмечается сегодняшним днём', () => {
    const id = A.createTask({ title: 'Долг', date: '2026-11-10' });
    expect(markRow({ kind: 'task', id })).toBe(true);
    expect(data().tasks[id].doneOn).toBe(TODAY);
  });

  test('числовая привычка — полная норма, начатая тоже добивается', () => {
    const id = A.createHabit(habitInput());
    A.setCheckValue(id, TODAY, 60);
    expect(markRow({ kind: 'habit', id })).toBe(true);
    expect(liveCheck(data(), id, TODAY)?.value).toBe(100);
    expect(markRow({ kind: 'habit', id })).toBe(false); // уже полная — не трогаем
  });

  test('привычка «да / нет»', () => {
    const id = A.createHabit(habitInput({ measure: 'boolean', target: 1 }));
    expect(markRow({ kind: 'habit', id })).toBe(true);
    expect(liveCheck(data(), id, TODAY)?.value).toBe(1);
  });

  test('слитую сегодня привычку виджет не «чинит»', () => {
    const id = A.createHabit(habitInput({ measure: 'boolean', target: 1 }));
    A.toggleSlip(id, TODAY);
    expect(markRow({ kind: 'habit', id })).toBe(false);
    expect(liveCheck(data(), id, TODAY)?.slip).toBe(true);
  });

  test('вредная привычка и несуществующие записи игнорируются', () => {
    const bad = A.createHabit(habitInput({ kind: 'bad', measure: 'boolean', target: 1 }));
    expect(markRow({ kind: 'habit', id: bad })).toBe(false);
    expect(markRow({ kind: 'habit', id: 'нет такой' })).toBe(false);
    expect(markRow({ kind: 'task', id: 'нет такой' })).toBe(false);
    expect(liveCheck(data(), bad, TODAY)).toBeUndefined();
  });

  test('удалённое дело не оживает', () => {
    const id = A.createTask({ title: 'Лишнее' });
    A.deleteTask(id);
    expect(markRow({ kind: 'task', id })).toBe(false);
    expect(data().tasks[id].doneOn).toBeNull();
  });
});

describe('данные нажатия', () => {
  test('нормальные разбираются', () => {
    expect(parseMarkTarget({ kind: 'task', id: 'a' })).toEqual({ kind: 'task', id: 'a' });
    expect(parseMarkTarget({ kind: 'habit', id: 'b', extra: 1 })).toEqual({
      kind: 'habit',
      id: 'b',
    });
  });

  test('мусор отбрасывается', () => {
    for (const bad of [
      null,
      undefined,
      'task',
      42,
      {},
      { kind: 'goal', id: 'a' },
      { kind: 'task' },
      { kind: 'task', id: '' },
      { kind: 'task', id: 5 },
    ]) {
      expect(parseMarkTarget(bad)).toBeNull();
    }
  });
});
