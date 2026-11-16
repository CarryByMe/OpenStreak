/**
 * Календарь настроения: оценка дня из «Итога дня» за последние пять недель. В «Мульте» — луна
 * (от новолуния «слил» до полнолуния «красава»), в «Обычном» — квадрат с заливкой по оценке.
 * Дни без итога — пунктир, будущие — пустое место.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { weekday as weekdayOf } from '../../core/dates';
import { moodPhase } from '../../core/day';
import { moodCalendar, type MoodCell } from '../../core/mood';
import type { ISODate } from '../../core/model';
import { effectiveSettings } from '../../core/settings';
import { useDataStore } from '../../core/store';
import type { MessageKey } from '../../i18n';
import { useT } from '../../store/prefsStore';
import { usePalette, usePlain } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { Moon } from '../../ui/Moon';
import { dayMonth } from '../format';

const MOODS = [1, 2, 3, 4, 5] as const;
const CELL = 30;

/** Клетка одного дня; `mood` null — без оценки. */
function MoodMark({
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

export function MoodCalendar() {
  const p = usePalette();
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
            <View
              key={c.date}
              style={styles.cell}
              accessible={!c.future}
              accessibilityLabel={c.future ? undefined : describe(c)}
            >
              {!c.future && <MoodMark mood={c.mood} today={c.today} />}
              {!c.future && (
                <Text
                  style={[c.today ? TYPE.mark : TYPE.tiny, { color: c.today ? p.text : p.muted }]}
                >
                  {Number(c.date.slice(8, 10))}
                </Text>
              )}
            </View>
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
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', textAlign: 'center', gap: 2, minHeight: 0 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: SPACE.xs },
  legendItem: { alignItems: 'center', gap: 2, flex: 1 },
});
