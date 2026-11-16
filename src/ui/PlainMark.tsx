/**
 * Отметка в «Обычном» оформлении: круг — дело, квадрат — привычка. Пустая — рамка,
 * сделанная — заливка с галочкой, числовая привычка в процессе — частичная заливка снизу.
 * Красная рамка — долг. Цвета: рамка и заливка — `line`, красный — только долг.
 */
import React from 'react';
import { View } from 'react-native';
import { usePalette, useSoft } from '../store/themeStore';
import { readableOn } from '../theme/readable';
import { useTint } from './useTint';
import { Icon } from './icons';

type Props = {
  shape?: 'circle' | 'square';
  /** 0…1 */
  fill: number;
  size?: number;
  debt?: boolean;
  /** цвет сферы или привычки — только в «Обычном» (монолит): рамка и заливка берут его */
  tint?: string;
};

export function PlainMark({ shape = 'circle', fill, size = 24, debt = false, tint }: Props) {
  const p = usePalette();
  const soft = useSoft();
  const safe = useTint(tint);
  const own = soft && !debt ? safe : undefined;
  const ring = debt ? p.red : (own ?? (soft ? p.ring : p.text));
  const color = debt ? p.red : (own ?? p.sun);
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
        <Icon
          name="check"
          size={Math.round(size * 0.6)}
          {...(own ? { color: readableOn(own) } : { tone: 'onSun' as const })}
        />
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
