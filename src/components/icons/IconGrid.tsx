import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { ICON_SIZES, getPickerCell } from '../../theme/iconSizes';
import { HABIT_ICON_KEYS } from './habitIcons';
import { HabitIcon } from './HabitIcon';

type Props = { selected: string; onSelect: (key: string) => void };

/** Горизонтальные отступы контента в листах (HabitSheet / AreaEditSheet).
 *  Нужны только для первого кадра — пока onLayout не сообщил реальную ширину. */
const SHEET_PADDING_X = 20;

/**
 * Общая сетка выбора иконок для привычек и сфер.
 * Ширина плитки считается от ширины ряда, поэтому ряд всегда заполнен
 * целиком — пустой колонки справа не бывает ни на одном экране.
 */
export const IconGrid: React.FC<Props> = ({ selected, onSelect }) => {
  const { currentTheme } = useThemeStore();
  const { width: winWidth } = useWindowDimensions();
  const { gap, glyphRatio, radiusRatio } = ICON_SIZES.picker;
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const rowWidth = measuredWidth > 0 ? measuredWidth : winWidth - SHEET_PADDING_X * 2;
  const cell = getPickerCell(rowWidth);
  const glyph = Math.max(12, Math.round(cell * glyphRatio));
  const radius = Math.round(cell * radiusRatio);

  const handleLayout = (e: { nativeEvent: { layout: { width: number } } }) => {
    const next = e.nativeEvent.layout.width;
    setMeasuredWidth((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
  };

  return (
    <View style={[styles.grid, { gap }]} onLayout={handleLayout}>
      {HABIT_ICON_KEYS.map((key) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.cell,
            {
              width: cell,
              height: cell,
              borderRadius: radius,
              backgroundColor: currentTheme.colors.card2,
            },
            selected === key && { backgroundColor: currentTheme.colors.accent },
          ]}
          onPress={() => onSelect(key)}
          activeOpacity={0.8}
        >
          <HabitIcon name={key} size={glyph} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
