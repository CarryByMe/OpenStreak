/**
 * Отметка дела или привычки. «Минималистичный»: круг — дело, квадрат — привычка; пустая — рамка,
 * сделанная — заливка с галочкой, числовая в процессе — частичная заливка снизу, красная рамка — долг.
 *
 * «Обычный» — как в монолите, цветом сферы или привычки (`tint`):
 * - дело — круг 23 с рамкой 2, сделано — заливка и белая (читаемая) жирная галочка;
 * - привычка (`habit`) — большая круглая кнопка 46 с рамкой 2.5 и бледной галочкой внутри,
 *   сделано — заливка и яркая галочка; у числовой вместо галочки — «3/5» (`label`).
 * Бледная галочка — подсказка, а не носитель смысла: смысл несёт рамка (контраст ≥ 3).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { usePalette, useSoft } from '../store/themeStore';
import { TYPE } from '../theme/type';
import { ensureContrast, mixWith, readableOn } from '../theme/readable';
import { useTint } from './useTint';
import { Icon } from './icons';
import { UI_ICONS } from './icons/paths';

type Props = {
  shape?: 'circle' | 'square';
  /** 0…1 */
  fill: number;
  size?: number;
  debt?: boolean;
  /** цвет сферы или привычки — только в «Обычном» (монолит): рамка и заливка берут его */
  tint?: string;
  /** «Обычный»: отметка привычки — большая круглая кнопка с галочкой */
  habit?: boolean;
  /** «Обычный», привычка: текст вместо галочки (числовая — «3/5») */
  label?: string;
};

/** Галочка из общего набора, но с жирной линией, как в монолите. */
function Check({ size, color, width }: { size: number; color: string; width: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={UI_ICONS.check.d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * «Подпрыгивание» отметки привычки при выполнении (boxpop в монолите: 1 → 1,3 → 1 с отскоком).
 * При первом показе и при снятии отметки не играет.
 */
function usePop(on: boolean): Animated.Value {
  const [pop] = useState(() => new Animated.Value(1));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!on) return;
    pop.setValue(1);
    Animated.sequence([
      Animated.timing(pop, {
        toValue: 1.3,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [on, pop]);
  return pop;
}

export function PlainMark(props: Props) {
  const soft = useSoft();
  return soft ? <SoftMark {...props} /> : <MinimalMark {...props} />;
}

function SoftMark({ fill, size, debt = false, tint, habit = false, label }: Props) {
  const p = usePalette();
  const safe = useTint(tint);
  const color = debt ? p.red : (safe ?? p.sun);
  const full = fill >= 1;
  const pop = usePop(full && habit);
  const side = size ?? (habit ? 46 : 23);
  const on = readableOn(color);
  if (!habit) {
    return (
      <View
        style={{
          width: side,
          height: side,
          borderRadius: side / 2,
          borderWidth: 2,
          borderColor: color,
          backgroundColor: full ? color : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {full && <Check size={Math.round(side * 0.58)} color={on} width={3.6} />}
      </View>
    );
  }
  // Бледная галочка — сплошной цвет (смесь с карточкой), без opacity.
  const hint = mixWith(color, p.surface, 0.7);
  const text = full ? on : ensureContrast(color, [p.surface], 4.5);
  return (
    <Animated.View
      style={{
        transform: [{ scale: pop }],
        width: side,
        height: side,
        borderRadius: side / 2,
        borderWidth: 2.5,
        borderColor: color,
        backgroundColor: full ? color : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {!full && fill > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: `${Math.round(fill * 100)}%`,
            backgroundColor: hint,
          }}
        />
      )}
      {label ? (
        <Text numberOfLines={1} style={[TYPE.badge, { color: text }]}>
          {label}
        </Text>
      ) : (
        <Check size={Math.round(side * 0.46)} color={full ? on : hint} width={3} />
      )}
    </Animated.View>
  );
}

function MinimalMark({ shape = 'circle', fill, size = 24, debt = false }: Props) {
  const p = usePalette();
  const ring = debt ? p.red : p.text;
  const color = debt ? p.red : p.sun;
  const radius = shape === 'circle' ? size / 2 : 5;
  const full = fill >= 1;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: 1.75,
        borderColor: full ? color : ring,
        backgroundColor: full ? color : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {full ? (
        <Icon name="check" size={Math.round(size * 0.6)} tone="onSun" />
      ) : fill > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: `${Math.round(fill * 100)}%`,
            backgroundColor: color,
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * Клетка дня привычки в «Обычном» оформлении (вместо луны): заливка — сделано, частичная
 * заливка — в процессе, жирная рамка — сегодня, красная рамка с точкой — срыв,
 * пунктир — выходной, тонкая рамка — пусто.
 */
export function PlainDay({
  state,
  part = 0,
  today = false,
  size = 28,
  tint,
}: {
  state: 'done' | 'partial' | 'today' | 'slip' | 'rest' | 'clean' | 'empty';
  part?: number;
  today?: boolean;
  size?: number;
  /** цвет привычки — только в «Обычном» (монолит): клетки круглые и этого цвета */
  tint?: string;
}) {
  const p = usePalette();
  const soft = useSoft();
  const safe = useTint(tint);
  const accent = soft && safe ? safe : p.sun;
  const box = {
    width: size,
    height: size,
    borderRadius: soft ? size / 2 : 5,
    overflow: 'hidden' as const,
  };
  if (state === 'done' || state === 'clean') {
    return <View style={[box, { backgroundColor: accent }]} />;
  }
  if (state === 'slip') {
    return (
      <View
        style={[
          box,
          { borderWidth: 2, borderColor: p.red, alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <View style={{ width: size * 0.36, height: size * 0.36, backgroundColor: p.red }} />
      </View>
    );
  }
  if (state === 'rest') {
    return (
      <View style={[box, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: p.muted }]} />
    );
  }
  const heavy = state === 'today' || today;
  return (
    <View
      style={[box, { borderWidth: heavy ? 2.5 : 1.5, borderColor: heavy ? accent : p.divider }]}
    >
      {part > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: `${Math.round(Math.min(1, part) * 100)}%`,
            backgroundColor: accent,
          }}
        />
      )}
    </View>
  );
}
