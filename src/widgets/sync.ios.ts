/* eslint-disable @typescript-eslint/no-require-imports -- ленивое подключение: без нативного модуля (Expo Go) импорт библиотеки бросает ошибку */
/**
 * Обновление виджета iOS из приложения: после изменения данных (с задержкой, чтобы серия правок
 * дала одно обновление), смены суток и возврата на передний план. WidgetKit показывает последний
 * снимок, пока приложение закрыто.
 */
import { AppState } from 'react-native';
import { todayStr } from '../core/dates';
import { useDataStore } from '../core/store';
import { buildTodayViews } from './view';

const DELAY_MS = 800;

let started = false;

export function startWidgetSync(): void {
  if (started) return;
  started = true;

  const push = () => {
    try {
      const widget = (require('./ios/today') as typeof import('./ios/today')).default;
      widget.updateSnapshot(buildTodayViews(useDataStore.getState().data, todayStr()));
    } catch (e) {
      // нет нативного модуля (Expo Go) — виджета нет, обновлять нечего
      console.warn('Widget was not updated', e);
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
