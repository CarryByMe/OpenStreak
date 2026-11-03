import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

type Props = { index?: number; children: React.ReactNode };

export const AnimatedListItem: React.FC<Props> = ({ index = 0, children }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      index * 30,
      withTiming(1, { duration: 400, easing: Easing.bezier(0.22, 0.9, 0.32, 1) })
    );
  }, [t, index]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 12 }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
};
