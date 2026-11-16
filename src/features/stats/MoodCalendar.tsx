/**
 * Календарь настроения: оценка дня из «Итога дня» за последние пять недель. В «Мульте» — луна
 * (от новолуния «слил» до полнолуния «красава»), в «Минималистичном» — квадрат с заливкой по оценке,
 * в «Обычном» — лицо (оттенки акцента).
 * Дни без итога — пунктир, будущие — пустое место.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { weekday as weekdayOf } from '../../core/dates';
import { moodPhase } from '../../core/day';
import { moodCalendar, type MoodCell } from '../../core/mood';
import type { ISODate } from '../../core/model';
import { effectiveSettings } from '../../core/settings';
import { useDataStore } from '../../core/store';
import type { MessageKey } from '../../i18n';
import { useT } from '../../store/prefsStore';
import { useDesign, usePalette, usePlain, useSoft } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { MoodFace } from '../../ui/MoodFace';
import { Moon } from '../../ui/Moon';
import { dayMonth } from '../format';

const MOODS = [1, 2, 3, 4, 5] as const;
const CELL = 30;

/** Клетка одного дня; `mood` null — без оценки. */
export function MoodMark({
  mood,
  today,
  size = CELL,
}: {
  mood: number | null;
  today?: boolean;
  size?: number;
}) {
  const p = usePalette();
  const plain = usePlain();
  const soft = useSoft();
  if (soft) {
    // «Обычный»: лицо оценки; без оценки — пунктирный круг, сегодня — кольцо акцента.
    if (mood !== null) return <MoodFace mood={mood} size={size} />;
    return (
      <View
        style={{
          width: size - 4,
          height: size - 4,
          borderRadius: size,
          borderWidth: today ? 2.5 : 1.5,
          borderStyle: today ? 'solid' : 'dashed',
          borderColor: today ? p.sun : p.muted,
        }}
      />
    );
  }
  if (plain) {
    const box = { width: size, height: size, borderRadius: 5, overflow: 'hidden' as const };
    if (mood === null) {
      return (
        <View
          style={[
            box,
            { borderWidth: today ? 2.5 : 1.5, borderStyle: today ? 'solid' : 'dashed' },
            { borderColor: today ? p.text : p.muted },
          ]}
        />
      );
    }
    return (
      <View style={[box, { borderWidth: 1.75, borderColor: p.text }]}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: `${mood * 20}%`,
            backgroundColor: p.sun,
          }}
        />
      </View>
    );
  }
  if (mood === null) return <Moon phase={0} size={size} dashed ring={today ? 'ring' : 'muted'} />;
  return <Moon phase={moodPhase(mood)} size={size} ring={mood === 1 ? 'red' : 'ring'} />;
}

type CalendarProps = {
  /** нажатие на день — открыть итоги этого дня (дневник) */
  onOpenDay?: (date: ISODate) => void;
  /** ссылка «История» */
  onOpenHistory?: () => void;
};

export function MoodCalendar({ onOpenDay, onOpenHistory }: CalendarProps) {
  const p = usePalette();
  // Ссылка акцентом; в «АУФ» жёлтый на кремовом не проходит контраст — там бирюзовый.
  const link = useDesign() === 'auf' ? p.teal : p.sun;
  const t = useT();
  const data = useDataStore((s) => s.data);
  const today = useDataStore((s) => s.today);
  const weekStart = effectiveSettings(data).weekStart;
  const cal = useMemo(() => moodCalendar(data, today, weekStart), [data, today, weekStart]);
  const moodName = (m: number) => t(`review.mood.${m}` as MessageKey);
  const head = cal.weeks[0]!.map((c) => c.date);

  const describe = (c: MoodCell) =>
    `${dayMonth(t, c.date)}: ${c.mood === null ? t('mood.none') : moodName(c.mood)}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={[TYPE.control, { color: p.text }]}>{t('mood.title')}</Text>
        {onOpenHistory && (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenHistory}
            hitSlop={8}
            style={styles.history}
          >
            <Text style={[TYPE.control, { color: link }]}>{t('review.history')}</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.head}>
        <Text style={[TYPE.meta, { color: p.muted }]}>
          {t('mood.rated', { count: cal.rated })}
          {cal.average !== null &&
            ` · ${t('mood.average', { mood: moodName(cal.average).toLowerCase() })}`}
        </Text>
      </View>

      <View style={styles.row}>
        {head.map((d: ISODate) => (
          <Text key={d} style={[TYPE.tiny, styles.cell, { color: p.muted }]}>
            {t(`day.short.${weekdayOf(d)}` as MessageKey)}
          </Text>
        ))}
      </View>
      {cal.weeks.map((week) => (
        <View key={week[0]!.date} style={styles.row}>
          {week.map((c) => (
            <Pressable
              key={c.date}
              style={styles.cell}
              disabled={c.future || !onOpenDay}
              accessible={!c.future}
              accessibilityRole={onOpenDay && !c.future ? 'button' : undefined}
              accessibilityLabel={
                c.future
                  ? undefined
                  : onOpenDay
                    ? `${describe(c)}. ${t('review.dayOpen', { date: dayMonth(t, c.date) })}`
                    : describe(c)
              }
              onPress={() => onOpenDay?.(c.date)}
            >
              {!c.future && <MoodMark mood={c.mood} today={c.today} />}
              {!c.future && (
                <Text
                  style={[c.today ? TYPE.mark : TYPE.tiny, { color: c.today ? p.text : p.muted }]}
                >
                  {Number(c.date.slice(8, 10))}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}

      {cal.rated === 0 ? (
        <Text style={[TYPE.caption, { color: p.muted }]}>{t('mood.empty')}</Text>
      ) : (
        <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no">
          {MOODS.map((m) => (
            <View key={m} style={styles.legendItem}>
              <MoodMark mood={m} size={18} />
              <Text numberOfLines={1} style={[TYPE.tiny, { color: p.muted }]}>
                {moodName(m)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACE.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  history: { minHeight: 32, justifyContent: 'center' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', textAlign: 'center', gap: 2, minHeight: 0 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: SPACE.xs },
  legendItem: { alignItems: 'center', gap: 2, flex: 1 },
});
