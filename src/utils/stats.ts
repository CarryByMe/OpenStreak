import { Task, Habit } from '../types/models';
import { todayStr, addDays } from './text';
import { isPerfect } from './moods';

export function last7(): string[] {
  const result: string[] = [];
  for (let i = 6; i >= 0; i--) {
    result.push(addDays(todayStr(), -i));
  }
  return result;
}

export function activityPerDay(dateStr: string, tasks: Task[], habits: Habit[]): number {
  const habitsCount = habits.reduce(
    (sum, habit) => sum + (habit.dates.includes(dateStr) ? 1 : 0),
    0
  );
  const tasksCount = tasks.filter((task) => task.doneAt === dateStr).length;
  return habitsCount + tasksCount;
}

export function perfectStreak(habits: Habit[], startedAt: string): number {
  let streak = 0;
  let date = todayStr();

  if (!isPerfect(date, habits, startedAt)) {
    date = addDays(date, -1);
  }

  while (isPerfect(date, habits, startedAt)) {
    streak++;
    date = addDays(date, -1);
  }

  return streak;
}
