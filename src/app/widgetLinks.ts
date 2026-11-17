/**
 * Нажатия на виджет: «+» открывает шторку «Новое», «Закрыть день» — итог дня. Ссылки приходят и
 * на холодном старте (приложение было закрыто), и когда оно уже открыто.
 */
import { createNavigationContainerRef } from '@react-navigation/native';
import { Linking } from 'react-native';
import { useNewSheet } from '../features/new/newSheetStore';
import type { RootStack } from '../navigation/RootNavigator';
import { parseWidgetLink, type WidgetAction } from '../widgets/links';

export const navigationRef = createNavigationContainerRef<RootStack>();

/** Действие, пришедшее раньше, чем готова навигация (холодный старт). */
let pending: WidgetAction | null = null;

function run(action: WidgetAction): void {
  if (action === 'add') useNewSheet.getState().show('task');
  else navigationRef.navigate('review');
}

export function handleWidgetUrl(url: string | null | undefined): void {
  const action = parseWidgetLink(url);
  if (!action) return;
  if (navigationRef.isReady()) run(action);
  else pending = action;
}

/** Вызвать, когда навигация готова: выполняет отложенное действие. */
export function flushPendingWidgetAction(): void {
  const action = pending;
  pending = null;
  if (action) run(action);
}

/** Подписка на ссылки: начальная (холодный старт) и приходящие при открытом приложении. */
export function listenWidgetLinks(): () => void {
  void Linking.getInitialURL().then(handleWidgetUrl);
  const sub = Linking.addEventListener('url', (e) => handleWidgetUrl(e.url));
  return () => sub.remove();
}
