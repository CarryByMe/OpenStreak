/**
 * «Добавить виджет на экран» из приложения. Только Android: iOS не даёт приложению добавлять
 * виджеты, их выбирает человек (долгое нажатие на экран → «+»). Запасной вариант — здесь,
 * Android — в `pin.android.ts`.
 */
import type { WidgetSize } from './android/TodayWidget';

export const canPinWidgets = false;

export async function pinWidget(_size: WidgetSize): Promise<boolean> {
  return false;
}
