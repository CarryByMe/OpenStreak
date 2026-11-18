/**
 * Обработчик виджетов Android. Система будит приложение без интерфейса (фоновая задача) при
 * добавлении, изменении размера и по таймеру — данные грузим сами тем же путём, что запуск.
 */
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { loadData } from '../../app/loadData';
import { todayStr } from '../../core/dates';
import { planReminders } from '../../core/reminders';
import { flush, useDataStore } from '../../core/store';
import { syncGeofences } from '../../services/geofence';
import { syncReminders } from '../../services/notifications';
import { MARK_ROW_ACTION } from '../links';
import { markRow, parseMarkTarget } from '../markRow';
import { buildTodayViews, ghostOf } from '../view';
import { DONE_HOLD_MS, pause } from './frames';
import { WIDGET_SIZES, renderTodayWidget } from './render';
import { updateAllWidgets } from './update';

/** Запись на диск; приложение закрыто — напоминания и геозоны сверяем здесь, как при запуске. */
async function persist(): Promise<void> {
  await flush();
  try {
    await syncReminders(planReminders(useDataStore.getState().data, new Date()));
    await syncGeofences();
  } catch (e) {
    console.warn('Reminders were not synced after a widget tap', e);
  }
}

export async function widgetTaskHandler({
  widgetInfo,
  widgetAction,
  clickAction,
  clickActionData,
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
    case 'WIDGET_CLICK': {
      // Остальные нажатия (приложение, «+», «Закрыть день») система выполняет сама ссылкой.
      if (clickAction !== MARK_ROW_ACTION) break;
      await loadData();
      const target = parseMarkTarget(clickActionData);
      if (target) {
        const before = buildTodayViews(useDataStore.getState().data, todayStr());
        // Данные в памяти меняются сразу: первый кадр рисуем, не дожидаясь записи на диск.
        if (markRow(target)) {
          const ghost = ghostOf(before, target);
          updateAllWidgets(ghost ?? undefined);
          await Promise.all([persist(), ghost ? pause(DONE_HOLD_MS) : undefined]);
        }
      }
      // Итоговый кадр: отмеченное ушло из «ближайших», счёт изменился в обоих размерах.
      updateAllWidgets();
      break;
    }
    default:
      break;
  }
}
