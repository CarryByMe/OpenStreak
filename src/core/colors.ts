import { type Area, type Habit } from './model';

/**
 * Цвет привычки для показа: у привычки в сфере — цвет сферы (меняется вместе с ней), у привычки
 * без сферы — её собственный. Собственный цвет остаётся запасным: если сферу убрать или удалить,
 * привычка вернётся к нему.
 */
export function habitColor(habit: Pick<Habit, 'color' | 'areaId'>, areas: Record<string, Area>) {
  const area = habit.areaId ? areas[habit.areaId] : undefined;
  return area && area.deletedAt === null ? area.color : habit.color;
}
