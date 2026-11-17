/**
 * Обработчик виджетов Android. Система будит приложение без интерфейса (фоновая задача) при
 * добавлении, изменении размера и по таймеру — данные грузим сами тем же путём, что запуск.
 */
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { loadData } from '../../app/loadData';
import { todayStr } from '../../core/dates';
import { useDataStore } from '../../core/store';
import { buildTodayViews } from '../view';
import { TodayWidget, type WidgetSize } from './TodayWidget';

/** Имя виджета (app.json → плагин) → размер. */
export const WIDGET_SIZES: Record<string, WidgetSize> = {
  TodayMedium: 'medium',
  TodayLarge: 'large',
};

/** Светлая и тёмная версии виджета для текущих данных. */
export function renderTodayWidget(
  size: WidgetSize,
  info: { width?: number; height?: number } = {}
): { light: React.JSX.Element; dark: React.JSX.Element } {
  const views = buildTodayViews(useDataStore.getState().data, todayStr());
  return {
    light: <TodayWidget view={views.light} size={size} width={info.width} height={info.height} />,
    dark: <TodayWidget view={views.dark} size={size} width={info.width} height={info.height} />,
  };
}

export async function widgetTaskHandler({
  widgetInfo,
  widgetAction,
  renderWidget,
}: WidgetTaskHandlerProps): Promise<void> {
  const size = WIDGET_SIZES[widgetInfo.widgetName];
  if (!size) return;
  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      await loadData();
      renderWidget(renderTodayWidget(size, widgetInfo));
      break;
    default:
      // WIDGET_CLICK: нажатия открывают приложение ссылкой, своих действий у виджета нет
      break;
  }
}
