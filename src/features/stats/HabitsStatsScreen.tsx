/**
 * Итоги → «Привычки» (design/stats, экран 2): выполнение каждой привычки по плану, серия или срывы,
 * доля по дням недели и число отметок по дням, неделям или месяцам. Нажатие на привычку —
 * её год клетками.
 */
import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { habitsReport } from '../../core/stats';
import { useDataStore } from '../../core/store';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { TYPE } from '../../theme/type';
import { ColumnChart, MeterRow } from '../../ui/charts';
import { dayMonth } from '../format';
import {
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
import { weekDays } from '../../core/schedule';
import { settingsOf } from '../../core/settings';

type Props = {
  params?: PeriodParams;
  onBack: () => void;
  onOpenHabit: (id: string, year: number) => void;
};

export function HabitsStatsScreen({ params, onBack, onOpenHabit }: Props) {
  const p = usePalette();
  const t = useT();
  const data = useDataStore((s) => s.data);
  const state = usePeriod(params);
  const { period, today } = state;
  const r = useMemo(() => habitsReport(data, period, today), [data, period, today]);
  const { weekStart } = settingsOf(data);
  const order = weekDays(weekStart);
  const rated = r.rows.filter((x) => x.rate !== null);

  const wd = order
    .map((d) => ({ d, rate: r.byWeekday[d] }))
    .filter((x): x is { d: number; rate: number } => x.rate !== null);
  const best = wd.length ? wd.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
  const worst = wd.length ? wd.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;
  const wdNote =
    best && worst && best.rate - worst.rate >= 0.1
      ? t('stats.habits.weekdayNote', {
          worst: weekdayName(t, worst.d),
          worstRate: pct(worst.rate),
          best: weekdayName(t, best.d),
          bestRate: pct(best.rate),
        })
      : null;

  const marksHint =
    period.kind === 'week'
      ? t('stats.habits.byDays')
      : period.kind === 'month'
        ? t('stats.habits.byWeeks')
        : t('stats.habits.byMonths');
  const markLabel = (from: string, i: number) =>
    period.kind === 'year'
      ? monthShort(t, i)
      : period.kind === 'week'
        ? weekdayShort(t, new Date(`${from}T00:00`).getDay())
        : String(Number(from.slice(8, 10)));
  const current = r.marks.findIndex(
    (m, i) => m.from <= today && (r.marks[i + 1]?.from ?? '9999') > today
  );

  return (
    <StatsPage title={t('stats.section.habits')} onBack={onBack}>
      <PeriodBar state={state} />

      {r.rows.length === 0 || rated.length === 0 ? (
        <Text style={[TYPE.body, { color: p.muted }]}>{t('stats.empty')}</Text>
      ) : (
        <>
          <Section title={t('stats.habits.rate')} hint={t('stats.habits.rateHint')}>
            {rated
              .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
              .map((x, i) => (
                <MeterRow
                  key={x.habit.id}
                  first={i === 0}
                  label={x.habit.name}
                  badge={x.habit.kind === 'bad' ? t('stats.habits.bad') : undefined}
                  figure={pct(x.rate ?? 0)}
                  sub={
                    x.habit.kind === 'bad' || x.slips > 0
                      ? t('stats.habits.slips', { count: x.slips })
                      : x.streak !== null
                        ? t('stats.habits.streak', { count: x.streak })
                        : undefined
                  }
                  value={x.rate ?? 0}
                  onPress={() => onOpenHabit(x.habit.id, Number(period.from.slice(0, 4)))}
                />
              ))}
          </Section>

          {wd.length > 0 && (
            <Section
              title={t('stats.habits.byWeekday')}
              hint={t('stats.habits.allHabits')}
              note={wdNote}
            >
              <ColumnChart
                values={order.map((d) =>
                  r.byWeekday[d] === null ? null : Math.round(r.byWeekday[d]! * 100)
                )}
                max={100}
                labels={order.map((d) => weekdayShort(t, d))}
                highlight={best ? order.indexOf(best.d) : undefined}
                format={(v) => `${Math.round(v)}%`}
                tip={(i) => {
                  const v = r.byWeekday[order[i]];
                  return `${weekdayName(t, order[i])}${v === null ? '' : `: ${pct(v)}`}`;
                }}
                a11yLabel={wd.map((x) => `${weekdayName(t, x.d)}: ${pct(x.rate)}`).join('; ')}
                height={110}
              />
            </Section>
          )}

          <Section title={t('stats.habits.marks')} hint={marksHint}>
            <ColumnChart
              values={r.marks.map((m) => (m.from > today ? null : m.count))}
              labels={r.marks.map((m, i) => markLabel(m.from, i))}
              highlight={current >= 0 ? current : undefined}
              format={(v) => String(Math.round(v))}
              tip={(i) =>
                `${period.kind === 'year' ? monthShort(t, i) : dayMonth(t, r.marks[i].from)}: ${r.marks[i].count}`
              }
              a11yLabel={r.marks.map((m, i) => `${markLabel(m.from, i)}: ${m.count}`).join('; ')}
              height={100}
            />
          </Section>
        </>
      )}
    </StatsPage>
  );
}
