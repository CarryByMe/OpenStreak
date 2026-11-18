/** Пункты дел: порядок, счёт «2/5» и разбор вставленного списка. Чистые функции. */
import { live, type Snapshot, type Subtask } from './model';

/** Сколько пунктов в одном деле и какой длины название пункта. */
export const MAX_SUBTASKS = 50;
export const MAX_SUBTASK_TITLE = 120;

export function compareSubtasks(a: Subtask, b: Subtask): number {
  return a.order - b.order || a.createdAt - b.createdAt;
}

/** Живые пункты дела по порядку. */
export function subtasksOf(snap: Pick<Snapshot, 'subtasks'>, taskId: string): Subtask[] {
  return live(snap.subtasks)
    .filter((s) => s.taskId === taskId)
    .sort(compareSubtasks);
}

/** Пункты всех дел за один проход — для списков, где вызывать `subtasksOf` на каждую строку дорого. */
export function subtaskIndex(snap: Pick<Snapshot, 'subtasks'>): Map<string, Subtask[]> {
  const index = new Map<string, Subtask[]>();
  for (const s of live(snap.subtasks)) {
    const list = index.get(s.taskId);
    if (list) list.push(s);
    else index.set(s.taskId, [s]);
  }
  for (const list of index.values()) list.sort(compareSubtasks);
  return index;
}

export type SubtaskProgress = { done: number; total: number };

export function subtaskProgress(items: readonly Subtask[]): SubtaskProgress {
  return { done: items.filter((s) => s.doneOn !== null).length, total: items.length };
}

/** Доля 0…1 для отметки дела; у дела без пунктов — 0. */
export function subtaskFraction(items: readonly Subtask[]): number {
  return items.length === 0 ? 0 : subtaskProgress(items).done / items.length;
}

/** Маркеры списков в начале строки: «- », «* », «• », «1. », «1) », «[ ] », «[x] », «☐ », «✓ ». */
const BULLET = /^\s*(?:[-*•·–—]\s+|\d{1,3}[.)]\s+|\[[ xXхХ]?\]\s*|[☐☑✓✔]\s*)/;

/**
 * Вставленный текст → названия пунктов: по строкам, без маркеров списка, без пустых,
 * длинные обрезаются. Ограничение числа пунктов — на стороне добавления.
 */
export function splitPasted(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(BULLET, '').trim())
    .filter((line) => line.length > 0)
    .map((line) => (line.length > MAX_SUBTASK_TITLE ? line.slice(0, MAX_SUBTASK_TITLE) : line));
}
