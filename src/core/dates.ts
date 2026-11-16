/**
 * Арифметика дат `YYYY-MM-DD` без часовых поясов: дата — это номер дня, а не момент времени.
 * Считаем в UTC, чтобы переход на летнее время не сдвигал дни.
 */
import type { ISODate } from './model';

const DAY_MS = 86_400_000;

function toUtc(d: ISODate): number {
  return Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
}

function fromUtc(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUtc(toUtc(d) + n * DAY_MS);
}

/** Сдвиг на `n` месяцев; день месяца сохраняется, а если такого нет (31 → февраль), берётся последний. */
export function addMonths(d: ISODate, n: number): ISODate {
  const total = Number(d.slice(0, 4)) * 12 + (Number(d.slice(5, 7)) - 1) + n;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(Number(d.slice(8, 10)), last);
  return fromUtc(Date.UTC(year, month, day));
}

/** Первое число месяца, в котором лежит `d`. */
export function startOfMonth(d: ISODate): ISODate {
  return `${d.slice(0, 7)}-01`;
}

/** Сколько дней от `from` до `to` (to − from). */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** День недели: 0 = вс … 6 = сб. */
export function weekday(d: ISODate): number {
  return new Date(toUtc(d)).getUTCDay();
}

/** Первый день недели, в которую входит `d`. `weekStart`: 1 — понедельник, 0 — воскресенье. */
export function startOfWeek(d: ISODate, weekStart: 0 | 1): ISODate {
  const back = (weekday(d) - weekStart + 7) % 7;
  return addDays(d, -back);
}

/** Дни от `from` до `to` включительно (пусто, если from > to). */
export function daysBetween(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Локальное время `HH:MM` момента `ms`. */
export function clockOf(ms: number): string {
  const t = new Date(ms);
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}

/** Локальная дата `YYYY-MM-DD` момента `d`. */
export function dstr(d: Date): ISODate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Сегодня по локальному времени. */
export function todayStr(): ISODate {
  return dstr(new Date());
}
