import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

type Props = { delay?: number; children: React.ReactNode; style?: any };

export const FadeInUp: React.FC<Props> = ({ delay = 0, children, style }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withTiming(1, { duration: 400, easing: Easing.bezier(0.22, 0.9, 0.32, 1) })
    );
  }, [t, delay]);
  const a = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 12 }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
};
