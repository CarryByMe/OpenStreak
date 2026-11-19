/**
 * Блок «Расписание» на «Сегодня» (design/schedule, экран 1): занятия дня по времени, прошедшие —
 * серым, идущее — «идёт · ещё N мин», между занятиями — «окно». После занятия, связанного
 * с привычкой, — «Отметить». Нет расписания или занятий сегодня — блока нет.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as A from '../../core/actions';
import { liveCheck } from '../../core/habits';
import { lessonsOn, timeline } from '../../core/schedule';
import { useDataStore } from '../../core/store';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/icons';
import { Card } from '../../ui/Sticker';
import { useToast } from '../../ui/toast';
import { durationText, useClock } from './scheduleUi';
import { SlotRow } from './SlotRow';

export function ScheduleToday({ onOpen }: { onOpen: () => void }) {
  const p = usePalette();
  const t = useT();
  const data = useDataStore((s) => s.data);
  const today = useDataStore((s) => s.today);
  const toast = useToast((s) => s.show);
  const now = useClock();
  const items = useMemo(() => timeline(lessonsOn(data, today), now), [data, today, now]);
  if (items.length === 0) return null;

  const markButton = (habitId: string | null, title: string) => {
    const habit = habitId ? data.habits[habitId] : undefined;
    if (!habit || habit.deletedAt !== null || habit.archivedAt !== null) return null;
    if (liveCheck(data, habit.id, today)) return null;
    return (
      <View style={styles.mark}>
        <Chip
          label={t('schedule.mark')}
          icon="check"
          onPress={() => {
            A.toggleCheck(habit.id, today);
            toast(t('schedule.marked', { title: habit.name }));
          }}
        />
      </View>
    );
  };

  return (
    <Card>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={[TYPE.itemStrong, { color: p.text }]}>
          {t('schedule.title')}
        </Text>
        <Pressable accessibilityRole="button" onPress={onOpen} hitSlop={8} style={styles.link}>
          <Text style={[TYPE.control, { color: p.text }]}>{t('schedule.week')}</Text>
          <Icon name="chevron" size={14} tone="muted" />
        </Pressable>
      </View>
      {items.map((item, i) =>
        item.type === 'gap' ? (
          <Text key={`gap-${i}`} style={[TYPE.meta, styles.gap, { color: p.muted }]}>
            {t('schedule.gap', { time: durationText(t, item.minutes) })}
          </Text>
        ) : (
          <SlotRow
            key={item.slot.lesson.id}
            slot={item.slot}
            state={item.state}
            now={now}
            right={
              item.state === 'past'
                ? markButton(item.slot.lesson.habitId, item.slot.lesson.title)
                : undefined
            }
          />
        )
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.xs,
  },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 },
  gap: { paddingLeft: 48 + SPACE.md + SPACE.sm, paddingVertical: 2 },
  mark: { justifyContent: 'center' },
});
