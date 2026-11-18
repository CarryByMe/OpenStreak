/**
 * Отметка строки виджета: то же, что нажатие на кружок в «Сегодня» (дело — сделано сегодня,
 * привычка — полная норма), но без интерфейса. Виджет мог устареть (дело уже отметили в приложении),
 * поэтому повторное нажатие ничего не снимает — только отмечает ещё не отмеченное.
 */
import * as A from '../core/actions';
import { todayStr } from '../core/dates';
import { fullValue, liveCheck } from '../core/habits';
import { get, useDataStore } from '../core/store';

export type MarkTarget = { kind: 'task' | 'habit'; id: string };

/** Данные нажатия приходят из системы: проверяем форму, а не доверяем. */
export function parseMarkTarget(data: unknown): MarkTarget | null {
  if (!data || typeof data !== 'object') return null;
  const { kind, id } = data as Record<string, unknown>;
  if ((kind !== 'task' && kind !== 'habit') || typeof id !== 'string' || id === '') return null;
  return { kind, id };
}

/** Отметить; true — данные изменились. */
export function markRow({ kind, id }: MarkTarget): boolean {
  if (kind === 'task') {
    const task = get('tasks', id);
    if (!task || task.doneOn !== null) return false;
    A.toggleTask(id);
    return true;
  }
  const habit = get('habits', id);
  if (!habit || habit.kind !== 'good' || habit.archivedAt !== null) return false;
  const today = todayStr();
  const check = liveCheck(useDataStore.getState().data, id, today);
  if (check?.slip) return false;
  if ((check?.value ?? 0) >= fullValue(habit)) return false;
  A.setCheckValue(id, today, fullValue(habit));
  return true;
}
