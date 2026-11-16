/** Выбор цвета сферы или привычки: ряд кружков из `SWATCHES`, выбранный — с галочкой и кольцом. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useT } from '../store/prefsStore';
import { usePalette } from '../store/themeStore';
import { readableOn } from '../theme/readable';
import { SWATCHES } from '../theme/swatches';
import { SPACE } from '../theme/metrics';
import { Icon } from './icons';

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  const p = usePalette();
  const t = useT();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('color.title')}>
      {SWATCHES.map((c, i) => {
        const on = c.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityLabel={t('color.label', { n: i + 1 })}
            accessibilityState={{ checked: on }}
            onPress={() => onChange(c)}
            style={[styles.ring, { borderColor: on ? p.text : 'transparent' }]}
          >
            <View style={[styles.dot, { backgroundColor: c }]}>
              {on && <Icon name="check" size={18} color={readableOn(c)} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  ring: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderRadius: 22,
  },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
