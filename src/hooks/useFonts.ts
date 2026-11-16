import {
  useFonts as useRubik,
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
} from '@expo-google-fonts/rubik';
import {
  useFonts as useUnbounded,
  Unbounded_600SemiBold,
  Unbounded_700Bold,
  Unbounded_800ExtraBold,
} from '@expo-google-fonts/unbounded';
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import {
  useFonts as useManrope,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  useFonts as useGolos,
  GolosText_400Regular,
  GolosText_500Medium,
  GolosText_600SemiBold,
  GolosText_700Bold,
} from '@expo-google-fonts/golos-text';

export function useAppFonts() {
  // «Обычный»: Manrope — заголовки и числа, Golos Text — текст.
  const [mLoaded] = useManrope({ Manrope_700Bold, Manrope_800ExtraBold });
  const [gLoaded] = useGolos({
    GolosText_400Regular,
    GolosText_500Medium,
    GolosText_600SemiBold,
    GolosText_700Bold,
  });
  // «Минималистичный»: Inter — всё.
  const [iLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  // «Мульт»: Rubik — текст, Unbounded — заголовки и числа.
  const [rLoaded] = useRubik({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
  });
  const [uLoaded] = useUnbounded({
    Unbounded_600SemiBold,
    Unbounded_700Bold,
    Unbounded_800ExtraBold,
  });
  return rLoaded && uLoaded && iLoaded && mLoaded && gLoaded;
}
