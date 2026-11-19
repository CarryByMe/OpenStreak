import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useDesign, usePalette, usePlain, useSoft } from '../../store/themeStore';
import { RADIUS, STROKE } from '../../theme/metrics';
import type { Design, Palette } from '../../theme/palette';
import { readableOn } from '../../theme/readable';
import { useTint } from '../useTint';
import { HABIT_ICONS, UI_ICONS, type IconName, type IconSpec } from './paths';

/** Цвет иконки: на фоне экрана или поверх цветной подложки (`on*`). */
export type IconTone = 'text' | 'muted' | 'red' | 'teal' | 'onSun' | 'onTeal' | 'onToast';

type Props = {
  /** размер в точках; сетка иконки — 24 */
  size?: number;
  tone?: IconTone;
  /** свой цвет вместо тона палитры: значок на плитке цвета сферы или привычки */
  color?: string;
  /** подпись для чтения с экрана; без неё иконка декоративная */
  label?: string;
};

/**
 * Один набор рисунков на все оформления; меняется только линия. «АУФ» — толстая, со скруглёнными
 * концами; «Обычный» — чуть тоньше; «Минималистичный» — тонкая, с прямыми концами и острыми
 * углами. Мелкие иконки рисуем чуть толще, чтобы линия не терялась.
 */
function lineStyle(design: Design, size: number) {
  const small = size <= 20;
  if (design === 'minimal') {
    return { width: small ? 1.9 : 1.75, cap: 'square' as const, join: 'miter' as const };
  }
  if (design === 'normal') {
    return { width: small ? 2.2 : 2, cap: 'round' as const, join: 'round' as const };
  }
  return { width: small ? 2.4 : 2.2, cap: 'round' as const, join: 'round' as const };
}

function Glyph({ spec, size = 24, tone = 'text', color: own, label }: Props & { spec: IconSpec }) {
  const p = usePalette();
  const design = useDesign();
  const color = own ?? p[tone];
  const line = lineStyle(design, size);
  const svg = (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {!!spec.d && (
        <Path
          d={spec.d}
          fill="none"
          stroke={color}
          strokeWidth={line.width}
          strokeLinecap={line.cap}
          strokeLinejoin={line.join}
        />
      )}
      {!!spec.dots && <Path d={spec.dots} fill={color} />}
    </Svg>
  );
  if (!label) return svg;
  // Подпись — на обёртке: View одинаково понимают и iOS/Android, и веб.
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      {svg}
    </View>
  );
}

export function Icon({ name, ...rest }: Props & { name: IconName }) {
  const spec =
    name in UI_ICONS
      ? UI_ICONS[name as keyof typeof UI_ICONS]
      : HABIT_ICONS[name as keyof typeof HABIT_ICONS];
  return <Glyph spec={spec} {...rest} />;
}

/** Иконка привычки или сферы по ключу из `Habit.icon`; незнакомый ключ — общая «привычки». */
export function HabitGlyph({ icon, ...rest }: Props & { icon: string }) {
  const spec = (HABIT_ICONS as Record<string, IconSpec>)[icon] ?? UI_ICONS.habits;
  return <Glyph spec={spec} {...rest} />;
}

type Tile = { bg: keyof Palette; tone: IconTone };
const TILES: Tile[] = [
  { bg: 'sun', tone: 'onSun' },
  { bg: 'sky', tone: 'onSun' },
  { bg: 'teal', tone: 'onTeal' },
  { bg: 'tag', tone: 'text' },
];

/** Цвет плитки по ключу иконки — стабильный, без хранения в данных. */
export function tileFor(icon: string): Tile {
  let h = 0;
  for (let i = 0; i < icon.length; i++) h = (h * 31 + icon.charCodeAt(i)) >>> 0;
  return TILES[h % TILES.length];
}

/**
 * Иконка привычки на плитке. «АУФ» — цветная наклейка с обводкой; «Обычный» — круг цвета сферы
 * или привычки (`color`), значок на нём тёмный или светлый, как лучше читается;
 * «Минималистичный» — значок в рамке.
 */
export function IconTile({
  icon,
  size = 46,
  tilt = 0,
  color,
}: {
  icon: string;
  size?: number;
  /** наклон в градусах — для карточки привычки */
  tilt?: number;
  /** цвет сферы или привычки — для «Обычного» */
  color?: string;
}) {
  const p = usePalette();
  const plain = usePlain();
  const soft = useSoft();
  const safe = useTint(color);
  const tile = tileFor(icon);
  if (soft) {
    const bg = safe ?? p.sun;
    return (
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderRadius: RADIUS.pill,
        }}
      >
        <HabitGlyph icon={icon} size={Math.round(size * 0.55)} color={readableOn(bg)} />
      </View>
    );
  }
  if (plain) {
    // «Минималистичный»: значок в рамке, без цветной плитки.
    return (
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: STROKE.outline,
          borderColor: p.line,
          borderRadius: RADIUS.sm,
        }}
      >
        <HabitGlyph icon={icon} size={Math.round(size * 0.55)} tone="text" />
      </View>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: p[tile.bg],
        borderWidth: STROKE.outline,
        borderColor: p.line,
        borderRadius: RADIUS.sm,
        transform: tilt ? [{ rotate: `${tilt}deg` }] : undefined,
      }}
    >
      <HabitGlyph icon={icon} size={Math.round(size * 0.55)} tone={tile.tone} />
    </View>
  );
}
