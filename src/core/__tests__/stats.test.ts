import { describe, expect, test } from '@jest/globals';
import { addDays, daysBetween } from '../dates';
import {
  checkId,
  emptySnapshot,
  type Area,
  type Habit,
  type ISODate,
  type RecordMeta,
  type Snapshot,
  type Task,
} from '../model';
import {
  areasReport,
  elapsed,
  habitYear,
  habitsReport,
  moodReport,
  overview,
  periodOf,
  previousSpan,
  shiftPeriod,
  tasksReport,
  yearSummary,
} from '../stats';

// Четверг, 19 ноября 2026.
const TODAY = '2026-11-19';
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

const habit = (id: string, over: Partial<Habit> = {}): Habit => ({
  ...meta(id),
  name: id,
  kind: 'good',
  icon: 'target',
  color: '#2f7cf6',
  days: null,
  question: '',
  remindAt: '',
  areaId: null,
  startDate: '2026-01-01',
  measure: 'boolean',
  unit: 'count',
  target: 1,
  placeId: null,
  placeTrigger: null,
  archivedAt: null,
  ...over,
});

function snap(): Snapshot {
  return emptySnapshot('2026-01-01');
}
function add(s: Snapshot, h: Habit) {
  s.habits[h.id] = h;
}
function mark(s: Snapshot, habitId: string, date: ISODate, value = 1, slip = false) {
  const id = checkId(habitId, date);
  s.checks[id] = { ...meta(id), habitId, date, value, ...(slip ? { slip } : {}) };
}
function put(s: Snapshot, t: Task) {
  s.tasks[t.id] = t;
}

describe('периоды', () => {
  test('неделя, месяц, год', () => {
    expect(periodOf('week', TODAY, 1)).toEqual({
      kind: 'week',
      from: '2026-11-16',
      to: '2026-11-22',
    });
    expect(periodOf('month', TODAY, 1)).toEqual({
      kind: 'month',
      from: '2026-11-01',
      to: '2026-11-30',
    });
    expect(periodOf('year', TODAY, 1)).toEqual({
      kind: 'year',
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });

  test('сдвиг: месяц в феврале — до 28-го', () => {
    const p = shiftPeriod(periodOf('month', '2026-03-31', 1), -1, 1);
    expect(p).toEqual({ kind: 'month', from: '2026-02-01', to: '2026-02-28' });
  });

  test('прошлый период — той же прошедшей длины', () => {
    const p = periodOf('month', TODAY, 1);
    expect(elapsed(p, TODAY)).toEqual({ from: '2026-11-01', to: TODAY });
    expect(previousSpan(p, TODAY, 1)).toEqual({ from: '2026-10-01', to: '2026-10-19' });
    // прошедший целиком месяц сравнивается с целым прошлым (обрезка по его концу)
    const oct = periodOf('month', '2026-10-05', 1);
    expect(previousSpan(oct, TODAY, 1)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(elapsed(periodOf('month', '2026-12-01', 1), TODAY)).toBeNull();
  });
});

describe('обзор', () => {
  test('доля сделанного: дела дня и привычки по плану, сегодняшнее нерешённое не в счёт', () => {
    const s = snap();
    add(s, habit('вода', { startDate: '2026-11-16' }));
    // пн–ср: привычка выполнена 2 раза из 3
    mark(s, 'вода', '2026-11-16');
    mark(s, 'вода', '2026-11-18');
    // дела: два на вторник, одно сделано
    put(s, task('a', { date: '2026-11-17', doneOn: '2026-11-17' }));
    put(s, task('b', { date: '2026-11-17' }));
    // сегодня: открытое дело и не отмеченная привычка — не считаются
    put(s, task('c', { date: TODAY }));
    const o = overview(s, periodOf('week', TODAY, 1), TODAY);
    // запланировано 3 + 2 = 5, сделано 2 + 1 = 3
    expect(o.rate.value).toBeCloseTo(3 / 5);
    expect(o.tasksDone.value).toBe(1);
    expect(o.habitMarks.value).toBe(2);
    // столбик сегодня — со всем на сегодня: 0 из 2
    const todayBar = o.buckets.find((b) => b.from === TODAY)!;
    expect(todayBar).toMatchObject({ planned: 2, done: 0, rate: 0 });
    // будущие дни пустые
    expect(o.buckets[6]).toMatchObject({ from: '2026-11-22', rate: null });
  });

  test('сегодняшний незаконченный день — не в лучшем и худшем дне недели', () => {
    const s = snap();
    add(s, habit('вода', { startDate: '2026-11-01' }));
    // все прошлые дни — ничего, сегодня (чт) — сделано: сегодня не должно стать «лучшим днём»
    mark(s, 'вода', TODAY);
    const o = overview(s, periodOf('month', TODAY, 1), TODAY);
    expect(o.bestWeekday).toBeNull();
  });

  test('до начала пользования сравнивать не с чем', () => {
    const s = snap();
    s.profile.startedAt = '2026-11-03';
    put(s, task('a', { doneOn: '2026-11-04' }));
    const o = overview(s, periodOf('month', TODAY, 1), TODAY);
    expect(o.tasksDone).toEqual({ value: 1, prev: null });
    expect(yearSummary(s, 2026, TODAY).total.prev).toBeNull();
  });

  test('мало запланированного — процента нет', () => {
    const s = snap();
    put(s, task('a', { date: '2026-11-17', doneOn: '2026-11-17' }));
    expect(overview(s, periodOf('week', TODAY, 1), TODAY).rate.value).toBeNull();
  });

  test('сравнение с прошлым месяцем той же длины', () => {
    const s = snap();
    for (const d of ['2026-10-02', '2026-10-10', '2026-10-25']) put(s, task(d, { doneOn: d }));
    for (const d of ['2026-11-02', '2026-11-03']) put(s, task(d, { doneOn: d }));
    const o = overview(s, periodOf('month', TODAY, 1), TODAY);
    expect(o.tasksDone).toEqual({ value: 2, prev: 2 });
  });

  test('год — по месяцам', () => {
    const s = snap();
    add(s, habit('вода'));
    mark(s, 'вода', '2026-03-05');
    const o = overview(s, periodOf('year', TODAY, 1), TODAY);
    expect(o.buckets).toHaveLength(12);
    expect(o.buckets[2].done).toBe(1);
    expect(o.buckets[11].rate).toBeNull();
  });

  test('лучший и худший день недели, лучшая серия', () => {
    const s = snap();
    add(s, habit('спорт', { startDate: '2026-11-01' }));
    for (const d of daysBetween('2026-11-01', '2026-11-18')) {
      // по субботам (6) не делает
      if (new Date(`${d}T00:00`).getDay() !== 6) mark(s, 'спорт', d);
    }
    const o = overview(s, periodOf('month', TODAY, 1), TODAY);
    expect(o.worstWeekday).toEqual({ day: 6, rate: 0 });
    expect(o.bestWeekday?.rate).toBe(1);
    // субботы рвут серию: вс–пт — 6 дней
    expect(o.bestRun).toMatchObject({ days: 6 });
  });
});

describe('привычки', () => {
  test('по каждой: выполнение, срывы, серия', () => {
    const s = snap();
    add(s, habit('вода', { startDate: '2026-11-16' }));
    add(s, habit('сладкое', { kind: 'bad', startDate: '2026-11-16' }));
    mark(s, 'вода', '2026-11-16');
    mark(s, 'вода', '2026-11-17');
    mark(s, 'сладкое', '2026-11-17');
    const r = habitsReport(s, periodOf('week', TODAY, 1), TODAY);
    const water = r.rows.find((x) => x.habit.id === 'вода')!;
    expect(water).toMatchObject({ required: 3, done: 2, streak: 0 });
    const sweet = r.rows.find((x) => x.habit.id === 'сладкое')!;
    // вредная: пн чистый, вт срыв, ср чистый, сегодня чистый (решён)
    expect(sweet).toMatchObject({ slips: 1, done: 3, required: 4, streak: 2 });
    expect(r.marks.map((m) => m.count)).toEqual([1, 1, 0, 0, 0, 0, 0]);
  });

  test('месяц — отметки по неделям', () => {
    const s = snap();
    add(s, habit('вода'));
    mark(s, 'вода', '2026-11-01');
    mark(s, 'вода', '2026-11-02');
    const r = habitsReport(s, periodOf('month', TODAY, 1), TODAY);
    // 1 ноября — воскресенье: отдельная неделя
    expect(r.marks.slice(0, 2)).toEqual([
      { from: '2026-11-01', count: 1 },
      { from: '2026-11-02', count: 1 },
    ]);
  });
});

describe('привычка за год', () => {
  test('клетки, серия, слабый день и месяцы', () => {
    const s = snap();
    add(s, habit('вода', { measure: 'numeric', target: 8, startDate: '2026-10-01' }));
    for (const d of daysBetween('2026-10-01', '2026-11-18')) {
      const sat = new Date(`${d}T00:00`).getDay() === 6;
      mark(s, 'вода', d, sat ? 3 : d === '2026-11-18' ? 12 : 8);
    }
    const y = habitYear(s, 'вода', 2026, TODAY)!;
    expect(y.cells).toHaveLength(365);
    const cell = (d: ISODate) => y.cells.find((c) => c.date === d)!.level;
    expect(cell('2026-09-30')).toBeNull();
    expect(cell('2026-11-18')).toBe(4);
    expect(cell('2026-11-17')).toBe(3);
    expect(cell('2026-11-14')).toBe(1);
    expect(cell(TODAY)).toBe(0);
    expect(y.streak).toBe(4);
    expect(y.weakDay?.day).toBe(6);
    expect(y.months[8]).toBeNull();
    expect(y.months[10]).toBeGreaterThan(0.7);
  });
});

describe('дела', () => {
  test('вовремя, задержка, по часам, по приоритету, висящие', () => {
    const s = snap();
    const at = (d: ISODate, h: number) =>
      new Date(`${d}T${String(h).padStart(2, '0')}:15:00`).getTime();
    put(
      s,
      task('a', {
        date: '2026-11-02',
        doneOn: '2026-11-02',
        doneAt: at('2026-11-02', 10),
        priority: 3,
      })
    );
    put(
      s,
      task('b', {
        date: '2026-11-02',
        doneOn: '2026-11-05',
        doneAt: at('2026-11-05', 20),
        priority: 3,
      })
    );
    put(s, task('c', { date: '2026-11-03', doneOn: '2026-11-03', doneAt: at('2026-11-03', 10) }));
    put(s, task('d', { date: '2026-11-04', doneOn: '2026-11-04', doneAt: at('2026-11-04', 21) }));
    put(s, task('e', { date: '2026-11-06', doneOn: '2026-11-07', doneAt: at('2026-11-07', 10) }));
    put(s, task('f', { date: '2026-11-05', priority: 3 }));
    const r = tasksReport(s, periodOf('month', TODAY, 1), TODAY);
    expect(r.done.value).toBe(5);
    expect(r.onTime.value).toBeCloseTo(3 / 5);
    expect(r.avgDelay.value).toBe(2);
    expect(r.byHour[10]).toBe(3);
    expect(r.byHour[20]).toBe(1);
    expect(r.byPriority[0]).toEqual({ priority: 3, done: 2, total: 3 });
    expect(r.stale).toBe(1);
  });
});

describe('сферы и настроение', () => {
  test('куда ушли силы: дела и отметки привычек сферы', () => {
    const s = snap();
    const area = (id: string): Area => ({ ...meta(id), name: id, color: '#2f7cf6', icon: 'book' });
    s.areas['учёба'] = area('учёба');
    s.areas['дом'] = { ...area('дом'), createdAt: 2 };
    add(s, habit('чтение', { areaId: 'учёба' }));
    mark(s, 'чтение', '2026-11-17');
    mark(s, 'чтение', '2026-11-18');
    put(s, task('a', { areaId: 'учёба', doneOn: '2026-11-17' }));
    put(s, task('b', { areaId: 'дом', doneOn: '2026-11-17' }));
    put(s, task('c', { areaId: 'дом', date: '2026-11-10' }));
    const rows = areasReport(s, periodOf('week', TODAY, 1), TODAY);
    expect(rows.map((r) => [r.area.id, r.count, r.debts])).toEqual([
      ['учёба', 3, 0],
      ['дом', 1, 1],
    ]);
    expect(rows[0].share).toBeCloseTo(0.75);
  });

  test('настроение и дела', () => {
    const s = snap();
    const review = (date: ISODate, mood: number) =>
      (s.reviews[date] = { ...meta(date), date, mood, note: '' });
    review('2026-11-16', 5);
    review('2026-11-17', 5);
    review('2026-11-18', 2);
    put(s, task('a', { doneOn: '2026-11-16' }));
    put(s, task('b', { doneOn: '2026-11-16' }));
    put(s, task('c', { doneOn: '2026-11-17' }));
    const m = moodReport(s, periodOf('week', TODAY, 1), TODAY);
    expect(m.byMood[4]).toEqual({ mood: 5, days: 2, avgDone: 1.5 });
    expect(m.byMood[1]).toEqual({ mood: 2, days: 1, avgDone: 0 });
    expect(m.byMood[0].avgDone).toBeNull();
    expect(m.series.map((x) => x.mood)).toEqual([5, 5, 2, null, null, null, null]);
  });
});

describe('итоги года', () => {
  test('всего, лучший месяц, серия, цели, время', () => {
    const s = snap();
    add(
      s,
      habit('зал', { measure: 'numeric', unit: 'minutes', target: 60, startDate: '2026-11-01' })
    );
    for (const d of daysBetween('2026-11-01', '2026-11-18')) mark(s, 'зал', d, 60);
    put(s, task('a', { doneOn: '2026-03-01' }));
    s.goals['g'] = {
      ...meta('g'),
      areaId: null,
      text: 'Сдать сессию',
      criterion: '',
      reward: '',
      penalty: '',
      deadline: '2026-12-31',
      doneOn: '2026-11-10',
    };
    put(s, task('old', { doneOn: '2025-05-01' }));
    s.profile.startedAt = '2025-01-01';
    const y = yearSummary(s, 2026, TODAY);
    expect(y.total).toEqual({ value: 19, prev: 1 });
    expect(y.bestMonth).toEqual({ month: 10, rate: 1 });
    expect(y.longest).toMatchObject({ days: 18 });
    expect(y.goals).toEqual({ done: 1, total: 1, example: 'Сдать сессию' });
    expect(y.timeHabit).toMatchObject({ minutes: 18 * 60, days: 18 });
    expect(y.lessons).toEqual({ count: 0, minutes: 0 });
  });

  test('пустой год', () => {
    const y = yearSummary(snap(), 2026, TODAY);
    expect(y.total.value).toBe(0);
    expect(y.bestMonth).toBeNull();
    expect(y.months.every((m) => m === null)).toBe(true);
    expect(addDays(TODAY, 0)).toBe(TODAY);
  });
});
