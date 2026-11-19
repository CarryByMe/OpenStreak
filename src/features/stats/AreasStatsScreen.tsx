/**
 * Итоги → «Сферы и настроение» (design/stats, экран 5): куда ушли силы — сферы своими цветами,
 * сколько дел закрываешь в дни с разной оценкой, настроение по дням (у года — по месяцам).
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { areasReport, moodReport } from '../../core/stats';
import { useDataStore } from '../../core/store';
import type { MessageKey } from '../../i18n';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { ensureContrast } from '../../theme/readable';
import { TYPE } from '../../theme/type';
import { LineChart, MeterRow } from '../../ui/charts';
import { dayMonth } from '../format';
import {
  dec,
  monthShort,
  pct,
  PeriodBar,
  Section,
  StatsPage,
  usePeriod,
  type PeriodParams,
} from './statsUi';

type Props = { params?: PeriodParams; onBack: () => void };

export function AreasStatsScreen({ params, onBack }: Props) {
  const p = usePalette();
  const t = useT();
  const data = useDataStore((s) => s.data);
  const state = usePeriod(params);
  const { period, today } = state;
  const areas = useMemo(() => areasReport(data, period, today), [data, period, today]);
  const mood = useMemo(() => moodReport(data, period, today), [data, period, today]);
  const max = Math.max(1, ...areas.map((a) => a.count));
  const lagging = areas.filter((a) => a.debts > 0).sort((a, b) => b.debts - a.debts)[0];

  const avgOf = (moods: number[]) => {
    const g = mood.byMood.filter((m) => moods.includes(m.mood) && m.days > 0);
    const days = g.reduce((n, m) => n + m.days, 0);
    return days ? g.reduce((n, m) => n + (m.avgDone ?? 0) * m.days, 0) / days : null;
  };
  const high = avgOf([4, 5]);
  const low = avgOf([1, 2]);
  const maxDone = Math.max(1, ...mood.byMood.map((m) => m.avgDone ?? 0));
  const series = mood.series.map((s) => (s.from > today ? null : s.mood));
  const hasMood = series.some((m) => m !== null);

  return (
    <StatsPage title={t('stats.section.areas')} onBack={onBack}>
      <PeriodBar state={state} />

      <Section
        title={t('stats.areas.title')}
        hint={t('stats.areas.hint')}
        note={
          lagging
            ? t('stats.areas.debtsNote', { area: lagging.area.name, count: lagging.debts })
            : null
        }
      >
        {areas.length === 0 ? (
          <Text style={[TYPE.body, { color: p.muted }]}>{t('stats.areas.none')}</Text>
        ) : (
          areas.map((a, i) => {
            const color = ensureContrast(a.area.color, [p.bg, p.surface]);
            return (
              <MeterRow
                key={a.area.id}
                first={i === 0}
                dot={color}
                color={color}
                label={a.area.name}
                figure={String(a.count)}
                sub={pct(a.share)}
                value={a.count / max}
              />
            );
          })
        )}
      </Section>

      {mood.byMood.some((m) => m.days > 0) && (
        <Section
          title={t('stats.mood.vsTasks')}
          hint={t('stats.mood.perDay')}
          note={
            high !== null && low !== null
              ? t('stats.mood.note', { high: dec(t, high), low: dec(t, low) })
              : null
          }
        >
          {mood.byMood.map((m) => (
            <View
              key={m.mood}
              style={styles.moodRow}
              accessible
              accessibilityLabel={`${t('stats.mood.grade', { n: m.mood })}: ${m.avgDone === null ? '—' : dec(t, m.avgDone)}`}
            >
              <Text style={[TYPE.meta, styles.moodLabel, { color: p.muted }]}>
                {t('stats.mood.grade', { n: m.mood })}
              </Text>
              <View style={styles.moodTrack}>
                {m.avgDone !== null && m.avgDone > 0 && (
                  <View
                    style={[
                      styles.moodBar,
                      { width: `${(m.avgDone / maxDone) * 80}%`, backgroundColor: p.prioLow },
                    ]}
                  />
                )}
                <Text style={[TYPE.meta, { color: p.text }]}>
                  {m.avgDone === null ? '—' : dec(t, m.avgDone)}
                </Text>
              </View>
            </View>
          ))}
        </Section>
      )}

      <Section
        title={t(period.kind === 'year' ? 'stats.mood.seriesYear' : 'stats.mood.series')}
        hint="1–5"
      >
        {hasMood ? (
          <LineChart
            values={series}
            min={1}
            max={5}
            labels={mood.series.map((s, i) =>
              period.kind === 'year'
                ? i % 2 === 0
                  ? monthShort(t, i)
                  : ''
                : period.kind === 'week' || [1, 8, 15, 22, 29].includes(Number(s.from.slice(8, 10)))
                  ? String(Number(s.from.slice(8, 10)))
                  : ''
            )}
            format={(v) => String(Math.round(v))}
            tip={(i) => {
              const s = mood.series[i];
              const when =
                period.kind === 'year' ? t(`cal.month.${i}` as MessageKey) : dayMonth(t, s.from);
              return s.mood === null ? when : `${when}: ${dec(t, s.mood)}`;
            }}
            a11yLabel={mood.series
              .map((s) => (s.mood === null ? null : `${s.from}: ${dec(t, s.mood)}`))
              .filter(Boolean)
              .join('; ')}
          />
        ) : (
          <Text style={[TYPE.body, { color: p.muted }]}>{t('stats.mood.empty')}</Text>
        )}
      </Section>
    </StatsPage>
  );
}

const styles = StyleSheet.create({
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 26 },
  moodLabel: { width: 72 },
  moodTrack: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  moodBar: { height: 14, borderRadius: 4 },
});
