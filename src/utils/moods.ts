import { Habit } from '../types/models';
import { todayStr } from './text';
import { isScheduled, isRest } from './habits';

export const MOOD_TYPES = ['sad', 'angry', 'neutral', 'smile', 'laugh'] as const;
export const MOOD_ORDER = [2, 1, 3, 4, 5] as const;

export function isPerfect(dateStr: string, habits: Habit[], startedAt: string): boolean {
  if (dateStr > todayStr()) return false;
  if (dateStr < startedAt) return false;
  const scheduledHabits = habits.filter(
    (habit) =>
      (habit.createdAt || startedAt) <= dateStr &&
      isScheduled(habit, dateStr) &&
      !isRest(habit, dateStr)
  );
  if (!scheduledHabits.length) return false;
  return scheduledHabits.every((habit) => {
    if (habit.type === 'bad') return !habit.dates.includes(dateStr);
    return habit.dates.includes(dateStr);
  });
}
