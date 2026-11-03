import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppIcon, AppIconName } from '../icons/AppIcon';

type Props = {
  emoji: AppIconName;
  title: string;
  text: string;
};

export const EmptyState: React.FC<Props> = ({ emoji, title, text }) => {
  const { currentTheme } = useThemeStore();
  return (
    <View style={styles.container}>
      <View style={styles.emojiWrap}>
        <AppIcon name={emoji} sizeClass="lg" />
      </View>
      <Text style={[styles.title, { color: currentTheme.colors.text }]}>{title}</Text>
      <Text style={[styles.text, { color: currentTheme.colors.muted }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 20 },
  emojiWrap: { marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  text: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
