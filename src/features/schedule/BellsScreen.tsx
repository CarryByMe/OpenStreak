/**
 * «Звонки» (design/schedule, экран 6): время каждой пары, пересчёт по правилу (длина, перемена,
 * начало первой), чётная и нечётная неделя и с какой даты их считать.
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as A from '../../core/actions';
import { addDays, dstr, startOfWeek } from '../../core/dates';
import type { Bell } from '../../core/model';
import {
  MAX_BELLS,
  bellRhythm,
  bellsFrom,
  clockFromMinutes,
  minutesOf,
  schoolYearStart,
  weekOf,
} from '../../core/schedule';
import { settingsOf } from '../../core/settings';
import { useDataStore } from '../../core/store';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { AddRow, Button } from '../../ui/Button';
import { FormRow } from '../../ui/FormRow';
import { Icon } from '../../ui/icons';
import { ScreenHeader, SectionTitle } from '../../ui/ScreenHeader';
import { SelectRow } from '../../ui/SelectRow';
import { SettingRow } from '../../ui/SettingRow';
import { Card } from '../../ui/Sticker';
import { useToast } from '../../ui/toast';
import { dayMonth } from '../format';

const HAS_PICKER = Platform.OS !== 'web';
const LENGTHS = [40, 45, 60, 80, 90, 95, 100] as const;
const PAUSES = [5, 10, 15, 20, 30] as const;

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

type Picker =
  { kind: 'bell'; index: number; edge: 'start' | 'end' } | { kind: 'first' } | { kind: 'from' };

export function BellsScreen({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const t = useT();
  const insets = useSafeAreaInsets();
  const toast = useToast((st) => st.show);
  const data = useDataStore((st) => st.data);
  const today = useDataStore((st) => st.today);
  const s = settingsOf(data);
  const bells = s.bells;
  const rhythm = bellRhythm(bells);
  const [length, setLength] = useState<number>(rhythm?.length ?? 90);
  const [pause, setPause] = useState<number>(rhythm?.pause ?? 10);
  const [first, setFirst] = useState(bells[0]?.start ?? '08:30');
  const [picker, setPicker] = useState<Picker | null>(null);
  const week = weekOf(today, s);

  // Пара не может кончиться раньше начала: при сдвиге края держим её длину.
  const setBell = (index: number, edge: 'start' | 'end', value: string) =>
    A.saveBells(
      bells.map((b, i) => {
        if (i !== index) return b;
        const len = (minutesOf(b.end) ?? 0) - (minutesOf(b.start) ?? 0);
        const v = minutesOf(value) ?? 0;
        if (edge === 'start') {
          return value < b.end
            ? { ...b, start: value }
            : { start: value, end: clockFromMinutes(v + len) };
        }
        return value > b.start
          ? { ...b, end: value }
          : { start: clockFromMinutes(v - len), end: value };
      })
    );

  const addBell = () => {
    const last = bells[bells.length - 1];
    const lastEnd = last ? (minutesOf(last.end) ?? 0) : (minutesOf(first) ?? 510) - pause;
    const start = lastEnd + pause;
    if (start + length >= 24 * 60) return;
    A.saveBells([
      ...bells,
      { start: clockFromMinutes(start), end: clockFromMinutes(start + length) },
    ]);
  };

  const apply = () => {
    A.saveBells(bellsFrom(first, length, pause, Math.max(bells.length, 6)));
    toast(t('bells.applied'));
  };

  // «Сейчас наоборот»: сдвигаем начало отсчёта на неделю — чётность всех недель меняется.
  const flipParity = () => {
    const from = startOfWeek(s.parityFrom ?? schoolYearStart(today), s.weekStart);
    A.updateSettings({ parityFrom: addDays(from, week.number > 1 ? 7 : -7) });
  };

  const onPick = (e: DateTimePickerEvent, value?: Date) => {
    const what = picker;
    setPicker(null);
    if (e.type !== 'set' || !value || !what) return;
    if (what.kind === 'bell') setBell(what.index, what.edge, timeOf(value));
    else if (what.kind === 'first') setFirst(timeOf(value));
    else A.updateSettings({ parityFrom: dstr(value) });
  };

  const pickerValue = (): Date => {
    if (!picker) return new Date();
    if (picker.kind === 'from') return new Date(`${s.parityFrom ?? schoolYearStart(today)}T12:00`);
    const time =
      picker.kind === 'first' ? first : (bells[picker.index] as Bell | undefined)?.[picker.edge];
    return new Date(`2000-01-01T${time || '08:30'}:00`);
  };

  const timeChip = (label: string, value: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={() => HAS_PICKER && onPress()}
      style={({ pressed }) => [
        styles.time,
        { backgroundColor: pressed ? p.bg : p.surface, borderColor: p.line },
      ]}
    >
      <Text style={[TYPE.control, { color: p.text }]}>{value}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACE.md, paddingBottom: insets.bottom + SPACE.xl },
      ]}
    >
      <ScreenHeader title={t('bells.title')} onBack={onBack} />

      <Card padded={false} style={styles.list}>
        {bells.map((b, i) => {
          const n = i + 1;
          return (
            <View
              key={i}
              style={[styles.bell, i > 0 && { borderTopWidth: 1, borderTopColor: p.divider }]}
            >
              <Text style={[TYPE.row, styles.n, { color: p.muted }]}>
                {t('schedule.pairN', { n })}
              </Text>
              {timeChip(t('bells.startOf', { n }), b.start, () =>
                setPicker({ kind: 'bell', index: i, edge: 'start' })
              )}
              <Text style={[TYPE.row, { color: p.muted }]}>–</Text>
              {timeChip(t('bells.endOf', { n }), b.end, () =>
                setPicker({ kind: 'bell', index: i, edge: 'end' })
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('bells.remove', { n })}
                onPress={() => A.saveBells(bells.filter((_, j) => j !== i))}
                hitSlop={8}
                style={styles.remove}
              >
                <Icon name="close" size={18} tone="muted" />
              </Pressable>
            </View>
          );
        })}
      </Card>
      {bells.length < MAX_BELLS && <AddRow label={t('bells.add')} onPress={addBell} />}

      <View style={styles.group}>
        <SectionTitle title={t('bells.rule')} tilt={-1} />
        <Card padded={false}>
          <SelectRow<number>
            label={t('bells.length')}
            value={length}
            onChange={setLength}
            options={LENGTHS.map((m) => ({
              value: m,
              label: t('bells.minutes', { count: m }),
              icon: 'clock' as const,
            }))}
          />
          <SelectRow<number>
            label={t('bells.pause')}
            value={pause}
            onChange={setPause}
            options={PAUSES.map((m) => ({
              value: m,
              label: t('bells.minutes', { count: m }),
              icon: 'clock' as const,
            }))}
          />
          <FormRow
            label={t('bells.first')}
            value={first}
            open={false}
            onPress={() => HAS_PICKER && setPicker({ kind: 'first' })}
          />
        </Card>
        <Button label={t('bells.apply')} variant="secondary" onPress={apply} />
      </View>

      <View style={styles.group}>
        <SectionTitle title={t('lesson.weeks')} tilt={-1} />
        <Card padded={false}>
          <SettingRow
            label={t('bells.parity')}
            hint={t('bells.parityHint')}
            value={s.weekParity}
            onChange={(on) => A.updateSettings({ weekParity: on })}
            last={!s.weekParity}
          />
          {s.weekParity && (
            <>
              <SettingRow
                label={t('bells.from')}
                value={
                  s.parityFrom
                    ? t('bells.fromDate', { date: dayMonth(t, s.parityFrom) })
                    : t('bells.fromDefault')
                }
                onPress={() => HAS_PICKER && setPicker({ kind: 'from' })}
              />
              <SettingRow
                label={t('bells.current')}
                hint={t('bells.currentHint')}
                value={t('bells.currentValue', {
                  parity: t(`schedule.parity.${week.parity}`),
                  n: week.number,
                })}
                onPress={flipParity}
                last
              />
            </>
          )}
        </Card>
      </View>

      {picker && (
        <DateTimePicker
          mode={picker.kind === 'from' ? 'date' : 'time'}
          value={pickerValue()}
          onChange={onPick}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACE.screenX, gap: SPACE.lg },
  group: { gap: SPACE.md },
  list: { paddingHorizontal: SPACE.md },
  bell: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 56 },
  n: { flex: 1 },
  time: {
    minWidth: 64,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.sm,
  },
  remove: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
});
