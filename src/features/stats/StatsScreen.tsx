/**
 * «Итоги» в «Обычном» и «Минималистичном» (design/stats, экран 1): переключатель «Неделя · Месяц · Год»,
 * процент сделанного из запланированного и разница с прошлым периодом, четыре плитки, график по дням
 * (у года — по месяцам) со средним и вывод словами. Ниже — разделы и календарь настроения.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { overview, type Bucket } from '../../core/stats';
import { useDataStore } from '../../core/store';
import { useT, type Translate } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { ColumnChart } from '../../ui/charts';
import { Icon } from '../../ui/icons';
import { Card } from '../../ui/Sticker';
import { dayMonth } from '../format';
import { MoodCalendar } from './MoodCalendar';
import {
  dec,
  delta,
  DeltaText,
  KpiGrid,
  monthShort,
  pct,
  PeriodBar,
  Section,
  StatsPage,
  usePeriod,
  weekdayName,
  weekdayShort,
  type PeriodParams,
} from './statsUi';

export type StatsSection = 'habits' | 'tasks' | 'areas' | 'year';

type Props = {
  onOpenDay?: (date: string) => void;
  onOpenHistory?: () => void;
  onOpenSection?: (section: StatsSection, params: PeriodParams) => void;
};

/** Подпись столбика: день месяца, день недели или месяц. */
function bucketLabel(t: Translate, kind: string, b: Bucket, i: number, count: number): string {
  if (kind === 'year') return monthShort(t, i);
  if (kind === 'week') return weekdayShort(t, new Date(`${b.from}T00:00`).getDay());
  const day = Number(b.from.slice(8, 10));
  return day === 1 || day % 7 === 0 || i === count - 1 ? String(day) : '';
}

export function StatsScreen({ onOpenDay, onOpenHistory, onOpenSection }: Props) {
  const p = usePalette();
  const t = useT();
  const data = useDataStore((s) => s.data);
  const state = usePeriod();
  const { period, today } = state;
  const o = useMemo(() => overview(data, period, today), [data, period, today]);
  const kind = period.kind;

  const rates = o.buckets.map((b) => (b.rate === null ? null : Math.round(b.rate * 100)));
  const highlight = o.buckets.findIndex((b) => today >= b.from && today <= b.to);
  // Среднее — по законченным дням: сегодняшний столбик ещё растёт.
  const known = rates.filter(
    (r, i): r is number => r !== null && (kind === 'year' || i !== highlight)
  );
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
  const rateDelta = delta(t, kind, o.rate.value, o.rate.prev, pct);

  const note =
    o.bestWeekday && o.worstWeekday
      ? t('stats.bestDay', {
          best: weekdayName(t, o.bestWeekday.day),
          bestRate: pct(o.bestWeekday.rate),
          worst: weekdayName(t, o.worstWeekday.day),
          worstRate: pct(o.worstWeekday.rate),
        })
      : null;

  const params: PeriodParams = { kind, anchor: period.from > today ? today : period.from };
  const links: { key: StatsSection; label: string }[] = [
    { key: 'habits', label: t('stats.section.habits') },
    { key: 'tasks', label: t('stats.section.tasks') },
    { key: 'areas', label: t('stats.section.areas') },
    { key: 'year', label: t('stats.section.year', { year: period.from.slice(0, 4) }) },
  ];

  return (
    <StatsPage title={t('tab.stats')}>
      <PeriodBar state={state} />

      <Card>
        {o.rate.value === null ? (
          <Text style={[TYPE.body, { color: p.muted }]}>{t('stats.collecting')}</Text>
        ) : (
          <View
            style={styles.hero}
            accessible
            accessibilityLabel={[pct(o.rate.value), t('stats.rateHint'), rateDelta?.a11y]
              .filter(Boolean)
              .join(', ')}
          >
            <Text style={[TYPE.numberXL, { color: p.text }]}>{pct(o.rate.value)}</Text>
            <View style={styles.heroSub}>
              <Text style={[TYPE.meta, { color: p.muted }]}>{t('stats.rateHint')}</Text>
              {rateDelta && <DeltaText delta={rateDelta} />}
            </View>
          </View>
        )}
      </Card>

      <KpiGrid
        items={[
          {
            value: String(o.tasksDone.value),
            label: t('stats.kpi.tasks'),
            delta: delta(t, kind, o.tasksDone.value, o.tasksDone.prev, String),
          },
          {
            value: String(o.habitMarks.value),
            label: t('stats.kpi.marks'),
            delta: delta(t, kind, o.habitMarks.value, o.habitMarks.prev, String),
          },
          {
            value: o.bestRun ? t('stats.days', { count: o.bestRun.days }) : '—',
            label: o.bestRun
              ? `${t('stats.kpi.run')} · ${o.bestRun.habit.name}`
              : t('stats.kpi.run'),
          },
          {
            value: o.mood.value === null ? '—' : dec(t, o.mood.value),
            label: t('stats.kpi.mood'),
            delta: delta(t, kind, o.mood.value, o.mood.prev, (v) => dec(t, v)),
          },
        ]}
      />

      <Section
        title={t(kind === 'year' ? 'stats.byMonth' : 'stats.byDay')}
        hint={t('stats.percentDone')}
        note={note}
      >
        <ColumnChart
          values={rates}
          max={100}
          labels={o.buckets.map((b, i) => bucketLabel(t, kind, b, i, o.buckets.length))}
          highlight={highlight >= 0 ? highlight : undefined}
          avg={avg}
          avgLabel={avg !== null ? t('stats.avg', { value: `${Math.round(avg)}%` }) : undefined}
          format={(v) => `${Math.round(v)}%`}
          tip={(i) => {
            const b = o.buckets[i];
            const when =
              kind === 'year'
                ? t(`cal.month.${i}` as Parameters<Translate>[0])
                : dayMonth(t, b.from);
            return b.rate === null
              ? when
              : `${when}: ${pct(b.rate)} · ${t('stats.ofN', { a: b.done, b: b.planned })}`;
          }}
          a11yLabel={o.buckets
            .map((b, i) =>
              b.rate === null ? null : `${bucketLabel(t, kind, b, i, 0) || b.from}: ${pct(b.rate)}`
            )
            .filter(Boolean)
            .join('; ')}
        />
      </Section>

      <Card padded={false}>
        {links.map((l, i) => (
          <Pressable
            key={l.key}
            accessibilityRole="button"
            onPress={() => onOpenSection?.(l.key, params)}
            style={({ pressed }) => [
              styles.link,
              i > 0 && { borderTopWidth: 1, borderTopColor: p.divider },
              pressed && { backgroundColor: p.bg },
            ]}
          >
            <Text style={[TYPE.row, { color: p.text, flex: 1 }]}>{l.label}</Text>
            <Icon name="chevron" size={16} tone="muted" />
          </Pressable>
        ))}
      </Card>

      <MoodCalendar onOpenDay={onOpenDay} onOpenHistory={onOpenHistory} />
    </StatsPage>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.md },
  heroSub: { flex: 1, paddingBottom: 6, gap: 2 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingHorizontal: SPACE.lg,
  },
});
