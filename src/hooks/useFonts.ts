import {
  useFonts as useManrope,
  Manrope_500Medium,
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
  const [mLoaded] = useManrope({
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [gLoaded] = useGolos({
    GolosText_400Regular,
    GolosText_500Medium,
    GolosText_600SemiBold,
    GolosText_700Bold,
  });
  return mLoaded && gLoaded;
}
