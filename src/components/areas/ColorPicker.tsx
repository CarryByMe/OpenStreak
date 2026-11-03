import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

type Props = {
  selectedColor: string;
  onSelect: (color: string) => void;
};

export const ColorPicker: React.FC<Props> = ({ selectedColor, onSelect }) => {
  return (
    <View style={styles.container}>
      {COLORS.map((color) => (
        <TouchableOpacity
          key={color}
          style={[
            styles.colorSwatch,
            { backgroundColor: color },
            selectedColor === color && styles.selected,
          ]}
          onPress={() => onSelect(color)}
          activeOpacity={0.8}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  selected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#fff',
  },
});
