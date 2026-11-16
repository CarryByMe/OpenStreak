import { describe, expect, test } from '@jest/globals';
import { moodCalendar } from '../mood';
import type { DayReview } from '../model';

// 2026-11-04 — среда.
const TODAY = '2026-11-04';

const review = (date: string, mood: number, deletedAt: number | null = null): DayReview => ({
  id: date,
  createdAt: 1,
  updatedAt: 1,
  deletedAt,
  date,
  mood,
  note: '',
});

const snap = (...rs: DayReview[]) => ({ reviews: Object.fromEntries(rs.map((r) => [r.id, r])) });

describe('moodCalendar', () => {
  test('пять недель с понедельника, последняя — текущая', () => {
    const c = moodCalendar(snap(), TODAY, 1);
    expect(c.weeks).toHaveLength(5);
    expect(c.weeks.every((w) => w.length === 7)).toBe(true);
    expect(c.weeks[0]![0]!.date).toBe('2026-10-05');
    expect(c.weeks[4]![0]!.date).toBe('2026-11-02');
    expect(c.weeks[4]![2]!.today).toBe(true);
  });

  test('неделя с воскресенья', () => {
    const c = moodCalendar(snap(), TODAY, 0);
    expect(c.weeks[4]![0]!.date).toBe('2026-11-01');
  });

  test('будущие дни текущей недели помечены и не считаются', () => {
    const c = moodCalendar(snap(), TODAY, 1);
    expect(c.weeks[4]!.map((d) => d.future)).toEqual([false, false, false, true, true, true, true]);
    expect(c.total).toBe(4 * 7 + 3);
  });

  test('оценки, среднее и удалённые итоги', () => {
    const c = moodCalendar(
      snap(review('2026-11-02', 5), review('2026-11-03', 4), review('2026-11-04', 1, 99)),
      TODAY,
      1
    );
    expect(c.rated).toBe(2);
    expect(c.average).toBe(5); // 4.5 → 5
    expect(c.weeks[4]![0]!.mood).toBe(5);
    expect(c.weeks[4]![2]!.mood).toBeNull();
  });

  test('оценка вне 1…5 приводится к границам, без оценок среднего нет', () => {
    expect(moodCalendar(snap(review('2026-11-03', 9)), TODAY, 1).weeks[4]![1]!.mood).toBe(5);
    expect(moodCalendar(snap(), TODAY, 1).average).toBeNull();
  });
});
