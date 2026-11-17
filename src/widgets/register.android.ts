/* eslint-disable @typescript-eslint/no-require-imports -- ленивое подключение: без нативного модуля (Expo Go) импорт библиотеки бросает ошибку */
/**
 * Виджеты Android: обработчик фоновых задач должен быть объявлен при старте, до интерфейса.
 * В Expo Go и сборках без плагина виджетов нативного модуля нет — приложение работает без виджета.
 */
try {
  // Подключаем лениво: без нативного модуля импорт библиотеки не должен ронять запуск.
  const { registerWidgetTaskHandler } =
    require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { widgetTaskHandler } = require('./android/handler') as typeof import('./android/handler');
  registerWidgetTaskHandler(widgetTaskHandler);
} catch (e) {
  console.warn('Android widgets are unavailable in this build', e);
}

export {};
