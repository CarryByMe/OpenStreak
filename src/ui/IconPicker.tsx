/** Выбор значка привычки: сетка плиток из набора `HABIT_ICONS`. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePalette } from '../store/themeStore';
import { RADIUS, SPACE, STROKE } from '../theme/metrics';
import { HABIT_ICONS, IconTile } from './icons';

/** Ключи значков в порядке набора (группы по темам: тело, питание, учёба…). */
export const HABIT_ICON_KEYS = Object.keys(HABIT_ICONS);

type Props = {
  value: string;
  onChange: (key: string) => void;
  size?: number;
  /** цвет плитки в «Обычном» */
  color?: string;
};

export function IconPicker({ value, onChange, size = 44, color }: Props) {
  const p = usePalette();
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {HABIT_ICON_KEYS.map((key) => {
        const on = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={key}
            accessibilityState={{ checked: on }}
            onPress={() => onChange(key)}
            style={[styles.pick, { borderColor: on ? p.line : 'transparent' }]}
          >
            <IconTile icon={key} size={size} color={color} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.tight },
  pick: { padding: 3, borderWidth: STROKE.outline, borderRadius: RADIUS.sm + 4 },
});
