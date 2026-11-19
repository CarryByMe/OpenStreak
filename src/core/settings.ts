/** Настройки по умолчанию и чтение настроек из снимка. */
import { SETTINGS_ID, type Bell, type DesignChoice, type Settings, type Snapshot } from './model';

export type SettingsFields = Omit<Settings, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/** Звонки по умолчанию: шесть пар по 90 минут с переменой 10 минут, первая в 08:30. */
export const DEFAULT_BELLS: Bell[] = [
  { start: '08:30', end: '10:00' },
  { start: '10:10', end: '11:40' },
  { start: '11:50', end: '13:20' },
  { start: '13:30', end: '15:00' },
  { start: '15:10', end: '16:40' },
  { start: '16:50', end: '18:20' },
];

/**
 * Тема как в системе, оформление «Обычный»; тон, цитаты и звания (для «АУФ») включены.
 * Расписание выключено — включается в настройках.
 */
export const DEFAULT_SETTINGS: SettingsFields = {
  theme: 'system',
  design: 'normal',
  tone: 'bro',
  quotes: true,
  ranks: true,
  locale: 'ru',
  weekStart: 1,
  reviewAt: '21:30',
  scheduleEnabled: false,
  bells: DEFAULT_BELLS,
  weekParity: false,
  parityFrom: null,
  wakeBefore: null,
};

/**
 * Оформление из сохранённых данных. Старое значение `plain` («Обычный» до появления нового
 * «Обычного») — теперь «Минималистичный»: вид у человека не меняется. Остальное — по умолчанию.
 */
export function designOf(v: unknown, fallback: DesignChoice = 'normal'): DesignChoice {
  if (v === 'plain') return 'minimal';
  return v === 'normal' || v === 'minimal' || v === 'auf' ? v : fallback;
}

/** Действующие настройки: сохранённые поверх значений по умолчанию. */
export function settingsOf(snap: Pick<Snapshot, 'settings'>): SettingsFields {
  const s = snap.settings[SETTINGS_ID];
  if (!s || s.deletedAt !== null) return { ...DEFAULT_SETTINGS };
  const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...fields } = s;
  // Сохранённое `plain` (старый «Обычный») читается как «Минималистичный».
  return {
    ...DEFAULT_SETTINGS,
    ...fields,
    design: designOf(fields.design, DEFAULT_SETTINGS.design),
  };
}

/**
 * Настройки, как они действуют в интерфейсе: вне «АУФ» нет пацанского тона, цитат волка
 * и званий, что бы ни было сохранено — сохранённое вернётся при переходе на «АУФ».
 */
export function effectiveSettings(snap: Pick<Snapshot, 'settings'>): SettingsFields {
  const s = settingsOf(snap);
  return s.design === 'auf' ? s : { ...s, tone: 'plain', quotes: false, ranks: false };
}
