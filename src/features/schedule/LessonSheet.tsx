/**
 * Шторка «Новое занятие» (design/schedule, экраны 4–5): шаблон («Пара», «Зал», «Работа», «Своё»),
 * название и строки формы — вид, дни, время (у пары — номер из звонков), недели, где,
 * напоминание, сфера, привычка. Правка того же занятия — с «Удалить».
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import * as A from '../../core/actions';
import { live, type LessonKind, type WeekParity } from '../../core/model';
import { lessonTime, REMIND_OPTIONS, weekDays } from '../../core/schedule';
import { settingsOf } from '../../core/settings';
import { useDataStore } from '../../core/store';
import type { MessageKey } from '../../i18n';
import { askNotificationPermission } from '../../services/notifications';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { FONT } from '../../theme/fonts';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { FormRow } from '../../ui/FormRow';
import { SelectRow } from '../../ui/SelectRow';
import { Sheet } from '../../ui/Sheet';
import { NO_WEB_OUTLINE, TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import { cap, KIND_ICON } from './scheduleUi';

/** Системный выбор времени есть только на телефонах. */
const HAS_PICKER = Platform.OS !== 'web';

const KINDS: LessonKind[] = ['pair', 'gym', 'work', 'custom'];
const NOTES = ['lecture', 'practice', 'lab', 'seminar'] as const;
/** Своё время по умолчанию для шаблона. */
const DEFAULT_TIME: Record<LessonKind, [string, string]> = {
  pair: ['08:30', '10:00'],
  gym: ['18:00', '19:30'],
  work: ['09:00', '18:00'],
  custom: ['12:00', '13:00'],
};

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

type Props = {
  editId: string | null;
  /** день недели для нового занятия (0 — воскресенье) */
  day?: number;
  onClose: () => void;
};

export function LessonSheet({ editId, day, onClose }: Props) {
  const t = useT();
  const p = usePalette();
  const toast = useToast((s) => s.show);
  const data = useDataStore((s) => s.data);
  const s = settingsOf(data);
  const editing = editId ? data.lessons[editId] : undefined;
  const lesson = editing && editing.deletedAt === null ? editing : undefined;

  const [kind, setKind] = useState<LessonKind>(lesson?.kind ?? 'pair');
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [note, setNote] = useState(lesson?.note ?? '');
  const [days, setDays] = useState<number[]>(lesson?.days ?? (day !== undefined ? [day] : []));
  const [pair, setPair] = useState<number | null>(
    lesson ? lesson.pair : s.bells.length > 0 ? 1 : null
  );
  const [pairSpan, setPairSpan] = useState(lesson?.pairSpan ?? 1);
  const [start, setStart] = useState(lesson?.start || DEFAULT_TIME.pair[0]);
  const [end, setEnd] = useState(lesson?.end || DEFAULT_TIME.pair[1]);
  const [weeks, setWeeks] = useState<WeekParity>(lesson?.weeks ?? 'all');
  const [place, setPlace] = useState(lesson?.place ?? '');
  const [remindBefore, setRemindBefore] = useState<number | null>(lesson?.remindBefore ?? null);
  const [areaId, setAreaId] = useState<string | null>(lesson?.areaId ?? null);
  const [habitId, setHabitId] = useState<string | null>(lesson?.habitId ?? null);
  const [openRow, setOpenRow] = useState<string | null>(lesson ? null : 'days');
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const toggleRow = (k: string) => setOpenRow((cur) => (cur === k ? null : k));

  const areas = useMemo(
    () => live(data.areas).sort((a, b) => a.createdAt - b.createdAt),
    [data.areas]
  );
  const habits = useMemo(
    () =>
      live(data.habits)
        .filter((h) => h.kind === 'good' && h.archivedAt === null)
        .sort((a, b) => a.createdAt - b.createdAt),
    [data.habits]
  );

  // Шаблон подставляет время; пара — по звонкам. Название не трогаем, если его уже вписали.
  const pickKind = (k: LessonKind) => {
    setKind(k);
    if (k === 'pair' && s.bells.length > 0) {
      setPair((cur) => cur ?? 1);
    } else {
      setPair(null);
      setStart(DEFAULT_TIME[k][0]);
      setEnd(DEFAULT_TIME[k][1]);
    }
    if (!title.trim() && (k === 'gym' || k === 'work')) setTitle(t(`lesson.kind.${k}`));
  };

  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const time = lessonTime({ pair, pairSpan, start, end }, s.bells);
  const dayNames = weekDays(s.weekStart)
    .filter((d) => days.includes(d))
    .map((d) => cap(t(`day.short.${d}` as MessageKey)))
    .join(', ');
  const canSave = title.trim().length > 0 && days.length > 0 && !!time.start && !!time.end;

  const save = () => {
    if (!canSave) return;
    const input: A.LessonInput = {
      title,
      kind,
      note,
      days,
      pair,
      pairSpan: pair === null ? 1 : pairSpan,
      start: pair === null ? start : '',
      end: pair === null ? end : '',
      weeks: s.weekParity ? weeks : 'all',
      place,
      remindBefore,
      areaId,
      habitId,
    };
    if (lesson) A.updateLesson(lesson.id, input);
    else A.createLesson(input);
    if (remindBefore !== null) void askNotificationPermission();
    onClose();
    toast(t('toast.saved'));
  };

  const remove = () => {
    if (!lesson) return;
    const id = lesson.id;
    A.deleteLesson(id);
    onClose();
    toast(t('lesson.deleted'), { label: t('common.return'), onPress: () => A.restoreLesson(id) });
  };

  const onPick = (e: DateTimePickerEvent, value?: Date) => {
    const which = picker;
    setPicker(null);
    if (e.type !== 'set' || !value) return;
    if (which === 'start') setStart(timeOf(value));
    else setEnd(timeOf(value));
  };

  const timeValue =
    pair !== null && s.bells[pair - 1]
      ? `${t('schedule.pairN', { n: pair })} · ${time.start}–${time.end}`
      : `${time.start}–${time.end}`;

  return (
    <Sheet
      visible
      onClose={onClose}
      title={t(lesson ? 'lesson.edit' : 'lesson.new')}
      footer={
        <View style={styles.footer}>
          {lesson && <Button label={t('edit.delete')} variant="danger" onPress={remove} />}
          <Button
            label={t(lesson ? 'edit.save' : 'lesson.save')}
            onPress={save}
            disabled={!canSave}
            style={styles.grow}
          />
        </View>
      }
    >
      <View style={styles.chips} accessibilityRole="radiogroup">
        {KINDS.map((k) => (
          <Chip
            key={k}
            size="md"
            role="radio"
            icon={KIND_ICON[k]}
            label={t(`lesson.kind.${k}`)}
            selected={kind === k}
            onPress={() => pickKind(k)}
          />
        ))}
      </View>

      <TextInput
        accessibilityLabel={t('lesson.title')}
        placeholder={t('lesson.title')}
        placeholderTextColor={p.muted}
        value={title}
        onChangeText={setTitle}
        autoFocus={!lesson}
        maxLength={200}
        returnKeyType="done"
        style={[
          TYPE.title,
          styles.titleInput,
          { color: p.text, borderBottomColor: p.divider },
          Platform.OS === 'web' ? NO_WEB_OUTLINE : null,
        ]}
      />

      <View>
        {kind === 'pair' && (
          <SelectRow<string>
            icon="layers"
            label={t('lesson.note')}
            value={note}
            set={!!note}
            onChange={setNote}
            options={[
              { value: '', label: t('lesson.note.none'), icon: 'close' },
              ...NOTES.map((n) => ({
                value: t(`lesson.note.${n}`).toLowerCase(),
                label: t(`lesson.note.${n}`),
                icon: 'book' as const,
              })),
              // Свой вид из старой записи — тоже вариант, чтобы он не терялся.
              ...(note && !NOTES.some((n) => t(`lesson.note.${n}`).toLowerCase() === note)
                ? [{ value: note, label: cap(note), icon: 'edit' as const }]
                : []),
            ]}
          />
        )}

        <FormRow
          icon="repeat"
          label={t('lesson.days')}
          value={dayNames || t('form.unset')}
          set={days.length > 0}
          open={openRow === 'days'}
          onPress={() => toggleRow('days')}
        >
          <View style={styles.chips}>
            {weekDays(s.weekStart).map((d) => (
              <Chip
                key={d}
                size="md"
                label={cap(t(`day.short.${d}` as MessageKey))}
                selected={days.includes(d)}
                onPress={() => toggleDay(d)}
              />
            ))}
          </View>
        </FormRow>

        {kind === 'pair' && s.bells.length > 0 ? (
          <SelectRow<number | null>
            icon="clock"
            label={t('lesson.time')}
            value={pair !== null && s.bells[pair - 1] ? pair : null}
            set
            onChange={(v) => {
              setPair(v);
              if (v === null) toggleRow('time');
            }}
            options={[
              ...s.bells.map((b, i) => ({
                value: i + 1,
                label: `${t('schedule.pairN', { n: i + 1 })} · ${b.start}–${b.end}`,
                icon: 'clock' as const,
              })),
              { value: null, label: t('lesson.ownTime'), icon: 'edit' as const },
            ]}
          />
        ) : null}

        {kind === 'pair' && pair !== null && s.bells[pair] && (
          <SelectRow<number>
            icon="layers"
            label={t('lesson.length')}
            value={pairSpan}
            set={pairSpan > 1}
            onChange={setPairSpan}
            options={[
              { value: 1, label: t('lesson.single'), icon: 'book' },
              { value: 2, label: t('lesson.double'), icon: 'layers' },
            ]}
          />
        )}

        {(pair === null || kind !== 'pair' || !s.bells[pair - 1]) && (
          <FormRow
            icon="clock"
            label={
              kind === 'pair' && s.bells.length > 0
                ? `${t('lesson.start')} – ${t('lesson.end')}`
                : t('lesson.time')
            }
            value={timeValue}
            set
            open={openRow === 'time'}
            onPress={() => toggleRow('time')}
          >
            <View style={styles.chips}>
              <Chip
                size="md"
                icon="clock"
                label={`${t('lesson.start')} ${start}`}
                onPress={() => HAS_PICKER && setPicker('start')}
              />
              <Chip
                size="md"
                icon="clock"
                label={`${t('lesson.end')} ${end}`}
                onPress={() => HAS_PICKER && setPicker('end')}
              />
            </View>
          </FormRow>
        )}

        {s.weekParity && (
          <SelectRow<WeekParity>
            icon="calendar"
            label={t('lesson.weeks')}
            value={weeks}
            set={weeks !== 'all'}
            onChange={setWeeks}
            options={(['all', 'odd', 'even'] as const).map((w) => ({
              value: w,
              label: t(`lesson.weeks.${w}`),
              icon: 'calendar' as const,
            }))}
          />
        )}

        <FormRow
          icon="place"
          label={t('lesson.place')}
          value={place || t('form.unset')}
          set={!!place}
          open={openRow === 'place'}
          onPress={() => toggleRow('place')}
        >
          <TextField
            variant="note"
            label={t('lesson.placeHint')}
            showLabel={false}
            placeholder={t('lesson.placeHint')}
            value={place}
            onChangeText={setPlace}
            maxLength={200}
          />
        </FormRow>

        <SelectRow<number | null>
          icon="remind"
          label={t('lesson.remind')}
          value={remindBefore}
          set={remindBefore !== null}
          onChange={setRemindBefore}
          options={[
            { value: null, label: t('lesson.remind.off'), icon: 'close' },
            ...REMIND_OPTIONS.map((m) => ({
              value: m,
              label: t('lesson.remind.min', { count: m }),
              icon: 'remind' as const,
            })),
          ]}
        />

        <SelectRow<string | null>
          icon="habits"
          label={cap(t('new.area'))}
          value={areaId}
          set={areaId !== null}
          onChange={setAreaId}
          options={[
            { value: null, label: t('area.none') },
            ...areas.map((a) => ({ value: a.id, label: a.name, dot: a.color })),
          ]}
        />

        {habits.length > 0 && (
          <SelectRow<string | null>
            icon="check"
            label={t('lesson.habit')}
            value={habitId && habits.some((h) => h.id === habitId) ? habitId : null}
            set={habitId !== null}
            onChange={setHabitId}
            options={[
              { value: null, label: t('lesson.habit.none'), icon: 'close' },
              ...habits.map((h) => ({ value: h.id, label: h.name, icon: 'habits' as const })),
            ]}
          />
        )}
      </View>

      {picker && (
        <DateTimePicker
          mode="time"
          value={new Date(`2000-01-01T${picker === 'start' ? start : end}:00`)}
          onChange={onPick}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: SPACE.md },
  grow: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, alignItems: 'center' },
  titleInput: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    fontSize: 24,
    fontFamily: FONT.inter.medium,
  },
});
