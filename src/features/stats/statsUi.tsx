/**
 * Общие части экранов «Итогов»: выбор периода, каркас экрана, карточка раздела, плитки чисел,
 * «↑ 6% к прошлому месяцу», форматы чисел и подписей.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ISODate } from '../../core/model';
import { periodOf, shiftPeriod, type Period, type PeriodKind } from '../../core/stats';
import { settingsOf } from '../../core/settings';
import { useDataStore } from '../../core/store';
import type { MessageKey } from '../../i18n';
import { useT, type Translate } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { IconButton } from '../../ui/Button';
import { ScreenHeader } from '../../ui/ScreenHeader';
import { Segmented } from '../../ui/Segmented';
import { Card } from '../../ui/Sticker';
import { dayMonth } from '../format';

export type PeriodParams = { kind: PeriodKind; anchor: ISODate };

const KINDS: PeriodKind[] = ['week', 'month', 'year'];

/** Период экрана: вид и якорная дата; по умолчанию — месяц, в котором сегодня. */
export function usePeriod(initial?: Partial<PeriodParams>) {
  const today = useDataStore((s) => s.today);
  const weekStart = settingsOf(useDataStore((s) => s.data)).weekStart;
  const [kind, setKind] = useState<PeriodKind>(initial?.kind ?? 'month');
  const [anchor, setAnchor] = useState<ISODate>(initial?.anchor ?? today);
  const period = periodOf(kind, anchor, weekStart);
  return {
    period,
    today,
    setKind: (k: PeriodKind) => {
      setKind(k);
      setAnchor(today);
    },
    shift: (dir: 1 | -1) => setAnchor(shiftPeriod(period, dir, weekStart).from),
    canNext: shiftPeriod(period, 1, weekStart).from <= today,
  };
}

export function periodTitle(t: Translate, p: Period): string {
  if (p.kind === 'year') return p.from.slice(0, 4);
  if (p.kind === 'month') {
    return `${t(`cal.month.${Number(p.from.slice(5, 7)) - 1}` as MessageKey)} ${p.from.slice(0, 4)}`;
  }
  return `${dayMonth(t, p.from)} – ${dayMonth(t, p.to)}`;
}

/** Переключатель «Неделя · Месяц · Год» и стрелки периода. */
export function PeriodBar({
  state,
  kinds = KINDS,
}: {
  state: ReturnType<typeof usePeriod>;
  kinds?: PeriodKind[];
}) {
  const p = usePalette();
  const t = useT();
  return (
    <View style={styles.periodWrap}>
      {kinds.length > 1 && (
        <Segmented<PeriodKind>
          label={t('tab.stats')}
          value={state.period.kind}
          onChange={state.setKind}
          items={kinds.map((k) => ({ value: k, label: t(`cal.view.${k}` as MessageKey) }))}
        />
      )}
      <View style={styles.periodRow}>
        <IconButton
          icon="back"
          variant="bare"
          label={t('stats.prevPeriod')}
          onPress={() => state.shift(-1)}
        />
        <Text
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          style={[TYPE.control, styles.periodTitle, { color: p.text }]}
        >
          {periodTitle(t, state.period)}
        </Text>
        {state.canNext ? (
          <IconButton
            icon="arrow"
            variant="bare"
            label={t('stats.nextPeriod')}
            onPress={() => state.shift(1)}
          />
        ) : (
          <View style={styles.periodSpacer} />
        )}
      </View>
    </View>
  );
}

/** Каркас экрана итогов: прокрутка, заголовок с «назад». */
export function StatsPage({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACE.md, paddingBottom: insets.bottom + SPACE.xl },
      ]}
    >
      <ScreenHeader title={title} onBack={onBack} />
      {children}
    </ScrollView>
  );
}

/** Карточка раздела: заголовок, подпись справа, содержимое и вывод словами. */
export function Section({
  title,
  hint,
  note,
  children,
}: {
  title: string;
  hint?: string;
  note?: string | null;
  children: React.ReactNode;
}) {
  const p = usePalette();
  return (
    <Card>
      <View style={styles.sectionHead}>
        <Text
          accessibilityRole="header"
          style={[TYPE.itemStrong, { color: p.text, flexShrink: 1 }]}
        >
          {title}
        </Text>
        {!!hint && <Text style={[TYPE.meta, { color: p.muted }]}>{hint}</Text>}
      </View>
      {children}
      {!!note && <Text style={[TYPE.meta, styles.note, { color: p.muted }]}>{note}</Text>}
    </Card>
  );
}

export type Kpi = { value: string; label: string; delta?: Delta | null };

/** Плитки чисел по две в ряд. */
export function KpiGrid({ items }: { items: Kpi[] }) {
  const p = usePalette();
  return (
    <View style={styles.kpis}>
      {items.map((k) => (
        <Card key={k.label} style={styles.kpi}>
          <View
            accessible
            accessibilityLabel={[k.value, k.label, k.delta?.a11y].filter(Boolean).join(', ')}
          >
            <View style={styles.kpiValue}>
              <Text style={[TYPE.numberM, { color: p.text }]}>{k.value}</Text>
              {k.delta && <DeltaText delta={k.delta} short />}
            </View>
            <Text style={[TYPE.meta, { color: p.muted }]}>{k.label}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

export type Delta = { up: boolean; value: string; text: string; a11y: string };

/**
 * Разница с прошлым периодом: «↑ 6% к прошлому месяцу». Рост — бирюзой («включено»), спад — серым:
 * красный только для долгов и срывов. Нет прошлого значения или разницы — null.
 */
export function delta(
  t: Translate,
  kind: PeriodKind,
  cur: number | null,
  prev: number | null,
  format: (v: number) => string
): Delta | null {
  if (cur === null || prev === null) return null;
  const diff = cur - prev;
  if (Math.abs(diff) < 1e-9) return null;
  const value = format(Math.abs(diff));
  const vs = t(`stats.vs.${kind}` as MessageKey);
  const up = diff > 0;
  return {
    up,
    value,
    text: `${up ? '↑' : '↓'} ${value} ${vs}`,
    a11y: t(up ? 'stats.more' : 'stats.less', { value, vs }),
  };
}

export function DeltaText({ delta: d, short }: { delta: Delta; short?: boolean }) {
  const p = usePalette();
  return (
    <Text accessibilityLabel={d.a11y} style={[TYPE.mark, { color: d.up ? p.teal : p.muted }]}>
      {short ? `${d.up ? '↑' : '↓'}${d.value}` : d.text}
    </Text>
  );
}

/** Доля в процентах: «78%». */
export const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Число с одним знаком после запятой: «3,8» (разделитель — из строк языка). */
export function dec(t: Translate, v: number): string {
  const r = Math.round(v * 10) / 10;
  return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace('.', t('num.decimal'));
}

/** «пн» … «вс» и «янв» … «дек» для подписей графиков. */
export const weekdayShort = (t: Translate, d: number) => t(`day.short.${d}` as MessageKey);
export const monthShort = (t: Translate, m: number) =>
  t(`cal.month.${m}` as MessageKey)
    .slice(0, 3)
    .toLowerCase();
export const weekdayName = (t: Translate, d: number) =>
  t(`date.weekdayTitle.${d}` as MessageKey).toLowerCase();

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACE.screenX, gap: SPACE.md },
  periodWrap: { gap: SPACE.sm },
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodTitle: { flex: 1, textAlign: 'center' },
  periodSpacer: { width: 44 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: SPACE.sm,
    marginBottom: SPACE.xs,
  },
  note: { marginTop: SPACE.sm },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  kpi: { flexBasis: '47%', flexGrow: 1 },
  kpiValue: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
});
