/**
 * Календарь дел: сетка недели, месяца и года, дела и сроки целей по дням, «плашки» дня.
 * Только расчёты — рисует `features/tasks/TaskCalendar.tsx`.
 */
import { addDays, addMonths, startOfMonth, startOfWeek } from './dates';
import { live, type Goal, type ISODate, type Snapshot, type Task } from './model';
import { compareTasks } from './tasks';

export type CalView = 'week' | 'month' | 'year';

export type DayEntry = { tasks: Task[]; goals: Goal[] };

const EMPTY: DayEntry = { tasks: [], goals: [] };

/** Дела и сроки целей по датам. `areaId` — только эта сфера; null — все. */
export function indexByDay(
  snap: Pick<Snapshot, 'tasks' | 'goals'>,
  areaId: string | null
): Map<ISODate, DayEntry> {
  const map = new Map<ISODate, DayEntry>();
  const at = (d: ISODate) => {
    let e = map.get(d);
    if (!e) {
      e = { tasks: [], goals: [] };
      map.set(d, e);
    }
    return e;
  };
  for (const t of live(snap.tasks)) {
    if (t.date === null) continue;
    if (areaId !== null && t.areaId !== areaId) continue;
    at(t.date).tasks.push(t);
  }
  for (const g of live(snap.goals)) {
    if (g.deadline === null) continue;
    if (areaId !== null && g.areaId !== areaId) continue;
    at(g.deadline).goals.push(g);
  }
  for (const e of map.values()) e.tasks.sort(compareTasks);
  return map;
}

export function entryOf(index: Map<ISODate, DayEntry>, d: ISODate): DayEntry {
  return index.get(d) ?? EMPTY;
}

export type MonthCell = { date: ISODate; inMonth: boolean };

/** Сетка месяца: шесть недель по семь дней, начиная с `weekStart`; дни соседних месяцев — `inMonth: false`. */
export function monthGrid(cursor: ISODate, weekStart: 0 | 1): MonthCell[] {
  const first = startOfMonth(cursor);
  const from = startOfWeek(first, weekStart);
  const out: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(from, i);
    out.push({ date, inMonth: date.slice(0, 7) === first.slice(0, 7) });
  }
  return out;
}

/** Семь дней недели, в которую входит `cursor`. */
export function weekDays(cursor: ISODate, weekStart: 0 | 1): ISODate[] {
  const from = startOfWeek(cursor, weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(from, i));
}

export type YearMonth = {
  /** 0 = январь … 11 = декабрь */
  month: number;
  /** первое число */
  first: ISODate;
  /** сколько пустых клеток перед первым числом */
  offset: number;
  days: ISODate[];
};

/** Двенадцать месяцев года `cursor`: для обзора «точками». */
export function yearMonths(cursor: ISODate, weekStart: 0 | 1): YearMonth[] {
  const year = cursor.slice(0, 4);
  return Array.from({ length: 12 }, (_, month) => {
    const first = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const next = addMonths(first, 1);
    const days: ISODate[] = [];
    for (let d = first; d < next; d = addDays(d, 1)) days.push(d);
    const offset = days.length
      ? (new Date(`${first}T12:00:00Z`).getUTCDay() - weekStart + 7) % 7
      : 0;
    return { month, first, offset, days };
  });
}

/** Курсор после нажатия «назад» (−1) или «вперёд» (+1) в выбранном виде. */
export function shiftCursor(cursor: ISODate, view: CalView, dir: 1 | -1): ISODate {
  if (view === 'week') return addDays(cursor, 7 * dir);
  if (view === 'month') return addMonths(cursor, dir);
  return addMonths(cursor, 12 * dir);
}

export type BarKind = 'open' | 'done' | 'debt';

/**
 * Плашки дня: по одной на дело, открытые важные выше, выполненные в конце.
 * `debt` — открытое дело прошедшего дня.
 */
export function dayBars(tasks: Task[], today: ISODate): BarKind[] {
  return tasks.map((t) =>
    t.doneOn !== null ? 'done' : t.date !== null && t.date < today ? 'debt' : 'open'
  );
}
