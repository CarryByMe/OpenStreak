/**
 * Итоги → одна привычка за год (design/stats, экран 3): каждый день клеткой (ярче — больше сделано),
 * серия сейчас и лучшая, процент за год и разница с прошлым, всего, слабый день недели и тренд
 * по месяцам.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { liveCheck } from '../../core/habits';
import { habitYear } from '../../core/stats';
import { settingsOf } from '../../core/settings';
import { useDataStore } from '../../core/store';
import type { MessageKey } from '../../i18n';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { HeatScale, LineChart, YearHeat } from '../../ui/charts';
import { Card } from '../../ui/Sticker';
import { dayMonth } from '../format';
import {
  delta,
  DeltaText,
  monthShort,
  pct,
  PeriodBar,
  Section,
  StatsPage,
  usePeriod,
  weekdayName,
  type Delta,
} from './statsUi';

type Props = { habitId: string; year: number; onBack: () => void };

export function HabitYearScreen({ habitId, year, onBack }: Props) {
  const t = useT();
  const data = useDataStore((s) => s.data);
  const state = usePeriod({ kind: 'year', anchor: `${year}-01-01` });
  const { period, today } = state;
  const y = Number(period.from.slice(0, 4));
  const habit = data.habits[habitId];
  const r = useMemo(() => habitYear(data, habitId, y, today), [data, habitId, y, today]);
  const { weekStart } = settingsOf(data);
  if (!habit || !r)
    return (
      <StatsPage title="" onBack={onBack}>
        {null}
      </StatsPage>
    );

  const unit = t(`unit.${habit.unit}` as MessageKey);
  const valueText = (level: number | null, i: number) => {
    const c = r.cells[i];
    const v = liveCheck(data, habitId, c.date)?.value ?? 0;
    if (habit.measure === 'numeric') return `${v} ${unit}`;
    return level && level >= 3 ? '✓' : '—';
  };
  const months = r.months.map((m) => (m === null ? null : Math.round(m * 100)));
  const known = months.filter((m): m is number => m !== null);
  const rateDelta = delta(t, 'year', r.rate.value, r.rate.prev, pct);

  return (
    <StatsPage title={habit.name} onBack={onBack}>
      <PeriodBar state={state} kinds={['year']} />

      <Section title={t('stats.year.cells')}>
        <YearHeat
          cells={r.cells}
          weekStart={weekStart}
          monthLabels={Array.from({ length: 12 }, (_, i) => monthShort(t, i))}
          tip={(i) =>
            t('stats.year.cellA11y', {
              date: dayMonth(t, r.cells[i].date),
              value: valueText(r.cells[i].level, i),
            })
          }
          a11yLabel={`${t('stats.year.rate')}: ${r.rate.value === null ? '—' : pct(r.rate.value)}`}
        />
        <HeatScale less={t('stats.year.less')} more={t('stats.year.more')} />
      </Section>

      <View style={styles.facts}>
        <Fact
          k={t('stats.year.streak')}
          v={t('stats.days', { count: r.streak })}
          s={t('stats.year.bestRun', { count: r.best.days })}
        />
        <Fact
          k={t('stats.year.rate')}
          v={r.rate.value === null ? '—' : pct(r.rate.value)}
          delta={rateDelta}
        />
        <Fact
          k={t('stats.year.total')}
          v={
            habit.measure === 'numeric'
              ? habit.unit === 'minutes' && r.total >= 120
                ? t('stats.hours', { count: Math.round(r.total / 60) })
                : `${Math.round(r.total)} ${unit}`
              : t('stats.days', { count: r.doneDays })
          }
          s={
            habit.measure === 'numeric'
              ? t('stats.year.doneDays', { count: r.doneDays })
              : undefined
          }
        />
        <Fact
          k={t('stats.year.weak')}
          v={r.weakDay ? weekdayName(t, r.weakDay.day) : t('stats.year.noWeak')}
          s={
            r.weakDay
              ? t('stats.year.weakHint', {
                  rate: pct(r.weakDay.rate),
                  others: pct(r.weakDay.others),
                })
              : t('stats.year.noWeakHint')
          }
        />
      </View>

      {known.length >= 2 && (
        <Section title={t('stats.year.months')} hint={t('stats.percentDone')}>
          <LineChart
            values={months}
            min={Math.max(0, Math.floor(Math.min(...known) / 10) * 10 - 10)}
            max={100}
            labels={months.map((_, i) => (i % 2 === 0 ? monthShort(t, i) : ''))}
            format={(v) => `${Math.round(v)}%`}
            tip={(i) =>
              `${t(`cal.month.${i}` as MessageKey)}${months[i] === null ? '' : `: ${months[i]}%`}`
            }
            a11yLabel={months
              .map((m, i) => (m === null ? null : `${monthShort(t, i)}: ${m}%`))
              .filter(Boolean)
              .join('; ')}
          />
        </Section>
      )}
    </StatsPage>
  );
}

function Fact({ k, v, s, delta: d }: { k: string; v: string; s?: string; delta?: Delta | null }) {
  const p = usePalette();
  return (
    <Card style={styles.fact}>
      <View accessible accessibilityLabel={[k, v, s, d?.a11y].filter(Boolean).join(', ')}>
        <Text style={[TYPE.meta, { color: p.muted }]}>{k}</Text>
        <Text style={[TYPE.numberM, { color: p.text }]}>{v}</Text>
        {!!s && <Text style={[TYPE.meta, { color: p.muted }]}>{s}</Text>}
        {d && <DeltaText delta={d} />}
      </View>
    </Card>
  );
}

export { Fact };

const styles = StyleSheet.create({
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  fact: { flexBasis: '47%', flexGrow: 1 },
});
