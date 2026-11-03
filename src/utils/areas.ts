import { Area, Task, Habit } from '../types/models';

export function countActiveTasksForArea(areaId: string, tasks: Task[]): number {
  return tasks.filter((x) => x.area === areaId && !x.done).length;
}

export function countHabitsForArea(areaId: string, habits: Habit[]): number {
  return habits.filter((h) => h.area === areaId).length;
}

export function countGoalsForArea(area: Area): { total: number; done: number } {
  const total = area.goals.length;
  const done = area.goals.filter((g) => g.done).length;
  return { total, done };
}
