/**
 * Календарь дел (как в монолите): неделя, месяц, год. В клетке дня — число и плашки дел
 * (чёрная — в работе, бирюзовая — сделано, красная — долг), флажок — срок цели. Тап по дню
 * выбирает его: список дня показывает экран «Дела». В годе дни — точки, тап по месяцу открывает его.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  dayBars,
  entryOf,
  monthGrid,
  shiftCursor,
  weekDays,
  yearMonths,
  type BarKind,
  type CalView,
  type DayEntry,
} from '../../core/calendar';
import type { ISODate } from '../../core/model';
import { weekday } from '../../core/dates';
import type { MessageKey } from '../../i18n';
import { useT, type Translate } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { RADIUS, SPACE, STROKE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { IconButton } from '../../ui/Button';
import { Icon } from '../../ui/icons';
import { Segmented } from '../../ui/Segmented';
import { Card } from '../../ui/Sticker';
import { dayMonth } from '../format';

const VIEWS: readonly CalView[] = ['week', 'month', 'year'];

type Props = {
  view: CalView;
  cursor: ISODate;
  selected: ISODate;
  today: ISODate;
  weekStart: 0 | 1;
  index: Map<ISODate, DayEntry>;
  onView: (v: CalView) => void;
  onCursor: (d: ISODate) => void;
  onSelect: (d: ISODate) => void;
};

function title(t: Translate, view: CalView, cursor: ISODate, weekStart: 0 | 1): string {
  if (view === 'year') return cursor.slice(0, 4);
  if (view === 'month') {
    return `${t(`cal.month.${Number(cursor.slice(5, 7)) - 1}` as MessageKey)} ${cursor.slice(0, 4)}`;
  }
  const days = weekDays(cursor, weekStart);
  return `${dayMonth(t, days[0]!)} – ${dayMonth(t, days[6]!)}`;
}

export function TaskCalendar(props: Props) {
  const { view, cursor, weekStart, onView, onCursor } = props;
  const p = usePalette();
  const t = useT();
  return (
    <Card radius={RADIUS.xl} style={styles.card}>
      <View style={styles.head}>
        <IconButton
          icon="back"
          label={t('cal.prev')}
          onPress={() => onCursor(shiftCursor(cursor, view, -1))}
        />
        <Text
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          style={[TYPE.control, styles.title, { color: p.text }]}
        >
          {title(t, view, cursor, weekStart)}
        </Text>
        <IconButton
          icon="arrow"
          label={t('cal.next')}
          onPress={() => onCursor(shiftCursor(cursor, view, 1))}
        />
      </View>
      <Segmented<CalView>
        label={t('tab.tasks')}
        on="bg"
        value={view}
        onChange={onView}
        items={VIEWS.map((v) => ({ value: v, label: t(`cal.view.${v}` as MessageKey) }))}
      />
      {view === 'month' && <MonthView {...props} />}
      {view === 'week' && <WeekView {...props} />}
      {view === 'year' && <YearView {...props} />}
    </Card>
  );
}

/** Плашка дела: цвет — смысл (в работе / сделано / долг). */
function Bar({ kind, height }: { kind: BarKind; height: number }) {
  const p = usePalette();
  const color = kind === 'done' ? p.teal : kind === 'debt' ? p.red : p.text;
  return <View style={{ height, borderRadius: height / 2, backgroundColor: color }} />;
}

function useCellLabel() {
  const t = useT();
  return (date: ISODate, count: number) =>
    count > 0
      ? t('cal.cell', { date: dayMonth(t, date), count })
      : t('cal.cellEmpty', { date: dayMonth(t, date) });
}

function Weekdays({ weekStart }: { weekStart: 0 | 1 }) {
  const p = usePalette();
  const t = useT();
  return (
    <View style={styles.row}>
      {Array.from({ length: 7 }, (_, i) => (i + weekStart) % 7).map((d) => (
        <Text key={d} style={[TYPE.tiny, styles.dow, { color: p.muted }]}>
          {t(`day.short.${d}` as MessageKey)}
        </Text>
      ))}
    </View>
  );
}

function DayNumber({
  date,
  today,
  muted,
  size,
}: {
  date: ISODate;
  today: boolean;
  muted?: boolean;
  size: number;
}) {
  const p = usePalette();
  return (
    <View
      style={[
        styles.num,
        { width: size, height: size, borderRadius: size / 2 },
        today && { backgroundColor: p.sun },
      ]}
    >
      <Text
        style={[
          today ? TYPE.mark : TYPE.caption,
          { color: today ? p.onSun : muted ? p.muted : p.text },
        ]}
      >
        {Number(date.slice(8, 10))}
      </Text>
    </View>
  );
}

function MonthView({ cursor, selected, today, weekStart, index, onSelect }: Props) {
  const p = usePalette();
  const label = useCellLabel();
  return (
    <View style={styles.body}>
      <Weekdays weekStart={weekStart} />
      <View style={styles.grid}>
        {monthGrid(cursor, weekStart).map(({ date, inMonth }) => {
          const e = entryOf(index, date);
          const bars = dayBars(e.tasks, today);
          const sel = date === selected;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={label(date, e.tasks.length)}
              accessibilityState={{ selected: sel }}
              onPress={() => onSelect(date)}
              style={[
                styles.cell,
                sel && { backgroundColor: p.tag, borderColor: p.line, borderWidth: STROKE.thin },
              ]}
            >
              <DayNumber date={date} today={date === today} muted={!inMonth} size={26} />
              <View style={styles.bars}>
                {bars.slice(0, 3).map((k, i) => (
                  <Bar key={i} kind={k} height={3} />
                ))}
                {bars.length > 3 && (
                  <Text style={[TYPE.tiny, styles.more, { color: p.muted }]}>
                    +{bars.length - 3}
                  </Text>
                )}
              </View>
              {e.goals.length > 0 && <Icon name="goals" size={12} tone="text" />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function WeekView({ cursor, selected, today, weekStart, index, onSelect }: Props) {
  const p = usePalette();
  const t = useT();
  const label = useCellLabel();
  return (
    <View style={[styles.row, styles.weekRow]}>
      {weekDays(cursor, weekStart).map((date) => {
        const e = entryOf(index, date);
        const bars = dayBars(e.tasks, today);
        const sel = date === selected;
        return (
          <Pressable
            key={date}
            accessibilityRole="button"
            accessibilityLabel={label(date, e.tasks.length)}
            accessibilityState={{ selected: sel }}
            onPress={() => onSelect(date)}
            style={[
              styles.wcell,
              { backgroundColor: p.bg, borderColor: sel ? p.line : 'transparent' },
            ]}
          >
            <Text style={[TYPE.tiny, { color: date === today ? p.text : p.muted }]}>
              {t(`day.short.${weekday(date)}` as MessageKey)}
            </Text>
            <DayNumber date={date} today={date === today} size={28} />
            <View style={styles.bars}>
              {bars.slice(0, 4).map((k, i) => (
                <Bar key={i} kind={k} height={4} />
              ))}
              {bars.length > 4 && (
                <Text style={[TYPE.tiny, styles.more, { color: p.muted }]}>+{bars.length - 4}</Text>
              )}
            </View>
            {e.goals.length > 0 && <Icon name="goals" size={12} tone="text" />}
          </Pressable>
        );
      })}
    </View>
  );
}

function YearView({ cursor, today, weekStart, index, onCursor, onView }: Props) {
  const p = usePalette();
  const t = useT();
  return (
    <View style={styles.year}>
      {yearMonths(cursor, weekStart).map((m) => (
        <Pressable
          key={m.month}
          accessibilityRole="button"
          accessibilityLabel={t(`cal.month.${m.month}` as MessageKey)}
          onPress={() => {
            onCursor(m.first);
            onView('month');
          }}
          style={[styles.ym, { backgroundColor: p.bg }]}
        >
          <Text
            style={[
              TYPE.mark,
              { color: m.first.slice(0, 7) === today.slice(0, 7) ? p.text : p.muted },
            ]}
          >
            {t(`cal.month.${m.month}` as MessageKey)}
          </Text>
          <View style={styles.dots}>
            {Array.from({ length: m.offset }, (_, i) => (
              <View key={`o${i}`} style={styles.dotCell} />
            ))}
            {m.days.map((d) => {
              const e = entryOf(index, d);
              // Пустые дни — бледная точка-декор, чтобы читалась форма месяца.
              const filled = e.goals.length > 0 || e.tasks.length > 0;
              const color = e.goals.length ? p.teal : e.tasks.length ? p.text : p.divider;
              return (
                <View key={d} style={styles.dotCell}>
                  <View
                    style={[
                      styles.dot,
                      filled ? null : styles.dotEmpty,
                      { backgroundColor: color },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: SPACE.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  title: { flex: 1, textAlign: 'center' },
  body: { gap: SPACE.xs },
  row: { flexDirection: 'row' },
  dow: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 58,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: STROKE.thin,
    borderColor: 'transparent',
  },
  num: { alignItems: 'center', justifyContent: 'center' },
  bars: { width: '72%', gap: 2, minHeight: 3 },
  more: { textAlign: 'center' },
  weekRow: { gap: 4 },
  wcell: {
    flex: 1,
    minHeight: 104,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: STROKE.outline,
  },
  year: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ym: { width: '31.5%', flexGrow: 1, borderRadius: 12, padding: 8, gap: 6 },
  dots: { flexDirection: 'row', flexWrap: 'wrap' },
  dotCell: { width: `${100 / 7}%`, height: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  dotEmpty: { width: 3, height: 3, borderRadius: 1.5 },
});
