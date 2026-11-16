/**
 * Кнопки карточки привычки в «Обычном» (как в монолите CoolTick): большая круглая отметка и
 * пальма — выходной. Не сделано — пустое кольцо цвета привычки; сделано — заливка с белой
 * галочкой и «подпрыгивание» (boxpop). Повторное нажатие снимает отметку.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import { usePalette } from '../store/themeStore';
import { blend, readableOn } from '../theme/readable';
import { TYPE } from '../theme/type';
import { Icon, Palm } from './icons';
import { useTint } from './useTint';

const SIZE = 46;

type DoProps = {
  /** цвет привычки */
  tint?: string;
  /** отмечено (у вредной — срыв) */
  on: boolean;
  /** вредная: вместо галочки крестик, цвет красный */
  bad?: boolean;
  /** выходной: пунктирное кольцо */
  resting?: boolean;
  /** числовая привычка: «40/100» вместо галочки */
  progress?: string;
  label: string;
  onPress: () => void;
};

export function HabitDoButton({
  tint,
  on,
  bad = false,
  resting = false,
  progress,
  label,
  onPress,
}: DoProps) {
  const p = usePalette();
  const safe = useTint(tint);
  const color = bad ? p.red : (safe ?? p.sun);
  const ink = bad ? p.onRed : readableOn(color);
  const [fill] = useState(() => new Animated.Value(on ? 1 : 0));
  const [pop] = useState(() => new Animated.Value(1));
  const [press] = useState(() => new Animated.Value(1));
  const first = useRef(true);

  useEffect(() => {
    Animated.timing(fill, {
      toValue: on ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    // «Подпрыгивание» — только при отметке, не при первом показе и не при снятии.
    if (first.current) {
      first.current = false;
      return;
    }
    if (on) {
      pop.setValue(1);
      Animated.sequence([
        Animated.timing(pop, {
          toValue: 1.3,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [on, fill, pop]);

  const to = (v: number) =>
    Animated.timing(press, { toValue: v, duration: 120, useNativeDriver: true }).start();
  const empty = fill.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const icon = bad ? 'close' : 'check';

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => to(0.86)}
      onPressOut={() => to(1)}
      hitSlop={4}
    >
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: resting ? p.muted : color,
            borderStyle: resting ? 'dashed' : 'solid',
            transform: [{ scale: Animated.multiply(pop, press) }],
          },
        ]}
      >
        <Animated.View style={[styles.fill, { backgroundColor: color, opacity: fill }]} />
        {progress ? (
          <Text style={[TYPE.meta, styles.progress, { color: on ? ink : p.text }]}>{progress}</Text>
        ) : (
          <>
            <Animated.View style={[styles.icon, { opacity: empty }]}>
              <Icon name={icon} size={22} color={p.muted} />
            </Animated.View>
            <Animated.View style={[styles.icon, { opacity: fill }]}>
              <Icon name={icon} size={22} color={ink} />
            </Animated.View>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Пальма: выходной на сегодня. Включено — круглая подложка цвета привычки. */
export function RestButton({
  tint,
  on,
  label,
  onPress,
}: {
  tint?: string;
  on: boolean;
  label: string;
  onPress: () => void;
}) {
  const p = usePalette();
  const safe = useTint(tint);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.rest,
        { backgroundColor: on ? blend(safe ?? p.sun, p.surface, 0.18) : 'transparent' },
        pressed && styles.restPressed,
      ]}
    >
      <Palm size={26} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: { ...StyleSheet.absoluteFill },
  icon: { position: 'absolute' },
  progress: {},
  rest: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  restPressed: { transform: [{ scale: 0.88 }] },
});
