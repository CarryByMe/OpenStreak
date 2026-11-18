/**
 * Обработчик виджетов Android. Система будит приложение без интерфейса (фоновая задача) при
 * добавлении, изменении размера и по таймеру — данные грузим сами тем же путём, что запуск.
 */
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { loadData } from '../../app/loadData';
import { planReminders } from '../../core/reminders';
import { flush, useDataStore } from '../../core/store';
import { syncGeofences } from '../../services/geofence';
import { syncReminders } from '../../services/notifications';
import { MARK_ROW_ACTION } from '../links';
import { markRow, parseMarkTarget } from '../markRow';
import { WIDGET_SIZES, renderTodayWidget } from './render';
import { updateAllWidgets } from './update';

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
      if (target && markRow(target)) {
        await flush();
        // Приложение закрыто — напоминания и геозоны сверяем здесь, как при запуске.
        try {
          await syncReminders(planReminders(useDataStore.getState().data, new Date()));
          await syncGeofences();
        } catch (e) {
          console.warn('Reminders were not synced after a widget tap', e);
        }
      }
      // Обновить сразу оба размера: отмеченное уходит из «ближайших», счёт меняется везде.
      updateAllWidgets();
      break;
    }
    default:
      break;
  }
}
