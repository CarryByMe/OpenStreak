import { usePalette } from '../store/themeStore';
import { ensureContrast } from '../theme/readable';

/** Цвет сферы или привычки, готовый к показу: достаточно контрастный на фоне и на карточке. */
export function useTint(color: string | undefined): string | undefined {
  const p = usePalette();
  return color ? ensureContrast(color, [p.bg, p.surface]) : undefined;
}
