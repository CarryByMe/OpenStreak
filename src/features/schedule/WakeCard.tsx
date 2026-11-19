/**
 * «Будильник до пар» на экране расписания: за сколько до первого занятия будить, ближайший
 * будильник и что делает телефон — будильники iOS (AlarmKit), «Часы» Android или уведомление.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as A from '../../core/actions';
import { WAKE_OPTIONS, wakePlan, weeklyWake } from '../../core/schedule';
import { settingsOf } from '../../core/settings';
import { useDataStore } from '../../core/store';
import {
  openClockAlarms,
  requestAlarmAccess,
  setClockAlarms,
  syncWakeAlarms,
  wakeSupport,
} from '../../services/alarms';
import { askNotificationPermission } from '../../services/notifications';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { Button } from '../../ui/Button';
import { SelectRow } from '../../ui/SelectRow';
import { Card } from '../../ui/Sticker';
import { useToast } from '../../ui/toast';
import { relDate } from '../format';
import { durationText } from './scheduleUi';

export function WakeCard() {
  const p = usePalette();
  const t = useT();
  const toast = useToast((s) => s.show);
  const data = useDataStore((s) => s.data);
  const today = useDataStore((s) => s.today);
  const s = settingsOf(data);
  // Разрешение iOS меняется вне данных — перечитываем после запроса.
  const [support, setSupport] = useState(wakeSupport);
  const before = s.wakeBefore;
  const next = before === null ? null : (wakePlan(data, new Date())[0] ?? null);
  const weekly = support.kind === 'clock' && before !== null ? weeklyWake(data, today) : null;

  const pick = async (v: number | null) => {
    A.updateSettings({ wakeBefore: v });
    if (v === null) return;
    if (support.kind === 'alarmkit' && support.state === 'notDetermined') {
      await allowAlarms();
    } else if (
      support.kind === 'notification' ||
      (support.kind === 'alarmkit' && support.state !== 'authorized')
    ) {
      // Будильник уведомлением — нужно разрешение на уведомления.
      await askNotificationPermission();
    }
  };

  // После разрешения данные не меняются — сверяем будильники сразу.
  const allowAlarms = async () => {
    await requestAlarmAccess();
    setSupport(wakeSupport());
    await syncWakeAlarms(useDataStore.getState().data);
  };

  const setClock = async () => {
    const n = await setClockAlarms(useDataStore.getState().data, today);
    toast(n === null ? t('wake.android.failed') : t('wake.android.done', { count: n }));
  };

  let status: string | null = null;
  if (before !== null) {
    if (support.kind === 'alarmkit') {
      status = t(support.state === 'authorized' ? 'wake.ios.enabled' : 'wake.ios.denied');
    } else if (support.kind === 'notification') {
      status = t(support.reason === 'web' ? 'wake.web' : 'wake.ios.old');
    } else {
      status = t('wake.android.hint');
    }
  }

  return (
    <Card padded={false}>
      <SelectRow<number | null>
        icon="remind"
        label={t('wake.title')}
        value={before}
        set={before !== null}
        onChange={(v) => void pick(v)}
        options={[
          { value: null, label: t('wake.off'), icon: 'close' },
          ...WAKE_OPTIONS.map((m) => ({
            value: m,
            label: t('wake.before', { time: durationText(t, m) }),
            icon: 'clock' as const,
          })),
        ]}
      />
      <View style={styles.body}>
        {before === null ? (
          <Text style={[TYPE.meta, { color: p.muted }]}>{t('wake.hint')}</Text>
        ) : (
          <>
            <Text style={[TYPE.row, { color: p.text }]}>
              {next
                ? t('wake.next', {
                    day: relDate(t, next.date, today).toLowerCase(),
                    time: next.time,
                    title: next.lesson.title,
                    start: next.lesson.start,
                  })
                : t('wake.none')}
            </Text>
            {!!status && <Text style={[TYPE.meta, { color: p.muted }]}>{status}</Text>}
            {weekly?.approximate && (
              <Text style={[TYPE.meta, { color: p.muted }]}>{t('wake.android.approx')}</Text>
            )}
            {support.kind === 'alarmkit' && support.state === 'notDetermined' && (
              <Button
                label={t('wake.ios.enable')}
                variant="secondary"
                onPress={() => void allowAlarms()}
              />
            )}
            {support.kind === 'clock' && weekly && weekly.alarms.length > 0 && (
              <View style={styles.buttons}>
                <Button
                  label={t('wake.android.set')}
                  onPress={() => void setClock()}
                  style={styles.grow}
                />
                <Button
                  label={t('wake.android.open')}
                  variant="secondary"
                  onPress={() => void openClockAlarms()}
                />
              </View>
            )}
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACE.lg, paddingBottom: SPACE.md, gap: SPACE.sm },
  buttons: { flexDirection: 'row', gap: SPACE.sm, flexWrap: 'wrap' },
  grow: { flexGrow: 1 },
});
