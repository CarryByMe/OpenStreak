/**
 * Модель виджета «Сегодня»: что показать на экране телефона — счёт дня, ближайшие строки,
 * готовность закрыть день. Чистая функция от данных: тексты, цвета и раскладка — в `widgets/`.
 */
import { habitColor } from './colors';
import { closedStreak, dayNumber, dayView, isClosed, type DayItem } from './day';
import { dataOf, habitStats, indexHabits, liveCheck } from './habits';
import type { ISODate, Snapshot } from './model';
import { POINTS } from './points';

/** Что стоит справа в строке: долг, «60/100», время напоминания или серия. */
export type WidgetMeta =
  | { kind: 'none' }
  | { kind: 'debt' }
  | { kind: 'numeric'; value: number; target: number }
  | { kind: 'time'; time: string }
  | { kind: 'streak'; days: number };

export type WidgetRow = {
  id: string;
  kind: 'task' | 'habit';
  title: string;
  /** доля выполнения 0…1: у числовой привычки в процессе — между 0 и 1 */
  fraction: number;
  debt: boolean;
  /** вредная привычка */
  bad: boolean;
  /** цвет сферы или привычки `#RRGGBB`; null — цвет по умолчанию (акцент) */
  color: string | null;
  meta: WidgetMeta;
};

/**
 * - `empty` — на сегодня ничего нет;
 * - `progress` — есть что делать;
 * - `ready` — всё сделано, день ещё не закрыт: можно подвести итог;
 * - `closed` — день закрыт итогом.
 */
export type WidgetState = 'empty' | 'progress' | 'ready' | 'closed';

export type TodayWidgetModel = {
  date: ISODate;
  /** номер дня с первого запуска */
  number: number;
  /** серия закрытых дней */
  streak: number;
  done: number;
  total: number;
  /** сколько осталось */
  rest: number;
  /** фаза луны дня 0…1 */
  phase: number;
  state: WidgetState;
  /** сколько очков принесёт закрытие дня — для подписи «Закрой день — заберёшь +N» */
  closeBonus: number;
  /** «Осталось»: долг первым, затем начатые, затем по времени, затем остальное */
  rows: WidgetRow[];
};

type Data = Pick<
  Snapshot,
  'tasks' | 'habits' | 'checks' | 'rests' | 'areas' | 'reviews' | 'profile'
>;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Цвет из данных (могли прийти из импорта) — только `#RRGGBB`, иначе null. */
function safeColor(c: string | null | undefined): string | null {
  return c && HEX.test(c) ? c : null;
}

function rowOf(
  snap: Data,
  item: DayItem,
  today: ISODate,
  idx: ReturnType<typeof indexHabits>
): WidgetRow | null {
  if (item.kind === 'task') {
    const task = snap.tasks[item.id];
    if (!task) return null;
    const area = task.areaId ? snap.areas[task.areaId] : undefined;
    const meta: WidgetMeta = item.debt
      ? { kind: 'debt' }
      : task.remindAt
        ? { kind: 'time', time: task.remindAt }
        : { kind: 'none' };
    return {
      id: item.id,
      kind: 'task',
      title: item.title,
      fraction: item.fraction,
      debt: item.debt,
      bad: false,
      color: area && area.deletedAt === null ? safeColor(area.color) : null,
      meta,
    };
  }
  const habit = snap.habits[item.id];
  if (!habit) return null;
  const streak = habitStats(habit, dataOf(idx, habit.id), today).streak;
  let meta: WidgetMeta = { kind: 'none' };
  if (habit.measure === 'numeric') {
    meta = {
      kind: 'numeric',
      value: liveCheck(snap, habit.id, today)?.value ?? 0,
      target: habit.target,
    };
  } else if (habit.remindAt) {
    meta = { kind: 'time', time: habit.remindAt };
  } else if (streak > 0) {
    meta = { kind: 'streak', days: streak };
  }
  return {
    id: item.id,
    kind: 'habit',
    title: item.title,
    fraction: item.fraction,
    debt: false,
    bad: item.bad,
    color: safeColor(habitColor(habit, snap.areas)),
    meta,
  };
}

/** Порядок «ближайших»: долг, начатое, дела со временем (раньше — выше), остальное как в дне. */
function rank(row: WidgetRow): [number, string] {
  if (row.debt) return [0, ''];
  if (row.fraction > 0) return [1, ''];
  if (row.meta.kind === 'time') return [2, row.meta.time];
  return [3, ''];
}

export function todayWidgetModel(snap: Data, today: ISODate): TodayWidgetModel {
  const idx = indexHabits(snap);
  const day = dayView(snap, today, today, idx);
  const rows = day.left
    .map((item) => rowOf(snap, item, today, idx))
    .filter((r): r is WidgetRow => r !== null)
    // sort устойчивый: внутри группы остаётся порядок дня
    .sort((a, b) => {
      const [ga, ta] = rank(a);
      const [gb, tb] = rank(b);
      return ga - gb || (ta < tb ? -1 : ta > tb ? 1 : 0);
    });

  const closed = isClosed(snap, today);
  const rest = day.total - day.done;
  const state: WidgetState =
    day.total === 0 ? 'empty' : closed ? 'closed' : rest === 0 ? 'ready' : 'progress';

  return {
    date: today,
    number: dayNumber(snap.profile.startedAt, today),
    streak: closedStreak(snap, today),
    done: day.done,
    total: day.total,
    rest,
    phase: day.phase,
    state,
    closeBonus: POINTS.closedDay + (day.total > 0 && rest === 0 ? POINTS.fullMoon : 0),
    rows,
  };
}
