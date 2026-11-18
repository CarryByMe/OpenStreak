/* eslint-disable @typescript-eslint/no-require-imports -- ленивое подключение: без нативного модуля (Expo Go) импорт библиотеки бросает ошибку */
/**
 * «Добавить виджет на экран» из настроек: лаунчер показывает своё окно подтверждения.
 * Ответ `false` — лаунчер или версия Android не умеют; тогда человеку подсказываем ручной путь.
 */
import type { WidgetSize } from './android/TodayWidget';

export const canPinWidgets = true;

const NAMES: Record<WidgetSize, string> = { medium: 'TodayMedium', large: 'TodayLarge' };

export async function pinWidget(size: WidgetSize): Promise<boolean> {
  try {
    const { requestPinWidget } =
      require('react-native-android-widget') as typeof import('react-native-android-widget');
    return await requestPinWidget({ widgetName: NAMES[size] });
  } catch (e) {
    // нет нативного модуля (Expo Go)
    console.warn('Widget pinning is unavailable', e);
    return false;
  }
}
