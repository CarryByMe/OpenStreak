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
      (require('./android/update') as typeof import('./android/update')).updateAllWidgets();
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
