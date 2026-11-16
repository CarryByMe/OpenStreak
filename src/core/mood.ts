import { addDays, startOfWeek } from './dates';
import { live, type ISODate, type Snapshot } from './model';

/** Клетка календаря настроения. `mood` 1…5 — оценка из «Итога дня»; null — дня без итога. */
export type MoodCell = {
  date: ISODate;
  mood: number | null;
  today: boolean;
  /** день ещё не наступил — клетку не рисуем */
  future: boolean;
};

export type MoodCalendar = {
  /** недели сверху вниз, в каждой семь дней, начиная с `weekStart`; последняя — текущая */
  weeks: MoodCell[][];
  /** дней с оценкой в окне (до сегодня включительно) */
  rated: number;
  /** дней в окне до сегодня включительно */
  total: number;
  /** средняя оценка, округлённая до 1…5; null — оценок нет */
  average: number | null;
};

/**
 * Календарь настроения: последние `weeks` недель (по умолчанию пять), выровненные по началу
 * недели. Настроение — оценка дня 1…5, которую человек ставит при закрытии дня.
 */
export function moodCalendar(
  snap: Pick<Snapshot, 'reviews'>,
  today: ISODate,
  weekStart: 0 | 1,
  weeks = 5
): MoodCalendar {
  const moods = new Map<ISODate, number>();
  for (const r of live(snap.reviews)) {
    if (Number.isFinite(r.mood)) moods.set(r.date, Math.min(5, Math.max(1, Math.round(r.mood))));
  }
  const first = addDays(startOfWeek(today, weekStart), -7 * (weeks - 1));
  const grid: MoodCell[][] = [];
  let rated = 0;
  let total = 0;
  let sum = 0;
  for (let w = 0; w < weeks; w++) {
    const row: MoodCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(first, w * 7 + i);
      const future = date > today;
      const mood = future ? null : (moods.get(date) ?? null);
      if (!future) total++;
      if (mood !== null) {
        rated++;
        sum += mood;
      }
      row.push({ date, mood, today: date === today, future });
    }
    grid.push(row);
  }
  return {
    weeks: grid,
    rated,
    total,
    average: rated ? Math.min(5, Math.max(1, Math.round(sum / rated))) : null,
  };
}
