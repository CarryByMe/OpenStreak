/**
 * Помощники экранов расписания: цвет и значок занятия, подписи пары и длительности, текущее время.
 * Расчёты (время по звонкам, чётность, «окна») — в `core/schedule`.
 */
import { useEffect, useState } from 'react';
import { clockOf } from '../../core/dates';
import type { Area, Lesson, LessonKind } from '../../core/model';
import type { DaySlot } from '../../core/schedule';
import type { MessageKey } from '../../i18n';
import type { Palette } from '../../theme/palette';
import { ensureContrast } from '../../theme/readable';
import type { IconName } from '../../ui/icons';

type T = (key: MessageKey, params?: Record<string, string | number>) => string;

/** Значок шаблона. */
export const KIND_ICON: Record<LessonKind, IconName> = {
  pair: 'book',
  gym: 'dumbbell',
  work: 'wallet',
  custom: 'clock',
};

/**
 * Цвет полоски занятия: цвет сферы (доведённый до контраста) или цвет шаблона. Цвета шаблонов —
 * токены с проверенным контрастом на фоне и карточке в обеих темах.
 */
export function lessonColor(
  p: Palette,
  lesson: Pick<Lesson, 'kind' | 'areaId'>,
  areas: Record<string, Area>
): string {
  const area = lesson.areaId ? areas[lesson.areaId] : undefined;
  if (area && area.deletedAt === null) return ensureContrast(area.color, [p.bg, p.surface]);
  switch (lesson.kind) {
    case 'pair':
      return p.prioLow;
    case 'gym':
      return p.teal;
    case 'work':
      return p.violet;
    default:
      return p.prioMid;
  }
}

/** «2 пара» или «2–3 пара»; не пара — пусто. */
export function pairLabel(t: T, lesson: Pick<Lesson, 'pair' | 'pairSpan'>): string {
  if (lesson.pair === null) return '';
  return lesson.pairSpan > 1
    ? t('schedule.pairs', { a: lesson.pair, b: lesson.pair + lesson.pairSpan - 1 })
    : t('schedule.pairN', { n: lesson.pair });
}

/** Вторая строка занятия: «2 пара · практика». Место рисуется отдельно, со значком. */
export function slotMeta(t: T, slot: DaySlot): string {
  return [pairLabel(t, slot.lesson), slot.lesson.note].filter(Boolean).join(' · ');
}

/** «4 ч 40 мин», «2 ч», «35 мин». */
export function durationText(t: T, minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return t('schedule.hm', { h, m });
  return h ? t('schedule.h', { h }) : t('schedule.m', { m });
}

/** Текущее время `HH:MM` для показа (обновляется раз в 30 секунд). Напоминания — не здесь. */
export function useClock(): string {
  const [now, setNow] = useState(() => clockOf(Date.now()));
  useEffect(() => {
    const id = setInterval(() => setNow(clockOf(Date.now())), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Слово с большой буквы (короткие дни недели хранятся строчными). */
export const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
