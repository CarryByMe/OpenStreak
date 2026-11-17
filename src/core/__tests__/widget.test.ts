import { describe, expect, test } from '@jest/globals';
import {
  checkId,
  emptySnapshot,
  type Area,
  type Habit,
  type HabitCheck,
  type RecordMeta,
  type Snapshot,
  type Task,
} from '../model';
import { POINTS } from '../points';
import { todayWidgetModel } from '../widget';

// 2026-11-16 — понедельник.
const TODAY = '2026-11-16';

const meta = (id: string, createdAt = 1): RecordMeta => ({
  id,
  createdAt,
  updatedAt: createdAt,
  deletedAt: null,
});

function task(id: string, over: Partial<Task> = {}): Task {
  return {
    ...meta(id),
    title: id,
    notes: '',
    date: TODAY,
    priority: 0,
    doneOn: null,
    doneAt: null,
    areaId: null,
    remindAt: '',
    placeId: null,
    placeTrigger: null,
    ...over,
  };
}

function habit(id: string, over: Partial<Habit> = {}): Habit {
  return {
    ...meta(id),
    name: id,
    kind: 'good',
    icon: 'target',
    color: '#2f7cf6',
    days: null,
    question: '',
    remindAt: '',
    areaId: null,
    startDate: '2026-10-01',
    measure: 'boolean',
    unit: 'count',
    target: 1,
    placeId: null,
    placeTrigger: null,
    archivedAt: null,
    ...over,
  };
}

function check(habitId: string, date: string, value = 1): HabitCheck {
  return { ...meta(checkId(habitId, date), 5), habitId, date, value };
}

function area(id: string, color: string): Area {
  return { ...meta(id), name: id, color, icon: 'target' };
}

function snap(parts: {
  tasks?: Task[];
  habits?: Habit[];
  checks?: HabitCheck[];
  areas?: Area[];
  reviews?: string[];
}): Snapshot {
  const s = emptySnapshot('2026-10-01');
  for (const t of parts.tasks ?? []) s.tasks[t.id] = t;
  for (const h of parts.habits ?? []) s.habits[h.id] = h;
  for (const c of parts.checks ?? []) s.checks[c.id] = c;
  for (const a of parts.areas ?? []) s.areas[a.id] = a;
  for (const d of parts.reviews ?? []) s.reviews[d] = { ...meta(d), date: d, mood: 3, note: '' };
  return s;
}

describe('виджет «Сегодня»', () => {
  test('пустой день', () => {
    const m = todayWidgetModel(snap({}), TODAY);
    expect(m).toMatchObject({ state: 'empty', done: 0, total: 0, rest: 0, phase: 0, rows: [] });
  });

  test('счёт, фаза и номер дня', () => {
    const m = todayWidgetModel(
      snap({
        tasks: [task('a', { doneOn: TODAY, doneAt: 10 }), task('b'), task('c')],
        habits: [habit('h')],
        checks: [check('h', TODAY)],
      }),
      TODAY
    );
    expect(m.done).toBe(2);
    expect(m.total).toBe(4);
    expect(m.rest).toBe(2);
    expect(m.phase).toBe(0.5);
    expect(m.state).toBe('progress');
    expect(m.number).toBe(47); // 1 октября → 16 ноября
    expect(m.rows.map((r) => r.id)).toEqual(['b', 'c']);
  });

  test('«ближайшие»: долг, затем начатое, затем по времени, затем остальное', () => {
    const s = snap({
      tasks: [
        task('plain'),
        task('late', { remindAt: '19:00', createdAt: 2 }),
        task('early', { remindAt: '08:30', createdAt: 3 }),
        task('debt', { date: '2026-11-10', createdAt: 4 }),
      ],
      habits: [habit('pushups', { measure: 'numeric', target: 100 })],
      checks: [check('pushups', TODAY, 60)],
    });
    const ids = todayWidgetModel(s, TODAY).rows.map((r) => r.id);
    expect(ids).toEqual(['debt', 'pushups', 'early', 'late', 'plain']);
  });

  test('справа: долг, числовая, время, серия', () => {
    const s = snap({
      tasks: [
        task('debt', { date: '2026-11-10' }),
        task('gym', { remindAt: '19:00' }),
        task('free'),
      ],
      habits: [
        habit('pushups', { measure: 'numeric', target: 100 }),
        habit('read', { startDate: '2026-11-06' }),
      ],
      checks: [
        check('pushups', TODAY, 60),
        ...['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10'].map((d) =>
          check('read', d)
        ),
        ...['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'].map((d) =>
          check('read', d)
        ),
      ],
    });
    const byId = Object.fromEntries(todayWidgetModel(s, TODAY).rows.map((r) => [r.id, r.meta]));
    expect(byId.debt).toEqual({ kind: 'debt' });
    expect(byId.pushups).toEqual({ kind: 'numeric', value: 60, target: 100 });
    expect(byId.gym).toEqual({ kind: 'time', time: '19:00' });
    expect(byId.free).toEqual({ kind: 'none' });
    expect(byId.read).toEqual({ kind: 'streak', days: 10 });
  });

  test('цвет: сфера у дела, цвет сферы у привычки в сфере, мусор из импорта отбрасывается', () => {
    const s = snap({
      areas: [area('sport', '#1fb876'), area('bad', 'red')],
      tasks: [
        task('t1', { areaId: 'sport' }),
        task('t2', { areaId: 'bad' }),
        task('t3'),
        task('t4', { areaId: 'gone' }),
      ],
      habits: [habit('h1', { areaId: 'sport', color: '#ef4444' }), habit('h2')],
    });
    const color = Object.fromEntries(todayWidgetModel(s, TODAY).rows.map((r) => [r.id, r.color]));
    expect(color).toEqual({
      t1: '#1fb876',
      t2: null,
      t3: null,
      t4: null,
      h1: '#1fb876',
      h2: '#2f7cf6',
    });
  });

  test('всё сделано — можно закрыть день; бонус — закрытие и полнолуние', () => {
    const s = snap({ tasks: [task('a', { doneOn: TODAY, doneAt: 10 })] });
    const m = todayWidgetModel(s, TODAY);
    expect(m.state).toBe('ready');
    expect(m.rows).toEqual([]);
    expect(m.closeBonus).toBe(POINTS.closedDay + POINTS.fullMoon);
  });

  test('не всё сделано — бонус только за закрытие', () => {
    const m = todayWidgetModel(snap({ tasks: [task('a')] }), TODAY);
    expect(m.closeBonus).toBe(POINTS.closedDay);
  });

  test('день закрыт итогом; серия считает и сегодня', () => {
    const s = snap({
      tasks: [task('a', { doneOn: TODAY, doneAt: 10 })],
      reviews: ['2026-11-14', '2026-11-15', TODAY],
    });
    const m = todayWidgetModel(s, TODAY);
    expect(m.state).toBe('closed');
    expect(m.streak).toBe(3);
  });

  test('серия не рвётся незакрытым сегодняшним днём', () => {
    const s = snap({ tasks: [task('a')], reviews: ['2026-11-14', '2026-11-15'] });
    expect(todayWidgetModel(s, TODAY).streak).toBe(2);
  });

  test('вредная привычка без срыва не остаётся в «ближайших»', () => {
    const s = snap({ habits: [habit('smoke', { kind: 'bad' })] });
    const m = todayWidgetModel(s, TODAY);
    expect(m.rows).toEqual([]);
    expect(m.done).toBe(1);
    expect(m.state).toBe('ready');
  });
});
