import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { loadData } from '../../app/loadData';
import { flush } from '../../core/store';
import { syncGeofences } from '../../services/geofence';
import { syncReminders } from '../../services/notifications';
import { pause } from '../android/frames';
import { updateAllWidgets } from '../android/update';
import { markRow } from '../markRow';
import { widgetTaskHandler } from '../android/handler';

jest.mock('../android/frames', () => ({ DONE_HOLD_MS: 700, pause: jest.fn(async () => {}) }));
jest.mock('../android/update', () => ({ updateAllWidgets: jest.fn() }));
jest.mock('../android/render', () => ({
  WIDGET_SIZES: { TodayMedium: 'medium', TodayLarge: 'large' },
  renderTodayWidget: () => ({ light: null, dark: null }),
}));
jest.mock('../../services/notifications', () => ({ syncReminders: jest.fn() }));
jest.mock('../../services/geofence', () => ({ syncGeofences: jest.fn() }));
jest.mock('../../app/loadData', () => ({ loadData: jest.fn() }));
jest.mock('../markRow', () => ({
  ...jest.requireActual<object>('../markRow'),
  markRow: jest.fn(),
}));
jest.mock('../../core/store', () => ({
  ...jest.requireActual<object>('../../core/store'),
  flush: jest.fn(),
}));

const mocks = {
  updateAllWidgets: updateAllWidgets as jest.Mock,
  syncReminders: syncReminders as jest.Mock<() => Promise<void>>,
  syncGeofences: syncGeofences as jest.Mock<() => Promise<void>>,
  flush: flush as jest.Mock<() => Promise<void>>,
  markRow: markRow as jest.Mock<(target: unknown) => boolean>,
  loadData: loadData as jest.Mock<() => Promise<void>>,
};

const info = { widgetName: 'TodayLarge', widgetId: 1, width: 250, height: 250, screenInfo: {} };
const run = (over: Record<string, unknown>) =>
  widgetTaskHandler({
    widgetInfo: info,
    widgetAction: 'WIDGET_CLICK',
    renderWidget: jest.fn(),
    ...over,
  } as never);

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  (pause as jest.Mock<() => Promise<void>>).mockResolvedValue();
  mocks.markRow.mockReturnValue(true);
  mocks.syncReminders.mockResolvedValue();
  mocks.syncGeofences.mockResolvedValue();
  mocks.flush.mockResolvedValue();
  mocks.loadData.mockResolvedValue();
});

describe('обработчик виджета Android: нажатие на отметку', () => {
  test('отмечает, пишет на диск, сверяет напоминания; виджеты рисуются двумя кадрами', async () => {
    await run({ clickAction: 'MARK_ROW', clickActionData: { kind: 'task', id: 't1' } });
    expect(mocks.loadData).toHaveBeenCalled();
    expect(mocks.markRow).toHaveBeenCalledWith({ kind: 'task', id: 't1' });
    expect(mocks.flush).toHaveBeenCalled();
    expect(mocks.syncReminders).toHaveBeenCalled();
    expect(mocks.syncGeofences).toHaveBeenCalled();
    // кадр «отмечено», затем итоговый кадр
    expect(mocks.updateAllWidgets).toHaveBeenCalledTimes(2);
  });

  test('первый кадр рисуется раньше записи на диск', async () => {
    const order: string[] = [];
    mocks.updateAllWidgets.mockImplementation(() => void order.push('кадр'));
    mocks.flush.mockImplementation(async () => void order.push('запись'));
    await run({ clickAction: 'MARK_ROW', clickActionData: { kind: 'task', id: 't1' } });
    expect(order[0]).toBe('кадр');
    expect(order[order.length - 1]).toBe('кадр');
    expect(order).toContain('запись');
  });

  test('если отмечать нечего — всё равно перерисовывает (виджет мог устареть), но не пишет', async () => {
    mocks.markRow.mockReturnValue(false);
    await run({ clickAction: 'MARK_ROW', clickActionData: { kind: 'task', id: 't1' } });
    expect(mocks.flush).not.toHaveBeenCalled();
    expect(mocks.syncReminders).not.toHaveBeenCalled();
    expect(mocks.updateAllWidgets).toHaveBeenCalledTimes(1);
  });

  test('мусорные данные нажатия ничего не отмечают', async () => {
    await run({ clickAction: 'MARK_ROW', clickActionData: { kind: 'goal', id: 'x' } });
    expect(mocks.markRow).not.toHaveBeenCalled();
    expect(mocks.updateAllWidgets).toHaveBeenCalledTimes(1);
  });

  test('чужие действия не трогают данные', async () => {
    await run({ clickAction: 'SOMETHING_ELSE', clickActionData: {} });
    expect(mocks.loadData).not.toHaveBeenCalled();
    expect(mocks.markRow).not.toHaveBeenCalled();
    expect(mocks.updateAllWidgets).not.toHaveBeenCalled();
  });

  test('сбой сверки напоминаний не мешает обновить виджеты', async () => {
    mocks.syncReminders.mockRejectedValueOnce(new Error('нет разрешения'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await run({ clickAction: 'MARK_ROW', clickActionData: { kind: 'habit', id: 'h1' } });
    expect(mocks.updateAllWidgets).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  test('неизвестный виджет игнорируется', async () => {
    await run({
      widgetInfo: { ...info, widgetName: 'Other' },
      clickAction: 'MARK_ROW',
      clickActionData: { kind: 'task', id: 't1' },
    });
    expect(mocks.markRow).not.toHaveBeenCalled();
  });
});
