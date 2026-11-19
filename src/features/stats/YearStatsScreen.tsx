/**
 * Итоги → «Итоги года» (design/stats, экран 6): сколько всего сделано и разница с прошлым годом,
 * выполнение по месяцам, лучший месяц, самая длинная серия, время на привычку, занятия по расписанию,
 * закрытые цели и средний итог дня. Пустые факты не показываются.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { yearSummary } from '../../core/stats';
import { useDataStore } from '../../core/store';
import type { MessageKey } from '../../i18n';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { ColumnChart } from '../../ui/charts';
import { Card } from '../../ui/Sticker';
import { groupDigits } from '../format';
import { Fact } from './HabitYearScreen';
import { dec, monthShort, pct, PeriodBar, Section, StatsPage, usePeriod } from './statsUi';

type Props = { year: number; onBack: () => void };

export function YearStatsScreen({ year, onBack }: Props) {
  const p = usePalette();
  const t = useT();
  const data = useDataStore((s) => s.data);
  const state = usePeriod({ kind: 'year', anchor: `${year}-01-01` });
  const { period, today } = state;
  const y = Number(period.from.slice(0, 4));
  const r = useMemo(() => yearSummary(data, y, today), [data, y, today]);
  const months = r.months.map((m) => (m === null ? null : Math.round(m * 100)));
  const current = today.startsWith(String(y)) ? Number(today.slice(5, 7)) - 1 : undefined;

  const change =
    r.total.prev !== null && r.total.prev > 0 && r.total.value !== r.total.prev
      ? t(r.total.value > r.total.prev ? 'stats.yearMore' : 'stats.yearLess', {
          value: pct(Math.abs(r.total.value - r.total.prev) / r.total.prev),
          prev: y - 1,
        })
      : null;

  const facts: { k: string; v: string; s?: string }[] = [];
  if (r.bestMonth)
    facts.push({
      k: t('stats.yearBestMonth'),
      v: t(`cal.month.${r.bestMonth.month}` as MessageKey).toLowerCase(),
      s: t('stats.percentValue', { value: pct(r.bestMonth.rate) }),
    });
  if (r.longest)
    facts.push({
      k: t('stats.yearLongest'),
      v: t('stats.days', { count: r.longest.days }),
      s: t('stats.longestHint', { habit: r.longest.habit.name }),
    });
  if (r.timeHabit)
    facts.push({
      k: t('stats.yearTime'),
      v: t('stats.hours', { count: Math.round(r.timeHabit.minutes / 60) }),
      s: t('stats.timeHint', { days: r.timeHabit.days, habit: r.timeHabit.habit.name }),
    });
  if (r.lessons.count > 0)
    facts.push({
      k: t('stats.yearLessons'),
      v: groupDigits(r.lessons.count),
      s: t('stats.lessonsHint', { hours: Math.round(r.lessons.minutes / 60) }),
    });
  if (r.goals.total > 0)
    facts.push({
      k: t('stats.yearGoals'),
      v: t('stats.ofN', { a: r.goals.done, b: r.goals.total }),
      s: r.goals.example ? `«${r.goals.example}»` : undefined,
    });
  if (r.mood.value !== null)
    facts.push({
      k: t('stats.yearMood'),
      v: dec(t, r.mood.value),
      s: r.mood.prev !== null ? t('stats.moodPrev', { prev: dec(t, r.mood.prev) }) : undefined,
    });

  return (
    <StatsPage title={t('stats.yearTitle', { year: y })} onBack={onBack}>
      <PeriodBar state={state} kinds={['year']} />

      <Card>
        <View
          style={styles.hero}
          accessible
          accessibilityLabel={`${r.total.value}, ${t('stats.yearTotal')}`}
        >
          <Text style={[TYPE.numberXL, { color: p.text }]}>{groupDigits(r.total.value)}</Text>
          <Text style={[TYPE.meta, styles.heroSub, { color: p.muted }]}>
            {t('stats.yearTotal')}
          </Text>
        </View>
        {!!change && <Text style={[TYPE.meta, styles.change, { color: p.muted }]}>{change}</Text>}
      </Card>

      {months.some((m) => m !== null) && (
        <Section title={t('stats.byMonth')} hint={t('stats.percentDone')}>
          <ColumnChart
            values={months}
            max={100}
            labels={months.map((_, i) => monthShort(t, i))}
            highlight={current}
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

      {facts.length > 0 && (
        <View style={styles.facts}>
          {facts.map((f) => (
            <Fact key={f.k} k={f.k} v={f.v} s={f.s} />
          ))}
        </View>
      )}
    </StatsPage>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.md },
  heroSub: { flex: 1, paddingBottom: 8 },
  change: { marginTop: SPACE.sm },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
});
