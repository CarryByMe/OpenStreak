/**
 * Босс качалки (design/gachi): латунная медаль с ♂, строчкой и заклёпками — персонаж «Качалки»
 * вместо волка. Свой знак, без лиц и примет реальных людей. Настроение — бейдж справа сверху:
 * доволен — зелёная галочка, слил — красный минус.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import type { Palette } from '../../theme/palette';
import type { WolfMood } from './Wolf';

type Props = { mood: WolfMood; size: number; label: string; p: Palette };

const RIVETS = [45, 135, 225, 315].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { cx: 60 + 47 * Math.cos(a), cy: 60 + 47 * Math.sin(a) };
});

export function GymBoss({ mood, size, label, p }: Props) {
  const mars = {
    stroke: p.onSun,
    strokeWidth: 8,
    fill: 'none',
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
  };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={52} fill={p.sun} stroke={p.line} strokeWidth={4} />
        <Circle
          cx={60}
          cy={60}
          r={41}
          fill="none"
          stroke={p.onSun}
          strokeWidth={2}
          strokeDasharray="4 5"
        />
        {RIVETS.map((r, i) => (
          <Circle key={i} cx={r.cx} cy={r.cy} r={3} fill={p.onSun} />
        ))}
        <G {...mars}>
          <Circle cx={52} cy={68} r={16} />
          <Path d="M64 56 L80 40" />
          <Path d="M66 38 H82 V54" />
        </G>
        {mood !== 'smirk' && (
          <G>
            <Circle
              cx={98}
              cy={22}
              r={15}
              fill={mood === 'proud' ? p.teal : p.red}
              stroke={p.line}
              strokeWidth={3}
            />
            <Path
              d={mood === 'proud' ? 'M91 22 L96 27 L105 17' : 'M91 22 H105'}
              stroke={mood === 'proud' ? p.onTeal : p.onRed}
              strokeWidth={4}
              strokeLinecap="square"
              fill="none"
            />
          </G>
        )}
      </Svg>
    </View>
  );
}
