/**
 * Графики «Итогов» (design/stats): столбики, линия, клетки года и полоса-измеритель.
 * Правила: тонкие метки, скруглённый верх у основания, редкая сетка, подписи — текстовыми токенами,
 * цвет метки — со смыслом (один тон для «сколько», цвет сферы — для сферы). Нажатие на столбик
 * или клетку показывает подсказку над графиком (на телефоне вместо наведения). У каждого графика —
 * подпись для чтения с экрана с самими числами.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { usePalette } from '../store/themeStore';
import { mixWith } from '../theme/readable';
import { SPACE } from '../theme/metrics';
import { TYPE } from '../theme/type';

const AXIS_W = 34;

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(Math.round(e.nativeEvent.layout.width))];
}

/** Подсказка над графиком: выбранная метка или подсказка по умолчанию. */
function Tip({ text }: { text: string }) {
  const p = usePalette();
  return (
    <Text
      accessibilityLiveRegion="polite"
      numberOfLines={1}
      style={[TYPE.meta, styles.tip, { color: text ? p.text : 'transparent' }]}
    >
      {text || ' '}
    </Text>
  );
}

type ColumnProps = {
  values: (number | null)[];
  /** верх шкалы; по умолчанию — наибольшее значение */
  max?: number;
  /** подписи под столбиками (пустая строка — без подписи) */
  labels: string[];
  /** выделенный столбик: сегодня, текущий месяц */
  highlight?: number;
  /** пунктир среднего */
  avg?: number | null;
  avgLabel?: string;
  format: (v: number) => string;
  /** подсказка по нажатию: «18 ноября: 72%» */
  tip: (i: number) => string;
  a11yLabel: string;
  height?: number;
  /** цвет столбиков; по умолчанию — основной тон */
  color?: string;
};

export function ColumnChart({
  values,
  max,
  labels,
  highlight,
  avg,
  avgLabel,
  format,
  tip,
  a11yLabel,
  height = 120,
  color,
}: ColumnProps) {
  const p = usePalette();
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const top = max ?? Math.max(1, ...values.map((v) => v ?? 0));
  const plot = height - 18;
  const y = (v: number) => plot - (Math.min(v, top) / top) * (plot - 6);
  const n = values.length;
  const gap = n > 20 ? 2 : 4;
  const barW = width > 0 ? (width - AXIS_W - gap * (n - 1)) / n : 0;
  const base = color ?? p.prioLow;

  return (
    <View>
      <Tip text={sel !== null ? tip(sel) : ''} />
      <View
        accessible
        accessibilityLabel={a11yLabel}
        onLayout={onLayout}
        style={{ height, position: 'relative' }}
      >
        {[0.5, 1].map((g) => (
          <View key={g} style={[styles.grid, { top: y(top * g), borderTopColor: p.divider }]}>
            <Text style={[styles.axis, { color: p.muted }]}>{format(top * g)}</Text>
          </View>
        ))}
        <View style={[styles.base, { top: plot, backgroundColor: p.line }]} />
        {width > 0 &&
          values.map((v, i) => {
            const x = AXIS_W + i * (barW + gap);
            const strong = i === highlight || i === sel;
            const h = v ? plot - y(v) : 0;
            return (
              <Pressable
                key={i}
                accessible={false}
                onPress={() => setSel(sel === i ? null : i)}
                hitSlop={{ top: 8, bottom: 8 }}
                style={{
                  position: 'absolute',
                  left: x - gap / 2,
                  width: barW + gap,
                  top: 0,
                  height,
                }}
              >
                {h > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      left: gap / 2,
                      width: barW,
                      top: plot - h,
                      height: h,
                      backgroundColor: strong ? p.text : base,
                      borderTopLeftRadius: Math.min(4, barW / 2),
                      borderTopRightRadius: Math.min(4, barW / 2),
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        {/* Подписи — отдельным слоем шириной 32 по центру столбика: не обрезаются узкой зоной нажатия. */}
        {width > 0 &&
          labels.map((l, i) =>
            l ? (
              <Text
                key={`l${i}`}
                pointerEvents="none"
                style={[
                  styles.label,
                  {
                    top: plot + 3,
                    width: 32,
                    left: AXIS_W + i * (barW + gap) + barW / 2 - 16,
                    color: i === highlight || i === sel ? p.text : p.muted,
                  },
                ]}
              >
                {l}
              </Text>
            ) : null
          )}
        {avg !== null && avg !== undefined && width > 0 && (
          <View
            pointerEvents="none"
            style={[styles.avg, { top: y(avg), left: AXIS_W, borderTopColor: p.text }]}
          >
            {!!avgLabel && (
              <Text style={[styles.avgText, { color: p.text, backgroundColor: p.surface }]}>
                {avgLabel}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

type LineProps = {
  values: (number | null)[];
  min: number;
  max: number;
  labels: string[];
  format: (v: number) => string;
  tip: (i: number) => string;
  a11yLabel: string;
  height?: number;
  color?: string;
};

/** Линия 2px; пропуски (null) рвут её. Точка — на последнем значении и на выбранном. */
export function LineChart({
  values,
  min,
  max,
  labels,
  format,
  tip,
  a11yLabel,
  height = 104,
  color,
}: LineProps) {
  const p = usePalette();
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const stroke = color ?? p.prioLow;
  const plot = height - 18;
  const n = values.length;
  const plotW = Math.max(1, width - AXIS_W - 6);
  const x = (i: number) => AXIS_W + (n > 1 ? (i * plotW) / (n - 1) : plotW / 2);
  const y = (v: number) => plot - ((v - min) / (max - min || 1)) * (plot - 8) - 2;
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
    pen = true;
  });
  let last = -1;
  values.forEach((v, i) => v !== null && (last = i));
  const dots = [last, sel ?? -1].filter((i) => i >= 0 && values[i] !== null);

  return (
    <View>
      <Tip text={sel !== null ? tip(sel) : ''} />
      <View accessible accessibilityLabel={a11yLabel} onLayout={onLayout} style={{ height }}>
        {[min, (min + max) / 2, max].map((g) => (
          <View key={g} style={[styles.grid, { top: y(g), borderTopColor: p.divider }]}>
            <Text style={[styles.axis, { color: p.muted }]}>{format(g)}</Text>
          </View>
        ))}
        {width > 0 && (
          <Svg width={width} height={plot + 4} style={StyleSheet.absoluteFill}>
            <Path
              d={d}
              stroke={stroke}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {dots.map((i) => (
              <Circle
                key={i}
                cx={x(i)}
                cy={y(values[i]!)}
                r={4.5}
                fill={i === sel ? p.text : stroke}
                stroke={p.surface}
                strokeWidth={2}
              />
            ))}
          </Svg>
        )}
        {width > 0 &&
          values.map((_, i) => (
            <Pressable
              key={i}
              accessible={false}
              onPress={() => setSel(sel === i ? null : i)}
              style={{
                position: 'absolute',
                top: 0,
                height,
                left: x(i) - plotW / Math.max(1, n - 1) / 2,
                width: plotW / Math.max(1, n - 1),
              }}
            ></Pressable>
          ))}
        {width > 0 &&
          labels.map((l, i) =>
            l ? (
              <Text
                key={`l${i}`}
                pointerEvents="none"
                style={[
                  styles.label,
                  { top: plot + 3, width: 40, left: x(i) - 20, color: p.muted },
                ]}
              >
                {l}
              </Text>
            ) : null
          )}
      </View>
    </View>
  );
}

/** Шаги одного тона для клеток: 0 — пусто (дорожка), 4 — основной тон. */
export function heatSteps(p: { prioLow: string; surface: string; track: string }): string[] {
  return [p.track, ...[0.7, 0.5, 0.25, 0].map((k) => mixWith(p.prioLow, p.surface, k))];
}

type HeatProps = {
  /** все дни года по порядку; level null — день не в счёт */
  cells: { date: string; level: number | null }[];
  weekStart: 0 | 1;
  monthLabels: string[];
  tip: (i: number) => string;
  a11yLabel: string;
};

/**
 * Год клетками двумя полугодиями (январь–июнь, июль–декабрь): столбец — неделя, строка — день
 * недели. Так клетки вдвое крупнее, чем в одну полосу на 53 недели.
 */
export function YearHeat({ cells, weekStart, monthLabels, tip, a11yLabel }: HeatProps) {
  const p = usePalette();
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const steps = heatSteps(p);
  const gap = 2;
  const halves = [0, 1].map((h) => {
    const items = cells
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => Number(c.date.slice(5, 7)) <= 6 === (h === 0));
    const first = items[0] ? new Date(`${items[0].c.date}T00:00`).getDay() : weekStart;
    const offset = (first - weekStart + 7) % 7;
    return { items, offset, cols: Math.ceil((items.length + offset) / 7) };
  });
  const cols = Math.max(1, ...halves.map((h) => h.cols));
  const cell = width > 0 ? (width - gap * (cols - 1)) / cols : 0;

  return (
    <View>
      <Tip text={sel !== null ? tip(sel) : ''} />
      <View accessible accessibilityLabel={a11yLabel} onLayout={onLayout} style={styles.halves}>
        {width > 0 &&
          halves.map((half, h) => (
            <View key={h}>
              <View style={{ height: 14 }}>
                {half.items.map(({ c }, j) =>
                  c.date.endsWith('-01') ? (
                    <Text
                      key={c.date}
                      style={[
                        styles.axis,
                        {
                          left: Math.floor((j + half.offset) / 7) * (cell + gap),
                          top: 0,
                          color: p.muted,
                        },
                      ]}
                    >
                      {monthLabels[Number(c.date.slice(5, 7)) - 1]}
                    </Text>
                  ) : null
                )}
              </View>
              <View style={{ height: 7 * (cell + gap) }}>
                {half.items.map(({ c, i }, j) => {
                  const k = j + half.offset;
                  return (
                    <Pressable
                      key={c.date}
                      accessible={false}
                      disabled={c.level === null}
                      onPress={() => setSel(sel === i ? null : i)}
                      style={{
                        position: 'absolute',
                        left: Math.floor(k / 7) * (cell + gap),
                        top: (k % 7) * (cell + gap),
                        width: cell,
                        height: cell,
                        borderRadius: Math.min(3, cell / 3),
                        // День не в счёт (до начала, выходной, не по плану, будущий) — только контур.
                        ...(c.level === null
                          ? { borderWidth: 1, borderColor: p.divider }
                          : { backgroundColor: i === sel ? p.text : steps[c.level] }),
                      }}
                    />
                  );
                })}
              </View>
            </View>
          ))}
      </View>
    </View>
  );
}

/** Шкала «меньше — больше» под клетками. */
export function HeatScale({ less, more }: { less: string; more: string }) {
  const p = usePalette();
  return (
    <View style={styles.scale} accessible={false}>
      <Text style={[TYPE.meta, { color: p.muted }]}>{less}</Text>
      {heatSteps(p).map((c) => (
        <View key={c} style={[styles.scaleCell, { backgroundColor: c }]} />
      ))}
      <Text style={[TYPE.meta, { color: p.muted }]}>{more}</Text>
    </View>
  );
}

type MeterProps = {
  label: string;
  /** справа: «96%», «11 из 12» */
  figure: string;
  /** мелко после числа: «серия 14» */
  sub?: string;
  /** 0…1 */
  value: number;
  /** цвет полосы; цвет сферы или приоритета, иначе основной тон */
  color?: string;
  /** точка цвета перед названием */
  dot?: string;
  /** после названия: плашка «вредная» */
  badge?: string;
  first?: boolean;
  onPress?: () => void;
};

/** Строка-измеритель: название, число справа и полоса доли. */
export function MeterRow({
  label,
  figure,
  sub,
  value,
  color,
  dot,
  badge,
  first,
  onPress,
}: MeterProps) {
  const p = usePalette();
  const body = (
    <>
      <View style={styles.meterHead}>
        <View style={styles.meterName}>
          {!!dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
          <Text numberOfLines={1} style={[TYPE.row, { color: p.text, flexShrink: 1 }]}>
            {label}
          </Text>
          {!!badge && (
            <Text style={[TYPE.meta, styles.badge, { color: p.muted, borderColor: p.line }]}>
              {badge}
            </Text>
          )}
        </View>
        <Text style={[TYPE.control, { color: p.text }]}>
          {figure}
          {!!sub && <Text style={[TYPE.meta, { color: p.muted }]}>{`  ${sub}`}</Text>}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: p.track }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`,
              backgroundColor: color ?? p.prioLow,
            },
          ]}
        />
      </View>
    </>
  );
  const style = [styles.meter, !first && { borderTopWidth: 1, borderTopColor: p.divider }];
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${figure}${sub ? `, ${sub}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && { backgroundColor: p.bg }]}
    >
      {body}
    </Pressable>
  ) : (
    <View
      accessible
      accessibilityLabel={`${label}: ${figure}${sub ? `, ${sub}` : ''}`}
      style={style}
    >
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: { minHeight: 18, marginBottom: 2 },
  grid: { position: 'absolute', left: AXIS_W, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  axis: { position: 'absolute', left: -AXIS_W, top: -7, fontSize: 10, lineHeight: 13 },
  base: { position: 'absolute', left: AXIS_W, right: 0, height: 1 },
  label: { position: 'absolute', textAlign: 'center', fontSize: 10, lineHeight: 13 },
  avg: {
    position: 'absolute',
    right: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'flex-end',
  },
  avgText: { fontSize: 10, lineHeight: 13, marginTop: -15, paddingHorizontal: 3 },
  scale: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACE.sm },
  halves: { gap: SPACE.sm },
  scaleCell: { width: 10, height: 10, borderRadius: 2 },
  meter: { paddingVertical: SPACE.sm, gap: 6 },
  meterHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
  },
  meterName: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, fontSize: 11, lineHeight: 15 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
