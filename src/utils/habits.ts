import { Habit, HabitUnit } from '../types/models';
import { todayStr, addDays, DAYN2 } from './text';

export function isScheduled(habit: Habit, dateStr: string): boolean {
  if (!habit.days) return true;
  return habit.days.includes(new Date(dateStr + 'T00:00').getDay());
}

export function isRest(habit: Habit, dateStr: string): boolean {
  return (habit.rest || []).some((r) => dateStr >= r.f && dateStr <= r.t);
}

export function scheduleLabel(habit: Habit): string {
  if (!habit.days || habit.days.length === 7) return 'каждый день';
  // Отдельная константа: внутри коллбека .filter() сужение типа теряется,
  // и `habit.days` там снова `number[] | null`.
  const days = habit.days;
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((d) => days.includes(d))
    .map((d) => DAYN2[d])
    .join(', ');
}

export function unitLabel(unit: HabitUnit): string {
  if (unit === 'minutes') return 'мин';
  if (unit === 'hours') return 'ч';
  return 'раз';
}

export function streak(habit: Habit): number {
  const start = habit.createdAt;
  const today = todayStr();

  if (habit.type === 'bad') {
    if (habit.dates.includes(today) && !isRest(habit, today)) return 0;
    let s = 0;
    let d = today;
    for (let i = 0; i < 730 && d >= start; i++) {
      if (!isRest(habit, d) && isScheduled(habit, d)) {
        if (habit.dates.includes(d)) break;
        s++;
      }
      d = addDays(d, -1);
    }
    return s;
  }

  let s = 0;
  let d = today;
  if (!(isScheduled(habit, d) && habit.dates.includes(d))) d = addDays(d, -1);
  for (let i = 0; i < 730 && d >= start; i++) {
    if (!isRest(habit, d) && isScheduled(habit, d)) {
      if (habit.dates.includes(d)) s++;
      else break;
    }
    d = addDays(d, -1);
  }
  return s;
}
