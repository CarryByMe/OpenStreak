import { habitColor } from '../core/colors';
import type { DayItem } from '../core/day';
import type { Snapshot } from '../core/model';

/** Цвет отметки строки дня: у дела — цвет сферы, у привычки — сферы или свой (как в «Обычном»). */
export function itemTint(
  data: Pick<Snapshot, 'tasks' | 'habits' | 'areas'>,
  item: Pick<DayItem, 'kind' | 'id'>
): string | undefined {
  if (item.kind === 'habit') {
    const habit = data.habits[item.id];
    return habit ? habitColor(habit, data.areas) : undefined;
  }
  const area = data.areas[data.tasks[item.id]?.areaId ?? ''];
  return area && area.deletedAt === null ? area.color : undefined;
}
