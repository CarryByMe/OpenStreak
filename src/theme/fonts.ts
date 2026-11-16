/** Имена загруженных шрифтов (`hooks/useFonts.ts`). На Android жирность задаётся только файлом. */
export const FONT = {
  /** «Мульт»: текст */
  rubik: {
    regular: 'Rubik_400Regular',
    medium: 'Rubik_500Medium',
    semibold: 'Rubik_600SemiBold',
    bold: 'Rubik_700Bold',
  },
  /** «Мульт»: заголовки и числа */
  unbounded: {
    semibold: 'Unbounded_600SemiBold',
    bold: 'Unbounded_700Bold',
    extrabold: 'Unbounded_800ExtraBold',
  },
  /** «Обычный» (монолит): заголовки и числа */
  manrope: {
    bold: 'Manrope_700Bold',
    extrabold: 'Manrope_800ExtraBold',
  },
  /** «Обычный» (монолит): текст */
  golos: {
    regular: 'GolosText_400Regular',
    medium: 'GolosText_500Medium',
    semibold: 'GolosText_600SemiBold',
    bold: 'GolosText_700Bold',
  },
  /** «Минималистичный»: единый нейтральный шрифт */
  inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
} as const;
