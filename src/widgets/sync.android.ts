/* eslint-disable @typescript-eslint/no-require-imports -- ленивое подключение: без нативного модуля (Expo Go) импорт библиотеки бросает ошибку */
/**
 * Обновление виджетов Android из приложения: после изменения данных (с задержкой, чтобы серия
 * правок дала одно обновление), смены суток и возврата на передний план. Пока приложение
 * закрыто, виджет остаётся таким, каким его оставили, а в полночь обновит его система.
 */
import { AppState } from 'react-native';
import { useDataStore } from '../core/store';

const DELAY_MS = 800;

let started = false;

export function startWidgetSync(): void {
  if (started) return;
  started = true;

  const push = () => {
    try {
      const { requestWidgetUpdate } =
        require('react-native-android-widget') as typeof import('react-native-android-widget');
      const { WIDGET_SIZES, renderTodayWidget } =
        require('./android/handler') as typeof import('./android/handler');
      for (const [widgetName, size] of Object.entries(WIDGET_SIZES)) {
        void requestWidgetUpdate({
          widgetName,
          renderWidget: (info) => renderTodayWidget(size, info),
        }).catch((e) => console.warn('Widget update failed', widgetName, e));
      }
    } catch (e) {
      // нет нативного модуля (Expo Go) — виджетов нет, обновлять нечего
      console.warn('Widgets were not updated', e);
    }
  };

  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      push();
    }, DELAY_MS);
  };

  useDataStore.subscribe((s, prev) => {
    if (s.data !== prev.data || s.today !== prev.today) schedule();
  });
  AppState.addEventListener('change', (state) => {
    if (state === 'active') schedule();
  });
  schedule();
}
