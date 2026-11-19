/**
 * Будильник до пар: связь плана (`core/schedule.ts#wakePlan`, `#weeklyWake`) с будильниками
 * системы через локальный модуль `modules/wake-alarm`.
 *
 * - iOS 26+: AlarmKit — точные будильники на 14 дней вперёд, сверяются с планом при каждом
 *   изменении данных (как напоминания).
 * - Android: будильники в системных «Часах» по дням недели; ставятся по нажатию (снять их
 *   приложение не может — только открыть «Часы»).
 * - Остальное (iOS ниже 26, нет разрешения, веб): будильник — уведомлением из плана напоминаний.
 */
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { Snapshot } from '../core/model';
import { wakePlan, weeklyWake } from '../core/schedule';
import { translate } from '../i18n';
import { usePrefsStore } from '../store/prefsStore';

type AuthState = 'authorized' | 'denied' | 'notDetermined' | 'unsupported';

type WakeAlarmNative = {
  authorizationState(): AuthState;
  requestAuthorization(): Promise<AuthState>;
  sync(alarms: { id: string; at: number; title: string }[]): Promise<number>;
  setSystemAlarm(hour: number, minute: number, days: number[], message: string): Promise<boolean>;
  showSystemAlarms(): Promise<boolean>;
};

const native =
  Platform.OS === 'ios' || Platform.OS === 'android'
    ? requireOptionalNativeModule<WakeAlarmNative>('WakeAlarm')
    : null;

/**
 * Чем будим на этом телефоне: `alarmkit` — будильники iOS (с состоянием разрешения), `clock` —
 * «Часы» Android, `notification` — только уведомление.
 */
export type WakeSupport =
  | { kind: 'alarmkit'; state: Exclude<AuthState, 'unsupported'> }
  | { kind: 'clock' }
  | { kind: 'notification'; reason: 'oldIos' | 'web' };

export function wakeSupport(): WakeSupport {
  if (Platform.OS === 'android' && native) return { kind: 'clock' };
  if (Platform.OS === 'ios' && native) {
    const state = safe(() => native.authorizationState(), 'unsupported' as AuthState);
    if (state !== 'unsupported') return { kind: 'alarmkit', state };
    return { kind: 'notification', reason: 'oldIos' };
  }
  return { kind: 'notification', reason: Platform.OS === 'ios' ? 'oldIos' : 'web' };
}

/**
 * Нужен ли будильник уведомлением: на iOS без AlarmKit или без разрешения. На Android будят
 * «Часы» — уведомление только продублировало бы их.
 */
export function wakeNotificationsNeeded(): boolean {
  const s = wakeSupport();
  if (s.kind === 'alarmkit') return s.state !== 'authorized';
  return s.kind === 'notification' && s.reason === 'oldIos';
}

/** Спросить разрешение на будильники (iOS 26+). */
export async function requestAlarmAccess(): Promise<AuthState> {
  if (Platform.OS !== 'ios' || !native) return 'unsupported';
  try {
    return await native.requestAuthorization();
  } catch (e) {
    console.warn('AlarmKit authorization failed', e);
    return 'denied';
  }
}

function t(key: Parameters<typeof translate>[2], params?: Record<string, string | number>) {
  const { locale, tone } = usePrefsStore.getState();
  return translate(locale, tone, key, params);
}

/** iOS: привести будильники AlarmKit к плану. Где AlarmKit нет — ничего не делает. */
export async function syncWakeAlarms(snap: Snapshot): Promise<void> {
  const s = wakeSupport();
  if (!native || s.kind !== 'alarmkit' || s.state !== 'authorized') return;
  const plan = wakePlan(snap, new Date()).map((w) => ({
    id: w.id,
    at: new Date(`${w.date}T${w.time}:00`).getTime(),
    title: t('wake.alarmTitle', { title: w.lesson.title, time: w.lesson.start }),
  }));
  try {
    await native.sync(plan);
  } catch (e) {
    console.warn('Wake alarm sync failed', e);
  }
}

/**
 * Android: поставить будильники в «Часах» по дням недели. Возвращает, сколько поставлено,
 * или null, если «Часы» открыть не удалось.
 */
export async function setClockAlarms(snap: Snapshot, today: string): Promise<number | null> {
  if (Platform.OS !== 'android' || !native) return null;
  const { alarms } = weeklyWake(snap, today);
  let count = 0;
  for (const a of alarms) {
    const [h, m] = a.time.split(':').map(Number);
    try {
      const ok = await native.setSystemAlarm(
        h,
        m,
        a.days,
        t('wake.clockLabel', { title: a.lesson, time: a.start })
      );
      if (!ok) return count > 0 ? count : null;
      count++;
    } catch (e) {
      console.warn('Clock alarm failed', e);
      return count > 0 ? count : null;
    }
  }
  return count;
}

/** Android: открыть будильники в «Часах». */
export async function openClockAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android' || !native) return false;
  try {
    return await native.showSystemAlarms();
  } catch {
    return false;
  }
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
