// Библиотека не экспортирует сборщик дерева наружу; тест берёт его из собранного пакета.
declare module 'react-native-android-widget/lib/commonjs/api/build-widget-tree' {
  export function buildWidgetTree(jsxTree: import('react').JSX.Element): unknown;
}
