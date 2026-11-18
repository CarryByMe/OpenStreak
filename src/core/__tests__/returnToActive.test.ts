import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as A from '../actions';
import { dayView } from '../day';
import { liveCheck } from '../habits';
import { emptySnapshot, type RecordMeta, type Task } from '../model';
import { MemoryStorage } from '../storage/memory';
import { initData, resetForTests, setClock, useDataStore } from '../store';
import { doneEarlier } from '../tasks';

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

describe('вернуть из «Сделано» в активные', () => {
  test('дело снова открыто и возвращается в «Осталось»', () => {
    const id = A.createTask({ title: 'Позвонить' });
    A.toggleTask(id);
    expect(dayView(data(), TODAY, TODAY).log.map((i) => i.id)).toEqual([id]);

    const undo = A.returnToActive('task', id, TODAY);
    expect(typeof undo).toBe('function');
    expect(data().tasks[id]).toMatchObject({ doneOn: null, doneAt: null });
    const view = dayView(data(), TODAY, TODAY);
    expect(view.left.map((i) => i.id)).toEqual([id]);
    expect(view.log).toEqual([]);
  });

  test('отмена возвращает прежние день и время выполнения', () => {
    const id = A.createTask({ title: 'Позвонить' });
    A.toggleTask(id);
    const { doneOn, doneAt } = data().tasks[id];
    const undo = A.returnToActive('task', id, TODAY)!;
    undo();
    expect(data().tasks[id]).toMatchObject({ doneOn, doneAt });
  });

  test('дело прошлого дня после возврата снова долг, дата сохраняется', () => {
    const id = A.createTask({ title: 'Долг', date: '2026-11-10' });
    A.toggleTask(id);
    A.returnToActive('task', id, TODAY);
    expect(data().tasks[id].date).toBe('2026-11-10');
    expect(dayView(data(), TODAY, TODAY).left[0]).toMatchObject({ id, debt: true });
  });

  test('невыполненное, удалённое и несуществующее вернуть нельзя', () => {
    const open = A.createTask({ title: 'Открытое' });
    expect(A.returnToActive('task', open, TODAY)).toBeNull();
    const gone = A.createTask({ title: 'Удалённое' });
    A.toggleTask(gone);
    A.deleteTask(gone);
    expect(A.returnToActive('task', gone, TODAY)).toBeNull();
    expect(A.returnToActive('task', 'нет такого', TODAY)).toBeNull();
    expect(A.returnToActive('habit', 'нет такой', TODAY)).toBeNull();
  });

  test('привычка: отметка снимается, отмена возвращает прежнее значение', () => {
    const id = A.createHabit(habitInput());
    A.setCheckValue(id, TODAY, 100);
    const undo = A.returnToActive('habit', id, TODAY)!;
    expect(liveCheck(data(), id, TODAY)).toBeUndefined();
    undo();
    expect(liveCheck(data(), id, TODAY)?.value).toBe(100);
  });

  test('слив у полезной привычки снимается и возвращается как слив', () => {
    const id = A.createHabit(habitInput({ measure: 'boolean', target: 1 }));
    A.toggleSlip(id, TODAY);
    const undo = A.returnToActive('habit', id, TODAY)!;
    expect(liveCheck(data(), id, TODAY)).toBeUndefined();
    undo();
    expect(liveCheck(data(), id, TODAY)).toMatchObject({ slip: true, value: 0 });
  });

  test('срыв вредной привычки снимается; чистый день — вернуть нечего', () => {
    const id = A.createHabit(habitInput({ kind: 'bad', measure: 'boolean', target: 1 }));
    expect(A.returnToActive('habit', id, TODAY)).toBeNull(); // отметки нет, день чистый
    A.setCheckValue(id, TODAY, 1);
    const undo = A.returnToActive('habit', id, TODAY)!;
    expect(liveCheck(data(), id, TODAY)).toBeUndefined();
    undo();
    expect(liveCheck(data(), id, TODAY)?.value).toBe(1);
  });
});

describe('выполненные ранее', () => {
  const meta = (id: string): RecordMeta => ({ id, createdAt: 1, updatedAt: 1, deletedAt: null });
  const task = (id: string, over: Partial<Task>): Task => ({
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
  const snap = (tasks: Task[]) => {
    const s = emptySnapshot('2026-10-01');
    for (const t of tasks) s.tasks[t.id] = t;
    return s;
  };

  test('вчерашнее и недавнее — да, сегодняшнее, открытое, старое и удалённое — нет', () => {
    const s = snap([
      task('вчера', { doneOn: '2026-11-15', doneAt: 5 }),
      task('неделя', { doneOn: '2026-11-09', doneAt: 5 }),
      task('сегодня', { doneOn: TODAY, doneAt: 5 }),
      task('открытое', {}),
      task('давно', { doneOn: '2026-09-01', doneAt: 5 }),
      { ...task('удалено', { doneOn: '2026-11-14', doneAt: 5 }), deletedAt: 9 },
    ]);
    expect(doneEarlier(s, TODAY).map((t) => t.id)).toEqual(['вчера', 'неделя']);
  });

  test('свежие сверху, внутри дня — по времени выполнения', () => {
    const s = snap([
      task('a', { doneOn: '2026-11-14', doneAt: 10 }),
      task('b', { doneOn: '2026-11-14', doneAt: 20 }),
      task('c', { doneOn: '2026-11-15', doneAt: 1 }),
    ]);
    expect(doneEarlier(s, TODAY).map((t) => t.id)).toEqual(['c', 'b', 'a']);
  });

  test('фильтр по сфере, окно в днях и лимит', () => {
    const s = snap([
      task('s1', { doneOn: '2026-11-15', doneAt: 1, areaId: 'x' }),
      task('s2', { doneOn: '2026-11-14', doneAt: 1, areaId: 'y' }),
      task('s3', { doneOn: '2026-11-01', doneAt: 1, areaId: 'x' }),
    ]);
    expect(doneEarlier(s, TODAY, { areaId: 'x' }).map((t) => t.id)).toEqual(['s1', 's3']);
    expect(doneEarlier(s, TODAY, { days: 3 }).map((t) => t.id)).toEqual(['s1', 's2']);
    expect(doneEarlier(s, TODAY, { limit: 1 }).map((t) => t.id)).toEqual(['s1']);
  });
});
