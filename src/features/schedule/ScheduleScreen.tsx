/**
 * «Расписание» (design/schedule, экран 2): полоса дней с цветными точками занятий, переключатель
 * чётной и нечётной недели (если включены), занятия выбранного дня, «Добавить занятие».
 * Под заголовком — «Неделя сеткой» и «Звонки».
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, weekday } from '../../core/dates';
import { live } from '../../core/model';
import { dateInWeek, slotsOf, weekDays, weekOf } from '../../core/schedule';
import { settingsOf } from '../../core/settings';
import { useDataStore } from '../../core/store';
import type { MessageKey } from '../../i18n';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { RADIUS, SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { AddRow } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { ScreenHeader } from '../../ui/ScreenHeader';
import { Segmented } from '../../ui/Segmented';
import { Card } from '../../ui/Sticker';
import { LessonSheet } from './LessonSheet';
import { cap, lessonColor } from './scheduleUi';
import { SlotRow } from './SlotRow';
import { WakeCard } from './WakeCard';

type Props = { onBack: () => void; onOpenWeek: () => void; onOpenBells: () => void };

export function ScheduleScreen({ onBack, onOpenWeek, onOpenBells }: Props) {
  const p = usePalette();
  const t = useT();
  const insets = useSafeAreaInsets();
  const data = useDataStore((s) => s.data);
  const today = useDataStore((s) => s.today);
  const s = settingsOf(data);
  const lessons = useMemo(() => live(data.lessons), [data.lessons]);
  const current = weekOf(today, s).parity;
  const [parity, setParity] = useState<'odd' | 'even'>(current);
  const [day, setDay] = useState(weekday(today));
  const [sheet, setSheet] = useState<{ id: string | null; seq: number } | null>(null);
  const [seq, setSeq] = useState(0);

  // Дата выбранного дня: эта неделя или соседняя, если смотрим другую чётность.
  const dateOf = (d: number) => {
    const date = dateInWeek(today, d, s.weekStart);
    return s.weekParity && parity !== current ? addDays(date, 7) : date;
  };
  const slots = slotsOf(lessons, dateOf(day), s);

  const open = (id: string | null) => {
    setSeq(seq + 1);
    setSheet({ id, seq: seq + 1 });
  };

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACE.md, paddingBottom: insets.bottom + SPACE.xl },
      ]}
    >
      <ScreenHeader title={t('schedule.title')} onBack={onBack} />

      <View style={styles.actions}>
        <Chip icon="calendar" label={t('schedule.grid')} onPress={onOpenWeek} />
        <Chip icon="remind" label={t('schedule.bells')} onPress={onOpenBells} />
      </View>

      {s.weekParity && (
        <Segmented<'odd' | 'even'>
          label={t('bells.parity')}
          value={parity}
          onChange={setParity}
          items={(['odd', 'even'] as const).map((v) => ({
            value: v,
            label:
              v === current
                ? t('schedule.parityNow', { parity: t(`schedule.parity.${v}`) })
                : t(`schedule.parity.${v}`),
          }))}
        />
      )}

      <View style={styles.days} accessibilityRole="radiogroup">
        {weekDays(s.weekStart).map((d) => {
          const sel = d === day;
          const daySlots = slotsOf(lessons, dateOf(d), s);
          const name = cap(t(`day.short.${d}` as MessageKey));
          return (
            <Pressable
              key={d}
              accessibilityRole="radio"
              accessibilityState={{ checked: sel }}
              accessibilityLabel={t('schedule.dayCount', { day: name, count: daySlots.length })}
              onPress={() => setDay(d)}
              style={[styles.day, { backgroundColor: sel ? p.sun : p.surface }]}
            >
              <Text style={[TYPE.control, { color: sel ? p.onSun : p.text }]}>{name}</Text>
              <View style={styles.dots}>
                {daySlots.slice(0, 4).map((x) => (
                  <View
                    key={x.lesson.id}
                    style={[
                      styles.dot,
                      { backgroundColor: sel ? p.onSun : lessonColor(p, x.lesson, data.areas) },
                    ]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      {slots.length === 0 ? (
        <Text style={[TYPE.body, { color: p.muted }]}>{t('schedule.empty')}</Text>
      ) : (
        <Card padded={false} style={styles.list}>
          {slots.map((slot) => (
            <SlotRow key={slot.lesson.id} slot={slot} onPress={() => open(slot.lesson.id)} />
          ))}
        </Card>
      )}

      <AddRow label={t('schedule.add')} onPress={() => open(null)} />

      <WakeCard />

      {sheet && (
        <LessonSheet key={sheet.seq} editId={sheet.id} day={day} onClose={() => setSheet(null)} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACE.screenX, gap: SPACE.lg },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  days: { flexDirection: 'row', gap: SPACE.tight },
  day: {
    flex: 1,
    height: 58,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dots: { flexDirection: 'row', gap: 2, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  list: { paddingVertical: SPACE.xs, paddingHorizontal: SPACE.xs },
});
