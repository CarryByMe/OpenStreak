/**
 * Строка занятия: время (начало и конец), цветная полоска, название, «2 пара · практика» и место.
 * Прошедшее — серым; идущее — «идёт · ещё N мин» и полоска прогресса цвета занятия.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { slotProgress, type DaySlot, type SlotState } from '../../core/schedule';
import { useDataStore } from '../../core/store';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { Icon } from '../../ui/icons';
import { lessonColor, slotMeta } from './scheduleUi';

type Props = {
  slot: DaySlot;
  state?: SlotState;
  /** текущее время — для «ещё N мин» у идущего */
  now?: string;
  onPress?: () => void;
  /** справа, например «Отметить» */
  right?: React.ReactNode;
};

export function SlotRow({ slot, state = 'next', now, onPress, right }: Props) {
  const p = usePalette();
  const t = useT();
  const areas = useDataStore((s) => s.data.areas);
  const color = lessonColor(p, slot.lesson, areas);
  const past = state === 'past';
  const meta = slotMeta(t, slot);
  const progress = state === 'now' && now ? slotProgress(slot, now) : null;
  const label = [slot.start, slot.end, slot.lesson.title, meta, slot.lesson.place]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: p.bg }]}
    >
      <View style={styles.time}>
        <Text style={[TYPE.control, { color: past ? p.muted : p.text }]}>{slot.start}</Text>
        <Text style={[TYPE.meta, { color: p.muted }]}>{slot.end}</Text>
      </View>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={styles.body}>
        <Text numberOfLines={2} style={[TYPE.item, { color: past ? p.muted : p.text }]}>
          {slot.lesson.title}
        </Text>
        {(!!meta || !!slot.lesson.place) && (
          <View style={styles.meta}>
            {!!meta && <Text style={[TYPE.meta, { color: p.muted }]}>{meta}</Text>}
            {!!slot.lesson.place && (
              <View style={styles.place}>
                <Icon name="place" size={13} tone="muted" />
                <Text numberOfLines={1} style={[TYPE.meta, { color: p.muted }]}>
                  {slot.lesson.place}
                </Text>
              </View>
            )}
          </View>
        )}
        {progress && (
          <>
            <Text style={[TYPE.control, styles.going, { color: p.text }]}>
              {t('schedule.going', { min: progress.left })}
            </Text>
            <View style={[styles.track, { backgroundColor: p.track }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: color, width: `${Math.round(progress.done * 100)}%` },
                ]}
              />
            </View>
          </>
        )}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACE.md,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.sm,
    borderRadius: 12,
  },
  time: { width: 48, alignItems: 'flex-end' },
  bar: { width: 4, borderRadius: 2 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: SPACE.sm, alignItems: 'center' },
  place: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  going: { marginTop: SPACE.xs },
  track: { height: 4, borderRadius: 2, marginTop: SPACE.xs, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
