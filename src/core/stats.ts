/**
 * «Итоги» — подробная статистика за неделю, месяц и год (design/stats). Чистые функции над снимком:
 * экраны только рисуют результат.
 *
 * «Запланированное» дня — дела, назначенные на этот день, и привычки, которые в этот день по плану
 * (выходные, дни не по плану и дни до начала привычки не считаются). «Сделано» — дело выполнено
 * (в любой день), полезная привычка — до нормы, вредная — без срыва.
 *
 * Сравнение с прошлым периодом — за столько же дней от его начала: 1–19 ноября против 1–19 октября.
 */
import {
  addDays,
  addMonths,
  daysBetween,
  diffDays,
  dstr,
  startOfMonth,
  startOfWeek,
  weekday,
} from './dates';
import { activeHabits, dataOf, habitDay, indexHabits, type HabitData } from './habits';
import { live, type Area, type Habit, type ISODate, type Priority, type Snapshot } from './model';
import { lessonOn, lessonTime, minutesOf } from './schedule';
import { settingsOf } from './settings';

export type PeriodKind = 'week' | 'month' | 'year';
export type Period = { kind: PeriodKind; from: ISODate; to: ISODate };

/** Меньше стольких запланированных за период — вместо процента «копим данные». */
export const MIN_PLANNED = 5;

// ── Периоды ──────────────────────────────────────────────────────────────────

export function periodOf(kind: PeriodKind, anchor: ISODate, weekStart: 0 | 1): Period {
  if (kind === 'week') {
    const from = startOfWeek(anchor, weekStart);
    return { kind, from, to: addDays(from, 6) };
  }
  if (kind === 'month') {
    const from = startOfMonth(anchor);
    return { kind, from, to: addDays(addMonths(from, 1), -1) };
  }
  const y = anchor.slice(0, 4);
  return { kind, from: `${y}-01-01`, to: `${y}-12-31` };
}

/** Соседний период: -1 — прошлый, 1 — следующий. */
export function shiftPeriod(p: Period, dir: 1 | -1, weekStart: 0 | 1): Period {
  if (p.kind === 'week') return periodOf('week', addDays(p.from, 7 * dir), weekStart);
  if (p.kind === 'month') return periodOf('month', addMonths(p.from, dir), weekStart);
  return periodOf('year', `${Number(p.from.slice(0, 4)) + dir}-01-01`, weekStart);
}

/** Прошедшая часть периода (до сегодня включительно); null — период ещё не начался. */
export function elapsed(p: Period, today: ISODate): { from: ISODate; to: ISODate } | null {
  if (p.from > today) return null;
  return { from: p.from, to: p.to < today ? p.to : today };
}

/**
 * Прошлый период той же прошедшей длины — для честного сравнения незаконченного периода.
 * Если он закончился до `startedAt` (приложением ещё не пользовались) — null: сравнивать не с чем.
 */
export function previousSpan(
  p: Period,
  today: ISODate,
  weekStart: 0 | 1,
  startedAt?: ISODate
): { from: ISODate; to: ISODate } | null {
  const cur = elapsed(p, today);
  if (!cur) return null;
  if (startedAt && shiftPeriod(p, -1, weekStart).to < startedAt) return null;
  const prev = shiftPeriod(p, -1, weekStart);
  const to = addDays(prev.from, diffDays(cur.from, cur.to));
  return { from: prev.from, to: to < prev.to ? to : prev.to };
}

// ── День: запланировано и сделано ────────────────────────────────────────────

type Ctx = {
  snap: Snapshot;
  today: ISODate;
  habits: Habit[];
  idx: Map<string, HabitData>;
  /** дела по дню, на который назначены */
  tasksByDate: Map<ISODate, { done: boolean; priority: Priority; areaId: string | null }[]>;
  /** сделанные дела по дню выполнения */
  doneByDate: Map<ISODate, { areaId: string | null; at: number | null }[]>;
};

function context(snap: Snapshot, today: ISODate): Ctx {
  const tasksByDate: Ctx['tasksByDate'] = new Map();
  const doneByDate: Ctx['doneByDate'] = new Map();
  for (const t of live(snap.tasks)) {
    if (t.date) {
      const list = tasksByDate.get(t.date) ?? [];
      list.push({ done: t.doneOn !== null, priority: t.priority, areaId: t.areaId });
      tasksByDate.set(t.date, list);
    }
    if (t.doneOn) {
      const list = doneByDate.get(t.doneOn) ?? [];
      list.push({ areaId: t.areaId, at: t.doneAt });
      doneByDate.set(t.doneOn, list);
    }
  }
  return {
    snap,
    today,
    habits: activeHabits(snap),
    idx: indexHabits(snap),
    tasksByDate,
    doneByDate,
  };
}

const REQUIRED = new Set(['full', 'partial', 'slip', 'empty']);

/**
 * Запланировано и сделано за день. Сегодняшнее ещё не решённое (открытое дело, не отмеченная
 * привычка) в итоги периода не входит — иначе процент падал бы каждое утро; в столбик дня — входит.
 */
function dayScore(ctx: Ctx, date: ISODate, withPending = false): { planned: number; done: number } {
  const open = withPending || date !== ctx.today;
  let planned = 0;
  let done = 0;
  for (const t of ctx.tasksByDate.get(date) ?? []) {
    if (!t.done && !open) continue;
    planned++;
    if (t.done) done++;
  }
  for (const h of ctx.habits) {
    const mark = habitDay(h, dataOf(ctx.idx, h.id), date, ctx.today).mark;
    if (!REQUIRED.has(mark)) continue;
    if (!open && mark !== 'full' && mark !== 'slip') continue;
    planned++;
    if (mark === 'full') done++;
  }
  return { planned, done };
}

function rateOver(
  ctx: Ctx,
  from: ISODate,
  to: ISODate,
  withPending = false
): { planned: number; done: number } {
  let planned = 0;
  let done = 0;
  for (const d of daysBetween(from, to)) {
    const s = dayScore(ctx, d, withPending);
    planned += s.planned;
    done += s.done;
  }
  return { planned, done };
}

const rate = (s: { planned: number; done: number }) =>
  s.planned >= MIN_PLANNED ? s.done / s.planned : null;

/** Отметок полезных привычек до нормы за дни. */
function habitMarks(ctx: Ctx, from: ISODate, to: ISODate): number {
  let n = 0;
  for (const h of ctx.habits) {
    if (h.kind !== 'good') continue;
    const data = dataOf(ctx.idx, h.id);
    for (const d of daysBetween(from, to)) if (habitDay(h, data, d, ctx.today).mark === 'full') n++;
  }
  return n;
}

function tasksDone(ctx: Ctx, from: ISODate, to: ISODate): number {
  let n = 0;
  for (const d of daysBetween(from, to)) n += ctx.doneByDate.get(d)?.length ?? 0;
  return n;
}

function moodAvg(snap: Snapshot, from: ISODate, to: ISODate): number | null {
  const moods = live(snap.reviews)
    .filter((r) => r.date >= from && r.date <= to)
    .map((r) => r.mood);
  return moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null;
}

/** Самая длинная серия привычки внутри дней (выходные и дни не по плану не рвут). */
function longestRun(h: Habit, data: HabitData, from: ISODate, to: ISODate, today: ISODate) {
  let run = 0;
  let best = 0;
  let bestEnd: ISODate | null = null;
  for (const d of daysBetween(from, to)) {
    const mark = habitDay(h, data, d, today).mark;
    if (mark === 'full') {
      run++;
      if (run > best) {
        best = run;
        bestEnd = d;
      }
    } else if (mark === 'slip' || ((mark === 'empty' || mark === 'partial') && d !== today)) {
      run = 0;
    }
  }
  return { best, end: bestEnd };
}

// ── Обзор ────────────────────────────────────────────────────────────────────

export type Bucket = {
  /** первый день: день, первый день недели или месяца */
  from: ISODate;
  to: ISODate;
  /** доля сделанного; null — мало запланированного или ещё не наступил */
  rate: number | null;
  planned: number;
  done: number;
};

/** Значение и прошлое; prev null — сравнивать не с чем (прошлый период — до начала пользования). */
export type Compare<T> = { value: T; prev: T | null };

export type Overview = {
  rate: Compare<number | null>;
  tasksDone: Compare<number>;
  habitMarks: Compare<number>;
  /** самая длинная серия привычки в периоде */
  bestRun: { habit: Habit; days: number } | null;
  mood: Compare<number | null>;
  /** по дням (неделя, месяц) или по месяцам (год) */
  buckets: Bucket[];
  /** лучший и худший день недели по доле сделанного (из прошедших дней) */
  bestWeekday: { day: number; rate: number } | null;
  worstWeekday: { day: number; rate: number } | null;
};

/** Ячейки графика: дни, а у года — месяцы. */
function buckets(ctx: Ctx, p: Period): Bucket[] {
  const spans: { from: ISODate; to: ISODate }[] =
    p.kind === 'year'
      ? Array.from({ length: 12 }, (_, i) => {
          const from = addMonths(p.from, i);
          return { from, to: addDays(addMonths(from, 1), -1) };
        })
      : daysBetween(p.from, p.to).map((d) => ({ from: d, to: d }));
  return spans.map(({ from, to }) => {
    if (from > ctx.today) return { from, to, rate: null, planned: 0, done: 0 };
    // Столбик сегодняшнего дня — со всем запланированным на сегодня.
    const s = rateOver(ctx, from, to < ctx.today ? to : ctx.today, from === to);
    return { from, to, ...s, rate: s.planned > 0 ? s.done / s.planned : null };
  });
}

/** Доля сделанного по дням недели (0 — вс) за дни; null — дней с планом нет. */
function weekdayRates(ctx: Ctx, from: ISODate, to: ISODate): (number | null)[] {
  const sum = Array.from({ length: 7 }, () => ({ planned: 0, done: 0 }));
  for (const d of daysBetween(from, to)) {
    // Сегодняшний день ещё не закончен — в сравнение дней недели не идёт.
    if (d === ctx.today) continue;
    const s = dayScore(ctx, d);
    const w = sum[weekday(d)];
    w.planned += s.planned;
    w.done += s.done;
  }
  return sum.map((w) => (w.planned > 0 ? w.done / w.planned : null));
}

export function overview(snap: Snapshot, p: Period, today: ISODate): Overview {
  const ctx = context(snap, today);
  const { weekStart } = settingsOf(snap);
  const cur = elapsed(p, today);
  const prev = previousSpan(p, today, weekStart, snap.profile.startedAt);
  const sum = (span: { from: ISODate; to: ISODate } | null) =>
    span ? rateOver(ctx, span.from, span.to) : { planned: 0, done: 0 };
  const count = (fn: (c: Ctx, f: ISODate, t: ISODate) => number, span: typeof cur) =>
    span ? fn(ctx, span.from, span.to) : null;

  let bestRun: Overview['bestRun'] = null;
  if (cur) {
    for (const h of ctx.habits) {
      const r = longestRun(h, dataOf(ctx.idx, h.id), cur.from, cur.to, today);
      if (r.best > 0 && (!bestRun || r.best > bestRun.days)) bestRun = { habit: h, days: r.best };
    }
  }

  // Лучший и худший день недели — только если есть из чего выбрать (хотя бы 4 дня с планом).
  let bestWeekday: Overview['bestWeekday'] = null;
  let worstWeekday: Overview['worstWeekday'] = null;
  if (cur) {
    const rates = weekdayRates(ctx, cur.from, cur.to)
      .map((r, day) => ({ day, rate: r }))
      .filter((x): x is { day: number; rate: number } => x.rate !== null);
    if (rates.length >= 4) {
      const sorted = [...rates].sort((a, b) => b.rate - a.rate);
      if (sorted[0].rate > sorted[sorted.length - 1].rate) {
        bestWeekday = sorted[0];
        worstWeekday = sorted[sorted.length - 1];
      }
    }
  }

  return {
    rate: { value: rate(sum(cur)), prev: rate(sum(prev)) },
    tasksDone: { value: count(tasksDone, cur) ?? 0, prev: count(tasksDone, prev) },
    habitMarks: { value: count(habitMarks, cur) ?? 0, prev: count(habitMarks, prev) },
    bestRun,
    mood: {
      value: cur ? moodAvg(snap, cur.from, cur.to) : null,
      prev: prev ? moodAvg(snap, prev.from, prev.to) : null,
    },
    buckets: buckets(ctx, p),
    bestWeekday,
    worstWeekday,
  };
}

// ── Привычки ─────────────────────────────────────────────────────────────────

export type HabitRow = {
  habit: Habit;
  /** доля дней по плану, выполненных до нормы (у вредной — без срыва); null — дней по плану нет */
  rate: number | null;
  /** дней по плану в периоде */
  required: number;
  done: number;
  slips: number;
  /** сколько сделано в единицах привычки */
  total: number;
  /** серия на сегодня (только если период включает сегодня) */
  streak: number | null;
};

export type HabitsReport = {
  rows: HabitRow[];
  /** доля по дням недели (0 — вс) по всем привычкам */
  byWeekday: (number | null)[];
  /** отметок полезных привычек: по дням (неделя), по неделям (месяц), по месяцам (год) */
  marks: { from: ISODate; count: number }[];
};

function currentStreak(h: Habit, data: HabitData, today: ISODate): number {
  let run = 0;
  for (let d = today; d >= h.startDate; d = addDays(d, -1)) {
    const mark = habitDay(h, data, d, today).mark;
    if (mark === 'full') run++;
    else if (mark === 'slip' || ((mark === 'empty' || mark === 'partial') && d !== today)) break;
  }
  return run;
}

export function habitsReport(snap: Snapshot, p: Period, today: ISODate): HabitsReport {
  const ctx = context(snap, today);
  const { weekStart } = settingsOf(snap);
  const cur = elapsed(p, today);
  const rows: HabitRow[] = ctx.habits.map((habit) => {
    const data = dataOf(ctx.idx, habit.id);
    let required = 0;
    let done = 0;
    let slips = 0;
    let total = 0;
    if (cur) {
      for (const d of daysBetween(cur.from, cur.to)) {
        const day = habitDay(habit, data, d, today);
        if (
          REQUIRED.has(day.mark) &&
          !(d === today && day.mark !== 'full' && day.mark !== 'slip')
        ) {
          // Сегодняшний день считается, только когда уже решён.
          required++;
          if (day.mark === 'full') done++;
        }
        if (day.mark === 'slip') slips++;
        if (habit.kind === 'good') total += day.value;
      }
    }
    return {
      habit,
      rate: required > 0 ? done / required : null,
      required,
      done,
      slips,
      total,
      streak: cur && cur.to === today ? currentStreak(habit, data, today) : null,
    };
  });

  // По дням недели — только привычки.
  const sum = Array.from({ length: 7 }, () => ({ planned: 0, done: 0 }));
  if (cur) {
    for (const h of ctx.habits) {
      const data = dataOf(ctx.idx, h.id);
      for (const d of daysBetween(cur.from, cur.to)) {
        if (d === today) continue;
        const mark = habitDay(h, data, d, today).mark;
        if (!REQUIRED.has(mark)) continue;
        sum[weekday(d)].planned++;
        if (mark === 'full') sum[weekday(d)].done++;
      }
    }
  }

  const groups: { from: ISODate; to: ISODate }[] =
    p.kind === 'week'
      ? daysBetween(p.from, p.to).map((d) => ({ from: d, to: d }))
      : p.kind === 'month'
        ? weeksOf(p, weekStart)
        : Array.from({ length: 12 }, (_, i) => {
            const from = addMonths(p.from, i);
            return { from, to: addDays(addMonths(from, 1), -1) };
          });
  const marks = groups.map(({ from, to }) => ({
    from,
    count: from > today ? 0 : habitMarks(ctx, from, to < today ? to : today),
  }));

  return {
    rows,
    byWeekday: sum.map((w) => (w.planned > 0 ? w.done / w.planned : null)),
    marks,
  };
}

/** Недели месяца (обрезанные по границам месяца). */
function weeksOf(p: Period, weekStart: 0 | 1): { from: ISODate; to: ISODate }[] {
  const out: { from: ISODate; to: ISODate }[] = [];
  for (let d = p.from; d <= p.to;) {
    const end = addDays(startOfWeek(d, weekStart), 6);
    const to = end < p.to ? end : p.to;
    out.push({ from: d, to });
    d = addDays(to, 1);
  }
  return out;
}

// ── Одна привычка за год ─────────────────────────────────────────────────────

export type HeatCell = {
  date: ISODate;
  /** 0 — не сделано, 1–4 — сколько сделано; null — день не в счёт (до начала, будущий, выходной) */
  level: number | null;
};

export type HabitYear = {
  /** все дни года по порядку */
  cells: HeatCell[];
  streak: number;
  best: { days: number; end: ISODate | null };
  rate: Compare<number | null>;
  /** дней с нормой (у вредной — чистых) */
  doneDays: number;
  /** сделано за год в единицах привычки */
  total: number;
  /** день недели, когда чаще всего не выполняется (0 — вс), и доли */
  weakDay: { day: number; rate: number; others: number } | null;
  /** доля по месяцам; null — в месяце нет дней по плану */
  months: (number | null)[];
};

function levelOf(h: Habit, mark: string, fraction: number, value: number): number | null {
  if (mark === 'before' || mark === 'future' || mark === 'rest' || mark === 'off') return null;
  if (mark === 'slip' || mark === 'empty') return 0;
  if (mark === 'partial') return fraction >= 0.5 ? 2 : 1;
  // Норма: перевыполнение — ярче.
  if (h.kind === 'good' && h.measure === 'numeric' && value >= h.target * 1.5) return 4;
  return 3;
}

export function habitYear(
  snap: Snapshot,
  habitId: string,
  year: number,
  today: ISODate
): HabitYear | null {
  const h = snap.habits[habitId];
  if (!h || h.deletedAt !== null) return null;
  const data = indexHabits(snap).get(habitId) ?? { checks: new Map(), rests: [] };
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const days = daysBetween(from, to).map((d) => habitDay(h, data, d, today));
  const cells = days.map((d) => ({ date: d.date, level: levelOf(h, d.mark, d.fraction, d.value) }));

  const decided = (d: (typeof days)[number]) =>
    REQUIRED.has(d.mark) && !(d.date === today && d.mark !== 'full' && d.mark !== 'slip');
  const span = (list: typeof days) => {
    const req = list.filter(decided);
    return req.length ? req.filter((d) => d.mark === 'full').length / req.length : null;
  };

  const prevDays = daysBetween(`${year - 1}-01-01`, `${year - 1}-12-31`).map((d) =>
    habitDay(h, data, d, today)
  );
  const byWd = Array.from({ length: 7 }, () => ({ req: 0, done: 0 }));
  for (const d of days) {
    if (!decided(d)) continue;
    byWd[weekday(d.date)].req++;
    if (d.mark === 'full') byWd[weekday(d.date)].done++;
  }
  let weakDay: HabitYear['weakDay'] = null;
  const wd = byWd
    .map((w, day) => ({ day, ...w }))
    .filter((w) => w.req >= 3)
    .map((w) => ({ day: w.day, rate: w.done / w.req, req: w.req, done: w.done }));
  if (wd.length >= 2) {
    const worst = wd.reduce((a, b) => (b.rate < a.rate ? b : a));
    const rest = wd.filter((w) => w.day !== worst.day);
    const others = rest.reduce((n, w) => n + w.done, 0) / rest.reduce((n, w) => n + w.req, 0);
    if (others - worst.rate >= 0.1) weakDay = { day: worst.day, rate: worst.rate, others };
  }

  const best = longestRun(h, data, from, to < today ? to : today, today);
  return {
    cells,
    streak: currentStreak(h, data, today),
    best: { days: best.best, end: best.end },
    rate: { value: span(days), prev: span(prevDays) },
    doneDays: days.filter((d) => d.mark === 'full').length,
    total: h.kind === 'good' ? days.reduce((n, d) => n + d.value, 0) : 0,
    weakDay,
    months: Array.from({ length: 12 }, (_, i) =>
      span(days.filter((d) => Number(d.date.slice(5, 7)) === i + 1))
    ),
  };
}

// ── Дела ─────────────────────────────────────────────────────────────────────

export type TasksReport = {
  done: Compare<number>;
  /** доля сделанных вовремя (в день назначения или раньше) среди сделанных за период с датой */
  onTime: Compare<number | null>;
  /** средняя задержка опоздавших, дней */
  avgDelay: Compare<number | null>;
  /** открытых дел, просроченных больше чем на неделю (сейчас) */
  stale: number;
  /** сделано по часам (0–23) — по моменту выполнения */
  byHour: number[];
  /** по приоритету (3 → 0): сделано из назначенных на дни периода */
  byPriority: { priority: Priority; done: number; total: number }[];
};

export function tasksReport(snap: Snapshot, p: Period, today: ISODate): TasksReport {
  const { weekStart } = settingsOf(snap);
  const cur = elapsed(p, today);
  const prev = previousSpan(p, today, weekStart, snap.profile.startedAt);
  const tasks = live(snap.tasks);
  const within = (d: ISODate | null, span: { from: ISODate; to: ISODate } | null) =>
    !!d && !!span && d >= span.from && d <= span.to;

  const timing = (span: { from: ISODate; to: ISODate } | null) => {
    const done = tasks.filter((t) => within(t.doneOn, span));
    const dated = done.filter((t) => t.date !== null);
    const late = dated.filter((t) => t.doneOn! > t.date!);
    return {
      done: done.length,
      onTime: dated.length >= MIN_PLANNED ? (dated.length - late.length) / dated.length : null,
      avgDelay: late.length
        ? late.reduce((n, t) => n + diffDays(t.date!, t.doneOn!), 0) / late.length
        : null,
    };
  };
  const a = timing(cur);
  const b = prev ? timing(prev) : null;

  const byHour = Array.from({ length: 24 }, () => 0);
  for (const t of tasks) {
    if (within(t.doneOn, cur) && t.doneAt !== null) byHour[new Date(t.doneAt).getHours()]++;
  }

  const byPriority = ([3, 2, 1, 0] as const).map((priority) => {
    const list = tasks.filter((t) => t.priority === priority && within(t.date, cur));
    return { priority, total: list.length, done: list.filter((t) => t.doneOn !== null).length };
  });

  return {
    done: { value: a.done, prev: b ? b.done : null },
    onTime: { value: a.onTime, prev: b ? b.onTime : null },
    avgDelay: { value: a.avgDelay, prev: b ? b.avgDelay : null },
    stale: tasks.filter((t) => !t.doneOn && t.date !== null && diffDays(t.date, today) > 7).length,
    byHour,
    byPriority,
  };
}

// ── Сферы и настроение ───────────────────────────────────────────────────────

export type AreaRow = {
  area: Area;
  /** сделанных дел и отметок привычек сферы */
  count: number;
  share: number;
  /** открытых долгов сферы сейчас */
  debts: number;
};

export type MoodReport = {
  /** по оценке 1…5: дней с такой оценкой и сколько дел в среднем закрыто в такой день */
  byMood: { mood: number; days: number; avgDone: number | null }[];
  /** оценка по дням периода (у года — средняя по месяцам) */
  series: { from: ISODate; mood: number | null }[];
};

export function areasReport(snap: Snapshot, p: Period, today: ISODate): AreaRow[] {
  const ctx = context(snap, today);
  const cur = elapsed(p, today);
  const areas = live(snap.areas).sort((a, b) => a.createdAt - b.createdAt);
  const count = new Map<string, number>();
  const add = (id: string | null, n = 1) => id && count.set(id, (count.get(id) ?? 0) + n);
  if (cur) {
    for (const d of daysBetween(cur.from, cur.to)) {
      for (const t of ctx.doneByDate.get(d) ?? []) add(t.areaId);
    }
    for (const h of ctx.habits) {
      if (!h.areaId || h.kind !== 'good') continue;
      add(h.areaId, habitMarks({ ...ctx, habits: [h] }, cur.from, cur.to));
    }
  }
  const total = areas.reduce((n, a) => n + (count.get(a.id) ?? 0), 0);
  return areas
    .map((area) => ({
      area,
      count: count.get(area.id) ?? 0,
      share: total ? (count.get(area.id) ?? 0) / total : 0,
      debts: live(snap.tasks).filter(
        (t) => t.areaId === area.id && !t.doneOn && t.date !== null && t.date < today
      ).length,
    }))
    .sort((a, b) => b.count - a.count || a.area.createdAt - b.area.createdAt);
}

export function moodReport(snap: Snapshot, p: Period, today: ISODate): MoodReport {
  const ctx = context(snap, today);
  const cur = elapsed(p, today);
  const reviews = new Map(live(snap.reviews).map((r) => [r.date, r.mood]));
  const groups = Array.from({ length: 5 }, () => ({ days: 0, done: 0 }));
  if (cur) {
    for (const d of daysBetween(cur.from, cur.to)) {
      const m = reviews.get(d);
      if (!m) continue;
      groups[m - 1].days++;
      groups[m - 1].done += ctx.doneByDate.get(d)?.length ?? 0;
    }
  }
  const series =
    p.kind === 'year'
      ? Array.from({ length: 12 }, (_, i) => {
          const from = addMonths(p.from, i);
          return { from, mood: moodAvg(snap, from, addDays(addMonths(from, 1), -1)) };
        })
      : daysBetween(p.from, p.to).map((d) => ({ from: d, mood: reviews.get(d) ?? null }));
  return {
    byMood: groups.map((g, i) => ({
      mood: i + 1,
      days: g.days,
      avgDone: g.days ? g.done / g.days : null,
    })),
    series,
  };
}

// ── Итоги года ───────────────────────────────────────────────────────────────

export type YearSummary = {
  /** дел и отметок привычек за год */
  total: Compare<number>;
  /** доля сделанного по месяцам */
  months: (number | null)[];
  bestMonth: { month: number; rate: number } | null;
  longest: { habit: Habit; days: number } | null;
  goals: { done: number; total: number; example: string | null };
  mood: Compare<number | null>;
  /** занятий расписания и часов (по нынешнему расписанию, с создания занятия) */
  lessons: { count: number; minutes: number };
  /** привычка с самым большим временем (минуты, часы) */
  timeHabit: { habit: Habit; minutes: number; days: number } | null;
};

export function yearSummary(snap: Snapshot, year: number, today: ISODate): YearSummary {
  const ctx = context(snap, today);
  const p = periodOf('year', `${year}-01-01`, settingsOf(snap).weekStart);
  const cur = elapsed(p, today);
  const prevFrom = `${year - 1}-01-01`;
  // Прошлый год целиком до начала пользования — сравнивать не с чем.
  const hasPrev = `${year - 1}-12-31` >= snap.profile.startedAt;
  const prevTo = cur ? addDays(prevFrom, diffDays(cur.from, cur.to)) : prevFrom;
  const totalOf = (from: ISODate, to: ISODate) =>
    tasksDone(ctx, from, to) + habitMarks(ctx, from, to);

  const months = buckets(ctx, p).map((b) => (b.planned >= MIN_PLANNED ? b.rate : null));
  let bestMonth: YearSummary['bestMonth'] = null;
  months.forEach((r, i) => {
    if (r !== null && (!bestMonth || r > bestMonth.rate)) bestMonth = { month: i, rate: r };
  });

  let longest: YearSummary['longest'] = null;
  let timeHabit: YearSummary['timeHabit'] = null;
  if (cur) {
    for (const h of ctx.habits) {
      const data = dataOf(ctx.idx, h.id);
      const r = longestRun(h, data, cur.from, cur.to, today);
      if (r.best > 0 && (!longest || r.best > longest.days)) longest = { habit: h, days: r.best };
      if (h.kind === 'good' && h.measure === 'numeric' && h.unit !== 'count') {
        let value = 0;
        let days = 0;
        for (const d of daysBetween(cur.from, cur.to)) {
          const day = habitDay(h, data, d, today);
          value += day.value;
          if (day.value > 0) days++;
        }
        const minutes = h.unit === 'hours' ? value * 60 : value;
        if (minutes > 0 && (!timeHabit || minutes > timeHabit.minutes))
          timeHabit = { habit: h, minutes, days };
      }
    }
  }

  const goals = live(snap.goals).filter(
    (g) =>
      (g.deadline && g.deadline.startsWith(`${year}`)) ||
      (g.doneOn && g.doneOn.startsWith(`${year}`))
  );
  const doneGoals = goals.filter((g) => g.doneOn && g.doneOn.startsWith(`${year}`));

  // Расписание: занятия по дням года с момента создания каждого, пока расписание включено сейчас.
  const s = settingsOf(snap);
  let count = 0;
  let minutes = 0;
  if (cur && s.scheduleEnabled) {
    const lessons = live(snap.lessons);
    for (const d of daysBetween(cur.from, cur.to)) {
      for (const l of lessons) {
        if (dstr(new Date(l.createdAt)) > d || !lessonOn(l, d, s)) continue;
        const t = lessonTime(l, s.bells);
        const len = (minutesOf(t.end) ?? 0) - (minutesOf(t.start) ?? 0);
        if (len <= 0) continue;
        count++;
        minutes += len;
      }
    }
  }

  return {
    total: {
      value: cur ? totalOf(cur.from, cur.to) : 0,
      prev: cur && hasPrev ? totalOf(prevFrom, prevTo) : null,
    },
    months,
    bestMonth,
    longest,
    goals: { done: doneGoals.length, total: goals.length, example: doneGoals[0]?.text ?? null },
    mood: {
      value: cur ? moodAvg(snap, cur.from, cur.to) : null,
      prev: cur && hasPrev ? moodAvg(snap, prevFrom, prevTo) : null,
    },
    lessons: { count, minutes },
    timeHabit,
  };
}
