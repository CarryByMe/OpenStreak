/**
 * Ссылки, по которым виджет открывает приложение. Схема `openstreak` задана в app.json.
 * Разбор — в `app/widgetLinks.ts`.
 */
export const SCHEME = 'openstreak';

export const WIDGET_LINKS = {
  /** «+»: шторка «Новое» с делом */
  add: `${SCHEME}://widget/add`,
  /** «Закрыть день»: экран итога дня */
  review: `${SCHEME}://widget/review`,
} as const;

export type WidgetAction = 'add' | 'review';

/** Что хотел виджет: действие из ссылки или null, если ссылка не наша. */
export function parseWidgetLink(url: string | null | undefined): WidgetAction | null {
  if (!url) return null;
  const m = /^openstreak:\/\/widget\/(add|review)\/?(?:[?#].*)?$/i.exec(url.trim());
  return m ? (m[1].toLowerCase() as WidgetAction) : null;
}

/** Нажатие на отметку строки в виджете Android: отметить дело или привычку, не открывая приложение. */
export const MARK_ROW_ACTION = 'MARK_ROW';
