/**
 * Расписание — чистые функции: время занятия по звонкам, чётность недели, занятия дня,
 * что идёт сейчас и где «окна». Экраны только рисуют результат.
 */
import { addDays, diffDays, startOfWeek, weekday } from './dates';
import { live, type Bell, type ClockTime, type ISODate, type Lesson, type Snapshot } from './model';
import { settingsOf, type SettingsFields } from './settings';

/** Больше пар в звонках не бывает. */
export const MAX_BELLS = 10;
/** Промежуток между занятиями, начиная с которого он показывается «окном». */
export const MIN_GAP_MINUTES = 30;
/** Варианты «напомнить за …» в минутах. */
export const REMIND_OPTIONS = [5, 10, 15, 30, 60] as const;

/** Минуты от полуночи для `HH:MM`; для пустого или кривого времени — null. */
export function minutesOf(t: ClockTime): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/** `HH:MM` из минут от полуночи (в пределах суток). */
export function clockFromMinutes(total: number): ClockTime {
  const v = Math.min(24 * 60 - 1, Math.max(0, Math.round(total)));
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
}

/**
 * Звонки по правилу: начало первой пары, длина пары и перемена. Пары, которые не помещаются
 * в сутки, отбрасываются.
 */
export function bellsFrom(first: ClockTime, length: number, pause: number, count: number): Bell[] {
  const start = minutesOf(first);
  if (start === null || length <= 0 || pause < 0) return [];
  const out: Bell[] = [];
  for (let i = 0; i < Math.min(count, MAX_BELLS); i++) {
    const s = start + i * (length + pause);
    const e = s + length;
    if (e >= 24 * 60) break;
    out.push({ start: clockFromMinutes(s), end: clockFromMinutes(e) });
  }
  return out;
}

/** Длина пары и перемена, если звонки идут ровно (иначе null): для подсказки в «Звонках». */
export function bellRhythm(bells: Bell[]): { length: number; pause: number } | null {
  if (bells.length === 0) return null;
  const mins = bells.map((b) => [minutesOf(b.start) ?? 0, minutesOf(b.end) ?? 0] as const);
  const length = mins[0][1] - mins[0][0];
  const pause = mins.length > 1 ? mins[1][0] - mins[0][1] : 10;
  const even = mins.every(
    ([s, e], i) => e - s === length && (i === 0 || s - mins[i - 1][1] === pause)
  );
  return even && length > 0 && pause >= 0 ? { length, pause } : null;
}

/** Начало и конец занятия: у пары — по звонкам (сдвоенная — до конца последней), иначе своё. */
export function lessonTime(
  lesson: Pick<Lesson, 'pair' | 'pairSpan' | 'start' | 'end'>,
  bells: Bell[]
): { start: ClockTime; end: ClockTime } {
  if (lesson.pair !== null) {
    const first = bells[lesson.pair - 1];
    if (first) {
      const last =
        bells[Math.min(bells.length, lesson.pair + Math.max(1, lesson.pairSpan) - 1) - 1];
      return { start: first.start, end: (last ?? first).end };
    }
  }
  return { start: lesson.start, end: lesson.end };
}

/** 1 сентября учебного года, в который входит `date` (до сентября — прошлого года). */
export function schoolYearStart(date: ISODate): ISODate {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  return `${m >= 9 ? y : y - 1}-09-01`;
}

/**
 * Номер учебной недели и её чётность. Первая неделя — та, в которую входит `parityFrom`
 * (или 1 сентября), она нечётная. Неделя начинается с понедельника или воскресенья — как в настройках.
 */
export function weekOf(
  date: ISODate,
  s: Pick<SettingsFields, 'parityFrom' | 'weekStart'>
): { number: number; parity: 'odd' | 'even' } {
  const from = s.parityFrom ?? schoolYearStart(date);
  const weeks = Math.floor(
    diffDays(startOfWeek(from, s.weekStart), startOfWeek(date, s.weekStart)) / 7
  );
  // До начала отсчёта считаем назад: неделя перед первой — нулевая, чётная.
  const number = weeks + 1;
  return { number, parity: Math.abs(number) % 2 === 1 ? 'odd' : 'even' };
}

/** Занятие в этот день (по дню недели и чётности), без учёта того, включено ли расписание. */
export function lessonOn(lesson: Lesson, date: ISODate, s: SettingsFields): boolean {
  if (!lesson.days.includes(weekday(date))) return false;
  if (!s.weekParity || lesson.weeks === 'all') return true;
  return weekOf(date, s).parity === lesson.weeks;
}

export type DaySlot = { lesson: Lesson; start: ClockTime; end: ClockTime };

/** Занятия дня по времени. Выключенное расписание — пусто. */
export function lessonsOn(snap: Snapshot, date: ISODate): DaySlot[] {
  const s = settingsOf(snap);
  if (!s.scheduleEnabled) return [];
  return slotsOf(live(snap.lessons), date, s);
}

/** Занятия дня из списка (для экрана расписания — и при выключенном расписании). */
export function slotsOf(lessons: Lesson[], date: ISODate, s: SettingsFields): DaySlot[] {
  return lessons
    .filter((l) => lessonOn(l, date, s))
    .map((lesson) => ({ lesson, ...lessonTime(lesson, s.bells) }))
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) ||
        a.end.localeCompare(b.end) ||
        a.lesson.createdAt - b.lesson.createdAt
    );
}

export type SlotState = 'past' | 'now' | 'next';

/** Прошло, идёт или впереди — относительно времени `now` (`HH:MM`). */
export function slotState(slot: Pick<DaySlot, 'start' | 'end'>, now: ClockTime): SlotState {
  if (now >= slot.end) return 'past';
  if (now >= slot.start) return 'now';
  return 'next';
}

/** Сколько минут осталось до конца и какая доля прошла (0…1). */
export function slotProgress(
  slot: Pick<DaySlot, 'start' | 'end'>,
  now: ClockTime
): { left: number; done: number } {
  const s = minutesOf(slot.start) ?? 0;
  const e = minutesOf(slot.end) ?? s;
  const n = minutesOf(now) ?? s;
  const total = Math.max(1, e - s);
  return { left: Math.max(0, e - n), done: Math.min(1, Math.max(0, (n - s) / total)) };
}

export type TimelineItem =
  { type: 'slot'; slot: DaySlot; state: SlotState } | { type: 'gap'; minutes: number };

/** Лента дня: занятия и «окна» между ними (от `MIN_GAP_MINUTES`). */
export function timeline(slots: DaySlot[], now: ClockTime | null): TimelineItem[] {
  const out: TimelineItem[] = [];
  let lastEnd: number | null = null;
  for (const slot of slots) {
    const start = minutesOf(slot.start);
    if (lastEnd !== null && start !== null && start - lastEnd >= MIN_GAP_MINUTES) {
      out.push({ type: 'gap', minutes: start - lastEnd });
    }
    out.push({ type: 'slot', slot, state: now === null ? 'next' : slotState(slot, now) });
    const end = minutesOf(slot.end);
    if (end !== null) lastEnd = Math.max(lastEnd ?? end, end);
  }
  return out;
}

/** Дни недели по порядку недели пользователя, начиная с `weekStart`. */
export function weekDays(weekStart: 0 | 1): number[] {
  return Array.from({ length: 7 }, (_, i) => (i + weekStart) % 7);
}

/** Дата дня недели `day` в неделе, где лежит `date`. */
export function dateInWeek(date: ISODate, day: number, weekStart: 0 | 1): ISODate {
  const first = startOfWeek(date, weekStart);
  return addDays(first, (day - weekStart + 7) % 7);
}
