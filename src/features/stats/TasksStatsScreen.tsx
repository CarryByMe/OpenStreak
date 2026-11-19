/**
 * Итоги → «Дела» (design/stats, экран 4): сколько сделано и сколько вовремя, средняя задержка долгов,
 * что висит дольше недели, когда делаешь — по часам, выполнение по приоритету.
 */
import React, { useMemo } from 'react';
import { tasksReport } from '../../core/stats';
import { useDataStore } from '../../core/store';
import type { MessageKey } from '../../i18n';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { ColumnChart, MeterRow } from '../../ui/charts';
import {
  dec,
  delta,
  KpiGrid,
  pct,
  PeriodBar,
  Section,
  StatsPage,
  usePeriod,
  type PeriodParams,
} from './statsUi';

/** Часы на графике: с 6 утра до 5 утра следующего дня — ночь в конце, а не в начале. */
const HOURS = Array.from({ length: 24 }, (_, i) => (i + 6) % 24);

type Props = { params?: PeriodParams; onBack: () => void };

export function TasksStatsScreen({ params, onBack }: Props) {
  const p = usePalette();
  const t = useT();
  const data = useDataStore((s) => s.data);
  const state = usePeriod(params);
  const { period, today } = state;
  const r = useMemo(() => tasksReport(data, period, today), [data, period, today]);
  const kind = period.kind;
  const byHour = HOURS.map((h) => r.byHour[h]);
  const peak = byHour.some((v) => v > 0) ? HOURS[byHour.indexOf(Math.max(...byHour))] : null;
  const prioColor = [p.muted, p.prioLow, p.prioMid, p.red];

  return (
    <StatsPage title={t('stats.section.tasks')} onBack={onBack}>
      <PeriodBar state={state} />

      <KpiGrid
        items={[
          {
            value: String(r.done.value),
            label: t('stats.tasks.done'),
            delta: delta(t, kind, r.done.value, r.done.prev, String),
          },
          {
            value: r.onTime.value === null ? '—' : pct(r.onTime.value),
            label: t('stats.tasks.onTime'),
            delta: delta(t, kind, r.onTime.value, r.onTime.prev, pct),
          },
          {
            value:
              r.avgDelay.value === null
                ? '—'
                : t('stats.daysValue', { value: dec(t, r.avgDelay.value) }),
            label: t('stats.tasks.delay'),
          },
          { value: String(r.stale), label: t('stats.tasks.stale') },
        ]}
      />

      {peak !== null && (
        <Section
          title={t('stats.tasks.byHour')}
          hint={t('stats.tasks.byHourHint')}
          note={t('stats.tasks.peak', { hour: peak })}
        >
          <ColumnChart
            values={byHour}
            labels={HOURS.map((h) => (h % 4 === 0 ? String(h) : ''))}
            highlight={HOURS.indexOf(peak)}
            format={(v) => String(Math.round(v))}
            tip={(i) => `${HOURS[i]}:00–${HOURS[i]}:59 · ${byHour[i]}`}
            a11yLabel={HOURS.filter((h) => r.byHour[h] > 0)
              .map((h) => `${h}:00 — ${r.byHour[h]}`)
              .join('; ')}
            height={110}
          />
        </Section>
      )}

      {r.byPriority.some((x) => x.total > 0) && (
        <Section title={t('stats.tasks.byPriority')} hint={t('stats.tasks.doneOfTotal')}>
          {r.byPriority
            .filter((x) => x.total > 0)
            .map((x, i) => (
              <MeterRow
                key={x.priority}
                first={i === 0}
                dot={prioColor[x.priority]}
                color={prioColor[x.priority]}
                label={t(`priority.${x.priority}` as MessageKey)}
                figure={t('stats.tasks.ofTotal', { done: x.done, total: x.total })}
                sub={pct(x.done / x.total)}
                value={x.done / x.total}
              />
            ))}
        </Section>
      )}
    </StatsPage>
  );
}
