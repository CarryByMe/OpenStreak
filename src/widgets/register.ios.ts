/* eslint-disable @typescript-eslint/no-require-imports -- ленивое подключение: без нативного модуля (Expo Go) импорт библиотеки бросает ошибку */
/**
 * Виджеты iOS (`expo-widgets`): объект виджета создаётся при старте, до интерфейса, —
 * так расширение знает, что рисовать, даже если приложение закрыто.
 * В Expo Go нативного модуля нет — приложение работает без виджета.
 */
try {
  require('./ios/today');
} catch (e) {
  console.warn('iOS widgets are unavailable in this build', e);
}

export {};
