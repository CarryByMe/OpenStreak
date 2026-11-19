/**
 * «Неделя сеткой» (design/schedule, экран 3): столбцы дней, часы слева, занятия — блоками по времени,
 * линия «сейчас» в сегодняшнем столбце. Нажатие на блок — правка занятия.
 * Выходные без занятий не показываются.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, weekday } from '../../core/dates';
import { live } from '../../core/model';
import { dateInWeek, minutesOf, slotsOf, weekDays, weekOf } from '../../core/schedule';
import { settingsOf } from '../../core/settings';
import { useDataStore } from '../../core/store';
import type { MessageKey } from '../../i18n';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { ScreenHeader } from '../../ui/ScreenHeader';
import { Segmented } from '../../ui/Segmented';
import { LessonSheet } from './LessonSheet';
import { cap, lessonColor, useClock } from './scheduleUi';

/** Высота часа в сетке. */
const HOUR = 44;
const HOURS_W = 26;

export function WeekScreen({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const t = useT();
  const insets = useSafeAreaInsets();
  const data = useDataStore((s) => s.data);
  const today = useDataStore((s) => s.today);
  const s = settingsOf(data);
  const now = useClock();
  const lessons = useMemo(() => live(data.lessons), [data.lessons]);
  const current = weekOf(today, s).parity;
  const [parity, setParity] = useState<'odd' | 'even'>(current);
  const [sheet, setSheet] = useState<{ id: string; seq: number } | null>(null);
  const [seq, setSeq] = useState(0);
  const thisWeek = !s.weekParity || parity === current;

  const columns = weekDays(s.weekStart)
    .map((d) => {
      const date = dateInWeek(today, d, s.weekStart);
      return { d, slots: slotsOf(lessons, thisWeek ? date : addDays(date, 7), s) };
    })
    // Будни — всегда, выходные — только с занятиями.
    .filter((c) => (c.d >= 1 && c.d <= 5) || c.slots.length > 0);

  const all = columns.flatMap((c) => c.slots);
  const from = Math.min(8, ...all.map((x) => Math.floor((minutesOf(x.start) ?? 480) / 60)));
  const to = Math.max(20, ...all.map((x) => Math.ceil((minutesOf(x.end) ?? 1200) / 60)));
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const y = (time: string) => (((minutesOf(time) ?? from * 60) - from * 60) / 60) * HOUR;
  const height = (to - from) * HOUR;
  const nowMin = minutesOf(now) ?? 0;
  const showNow = thisWeek && nowMin >= from * 60 && nowMin <= to * 60;

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACE.md, paddingBottom: insets.bottom + SPACE.xl },
      ]}
    >
      <ScreenHeader title={t('schedule.grid')} onBack={onBack} />

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

      <View>
        <View style={styles.headRow}>
          <View style={{ width: HOURS_W }} />
          {columns.map(({ d }) => {
            const isToday = thisWeek && d === weekday(today);
            return (
              <Text
                key={d}
                style={[TYPE.meta, styles.dayName, { color: isToday ? p.text : p.muted }]}
              >
                {cap(t(`day.short.${d}` as MessageKey))}
              </Text>
            );
          })}
        </View>

        <View style={[styles.grid, { height }]}>
          <View style={{ width: HOURS_W }}>
            {hours.map((h) => (
              <Text
                key={h}
                style={[TYPE.meta, styles.hour, { color: p.muted, top: (h - from) * HOUR - 8 }]}
              >
                {h}
              </Text>
            ))}
          </View>
          {columns.map(({ d, slots }) => (
            <View key={d} style={styles.col}>
              {hours.map((h) => (
                <View
                  key={h}
                  style={[styles.line, { top: (h - from) * HOUR, borderTopColor: p.divider }]}
                />
              ))}
              {slots.map((slot) => {
                const color = lessonColor(p, slot.lesson, data.areas);
                const top = y(slot.start);
                return (
                  <Pressable
                    key={slot.lesson.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${slot.start}–${slot.end}, ${slot.lesson.title}`}
                    onPress={() => {
                      setSeq(seq + 1);
                      setSheet({ id: slot.lesson.id, seq: seq + 1 });
                    }}
                    style={[
                      styles.block,
                      {
                        top,
                        height: Math.max(22, y(slot.end) - top - 2),
                        backgroundColor: p.surface,
                        borderColor: p.divider,
                        borderLeftColor: color,
                      },
                    ]}
                  >
                    <Text numberOfLines={1} style={[styles.blockTitle, { color: p.text }]}>
                      {slot.lesson.title}
                    </Text>
                    <Text numberOfLines={1} style={[styles.blockTime, { color: p.muted }]}>
                      {slot.start}
                    </Text>
                  </Pressable>
                );
              })}
              {showNow && d === weekday(today) && (
                <View
                  accessible
                  accessibilityLabel={t('schedule.nowLine', { time: now })}
                  style={[styles.now, { top: y(now), backgroundColor: p.text }]}
                />
              )}
            </View>
          ))}
        </View>
      </View>

      {sheet && <LessonSheet key={sheet.seq} editId={sheet.id} onClose={() => setSheet(null)} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACE.screenX, gap: SPACE.lg },
  headRow: { flexDirection: 'row', gap: 4, marginBottom: SPACE.sm },
  dayName: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', gap: 4 },
  hour: { position: 'absolute', right: 4, fontSize: 11 },
  col: { flex: 1, position: 'relative' },
  line: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1 },
  block: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 6,
    borderWidth: 1,
    borderLeftWidth: 3,
    paddingHorizontal: 3,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  blockTitle: { ...TYPE.meta, fontSize: 11, lineHeight: 13 },
  blockTime: { ...TYPE.meta, fontSize: 10, lineHeight: 12 },
  now: { position: 'absolute', left: -2, right: 0, height: 2, borderRadius: 1 },
});
