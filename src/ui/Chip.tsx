/**
 * Чип-пилюля: сфера, фильтр, «Сегодня / Завтра». Выбранный — жёлтый, с тенью.
 * Пунктирный — действие («Дата…», «+ Сфера»).
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { usePalette, usePlain, useSoft } from '../store/themeStore';
import { RADIUS, STROKE } from '../theme/metrics';
import { hardShadow } from '../theme/sticker';
import { TYPE } from '../theme/type';
import { Icon, type IconName } from './icons';
import { useTint } from './useTint';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** sm — фильтры и сферы (38); md — выбор в шторке (40) */
  size?: 'sm' | 'md';
  dashed?: boolean;
  /** значок слева от подписи: «действие», а не вариант выбора */
  icon?: IconName;
  /** toggle — можно выбрать несколько; radio — один из группы */
  role?: 'toggle' | 'radio';
  /** цвет сферы: в «Обычном» перед подписью рисуется точка этого цвета */
  dot?: string;
};

export function Chip({
  label,
  selected = false,
  onPress,
  size = 'sm',
  dashed,
  icon,
  role = 'toggle',
  dot,
}: Props) {
  const p = usePalette();
  const plain = usePlain();
  const soft = useSoft();
  const dotColor = useTint(soft ? dot : undefined);
  if (plain && !soft && dashed) {
    // «Минималистичный»: действие («+ Сфера», «Дата…») — подчёркнутый текст, не рамка.
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={{ height: size === 'sm' ? 38 : 44, paddingHorizontal: 0, justifyContent: 'center' }}
      >
        <Text style={[TYPE.control, { color: p.text, textDecorationLine: 'underline' }]}>
          {label}
        </Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole={dashed ? 'button' : role === 'radio' ? 'radio' : 'togglebutton'}
      accessibilityState={
        dashed ? undefined : role === 'radio' ? { checked: selected } : { selected }
      }
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: size === 'sm' ? 38 : 44,
          paddingHorizontal: 14,
          justifyContent: 'center',
          borderWidth: soft ? 1.5 : plain ? 0 : STROKE.thin,
          borderStyle: dashed ? 'dashed' : 'solid',
          borderColor: soft ? (selected ? p.sun : p.line) : p.line,
          borderRadius: RADIUS.pill,
          backgroundColor: selected
            ? p.sun
            : dashed
              ? 'transparent'
              : pressed
                ? plain
                  ? p.track
                  : p.tag
                : p.surface,
        },
        selected && !soft && hardShadow(p, 'sm'),
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {dotColor && (
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: dotColor,
              borderWidth: selected ? 1.5 : 0,
              borderColor: p.onSun,
            }}
          />
        )}
        {icon && <Icon name={icon} size={18} tone={selected ? 'onSun' : 'text'} />}
        <Text style={[TYPE.control, { color: selected ? p.onSun : p.text }]}>{label}</Text>
      </View>
    </Pressable>
  );
}
