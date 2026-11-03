import { Task } from '../types/models';
import { todayStr } from './text';

export function sortByPriority(tasks: Task[]): Task[] {
  return tasks.slice().sort((a, b) => {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }
    return (b.priority || 0) - (a.priority || 0);
  });
}

export function tasksOn(dateStr: string): (tasks: Task[]) => Task[] {
  return (tasks) => tasks.filter((x) => x.date === dateStr);
}

export function isOverdue(task: Task): boolean {
  return task.date !== null && task.date < todayStr() && !task.done;
}

export function isToday(task: Task): boolean {
  return task.date === todayStr() && !task.done;
}

export function isFuture(task: Task): boolean {
  return task.date !== null && task.date > todayStr() && !task.done;
}

export function isNoDate(task: Task): boolean {
  return task.date === null && !task.done;
}

export function isDone(task: Task): boolean {
  return task.done;
}
