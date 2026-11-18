/**
 * Отрисовка виджетов Android по текущим данным — общая для обработчика фоновых задач
 * и для обновления из приложения.
 */
import React from 'react';
import { todayStr } from '../../core/dates';
import { useDataStore } from '../../core/store';
import { applyGhost, buildTodayViews, type WidgetGhost } from '../view';
import { TodayWidget, type WidgetSize } from './TodayWidget';

/** Имя виджета (app.json → плагин) → размер. */
export const WIDGET_SIZES: Record<string, WidgetSize> = {
  TodayMedium: 'medium',
  TodayLarge: 'large',
};

/** Светлая и тёмная версии виджета для текущих данных; `ghost` — только что отмеченная строка. */
export function renderTodayWidget(
  size: WidgetSize,
  info: { width?: number; height?: number } = {},
  ghost?: WidgetGhost
): { light: React.JSX.Element; dark: React.JSX.Element } {
  const built = buildTodayViews(useDataStore.getState().data, todayStr());
  const views = ghost ? applyGhost(built, ghost) : built;
  return {
    light: <TodayWidget view={views.light} size={size} width={info.width} height={info.height} />,
    dark: <TodayWidget view={views.dark} size={size} width={info.width} height={info.height} />,
  };
}

