/**
 * Лицо оценки дня 1…5 для «Обычного» оформления: круг цвета шкалы (оттенки акцента — чем
 * насыщеннее, тем лучше день), каймой и чертами. Цвета — `palettes.json` → `mood`, пары
 * проверяются `check:contrast`. Выражение несёт смысл и без цвета: от сердитого до смеющегося.
 */
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { useThemeStore } from '../store/themeStore';
import { moodScale } from '../theme/palette';

type Props = { mood: number; size?: number };

export function MoodFace({ mood, size = 40 }: Props) {
  const scheme = useThemeStore((s) => s.scheme);
  const scale = moodScale(scheme);
  const m = Math.min(5, Math.max(1, Math.round(mood)));
  const fill = scale.fill[m - 1]!;
  const ring = scale.ring[m - 1]!;
  const ink = scale.ink[m - 1]!;
  const line = {
    fill: 'none',
    stroke: ink,
    strokeWidth: 2.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const eyes = (y: number) => (
    <>
      <Circle cx={17} cy={y} r={2.4} fill={ink} />
      <Circle cx={31} cy={y} r={2.4} fill={ink} />
    </>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={21.5} fill={fill} stroke={ring} strokeWidth={2.5} />
      {m === 5 && (
        <>
          <Path d="M12.5 21.5q4.5-6 9 0M26.5 21.5q4.5-6 9 0" {...line} />
          <Path
            d="M14 28.5h20q-1.5 9-10 9t-10-9z"
            fill={ink}
            stroke={ink}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </>
      )}
      {m === 4 && (
        <>
          {eyes(21)}
          <Path d="M16 29.5q8 7 16 0" {...line} />
        </>
      )}
      {m === 3 && (
        <>
          {eyes(21)}
          <Path d="M17 31h14" {...line} />
        </>
      )}
      {m === 2 && (
        <>
          {eyes(21)}
          <Path d="M16.5 34q7.5-6 15 0" {...line} />
        </>
      )}
      {m === 1 && (
        <>
          <Path d="M12.5 16.5l8 2.8M35.5 16.5l-8 2.8" {...line} />
          {eyes(23)}
          <Path d="M16 35.5q8-8 16 0" {...line} />
        </>
      )}
    </Svg>
  );
}
