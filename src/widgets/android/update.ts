/**
 * Перерисовать все виджеты Android по текущим данным. Подключается лениво (см. `sync.android.ts`
 * и `register.android.ts`): без нативного модуля импорт библиотеки бросает ошибку.
 */
import { requestWidgetUpdate } from 'react-native-android-widget';
import { WIDGET_SIZES, renderTodayWidget } from './render';

export function updateAllWidgets(): void {
  for (const [widgetName, size] of Object.entries(WIDGET_SIZES)) {
    void requestWidgetUpdate({
      widgetName,
      renderWidget: (info) => renderTodayWidget(size, info),
    }).catch((e) => console.warn('Widget update failed', widgetName, e));
  }
}
