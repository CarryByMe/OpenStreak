/**
 * «Дела» (design/mult/M-Tasks): сколько в работе и долгов, поиск, сферы, группы
 * «Долги / Сегодня / Завтра / Позже / Без даты». Луна — выполнить (выполненное остаётся
 * зачёркнутым до конца дня), тап по строке — правка, свайп влево — вычеркнуть с «Вернуть».
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as A from '../../core/actions';
import { AreaSheet } from '../areas/AreaSheet';
import { vibrateImpact } from '../../services/haptics';
import { entryOf, indexByDay, type CalView } from '../../core/calendar';
import { addDays } from '../../core/dates';
import { live, type ISODate, type Task } from '../../core/model';
import { effectiveSettings } from '../../core/settings';
import { useDataStore } from '../../core/store';
import { openTasksByArea, taskCounts, taskGroups, type TaskGroupKey } from '../../core/tasks';
import type { MessageKey } from '../../i18n';
import { useT, type Translate } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { RADIUS, SPACE, STROKE, TILT } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { AddRow, IconButton } from '../../ui/Button';
import { Card, type Tone } from '../../ui/Sticker';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/icons';
import { Segmented } from '../../ui/Segmented';
import { MoonRow } from '../../ui/MoonRow';
import { PriorityMarks } from '../../ui/Priority';
import { ScreenHeader, SectionTitle } from '../../ui/ScreenHeader';
import { SwipeRow } from '../../ui/SwipeRow';
import { TextField } from '../../ui/TextField';
import { useToast } from '../../ui/toast';
import { dayMonth, fullDate } from '../format';
import { TaskCalendar } from './TaskCalendar';
import { useNewSheet } from '../new/newSheetStore';
import { designStyles } from '../../theme/design';

/** Цвет и наклон плашки группы: долги — красные, сегодня — жёлтая, дальше — бумажные. */
const GROUP_TONE: Record<TaskGroupKey, [Tone, number]> = {
  debts: ['red', TILT.slightLeft],
  today: ['sun', TILT.slightRight],
  tomorrow: ['tag', -1.5],
  later: ['tag', 2],
  someday: ['tag', -1],
};

const GROUP_LABEL: Record<TaskGroupKey, MessageKey> = {
  debts: 'tasks.overdue',
  today: 'tasks.group.today',
  tomorrow: 'tasks.group.tomorrow',
  later: 'tasks.group.later',
  someday: 'tasks.group.someday',
};

export function TasksScreen() {
  const p = usePalette();
  const t = useT();
  const insets = useSafeAreaInsets();
  const data = useDataStore((s) => s.data);
  const today = useDataStore((s) => s.today);
  const toast = useToast((s) => s.show);
  const { show, editTask, editGoal } = useNewSheet();
  const [area, setArea] = useState<string | null>(null);
  const [areaSheet, setAreaSheet] = useState(0);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'list' | 'calendar'>('list');
  const [calView, setCalView] = useState<CalView>('month');
  const [cursor, setCursor] = useState<ISODate>(today);
  const [selected, setSelected] = useState<ISODate>(today);
  const weekStart = effectiveSettings(data).weekStart;

  const areas = useMemo(
    () => live(data.areas).sort((a, b) => a.createdAt - b.createdAt),
    [data.areas]
  );
  const areaName = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const areaColor = useMemo(() => new Map(areas.map((a) => [a.id, a.color])), [areas]);
  const perArea = useMemo(() => openTasksByArea(data), [data]);
  const counts = taskCounts(data, today);

  const groups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return taskGroups(data, today, { areaId: area })
      .map((g) => ({
        ...g,
        tasks: q ? g.tasks.filter((x) => x.title.toLocaleLowerCase().includes(q)) : g.tasks,
      }))
      .filter((g) => g.tasks.length > 0);
  }, [data, today, area, query]);

  const needle = query.trim().toLocaleLowerCase();
  const index = useMemo(() => indexByDay(data, area), [data, area]);
  const dayEntry = entryOf(index, selected);
  const dayTasks = needle
    ? dayEntry.tasks.filter((x) => x.title.toLocaleLowerCase().includes(needle))
    : dayEntry.tasks;
  // Под календарём остаются дела без даты, как в списке.
  const undated = groups.filter((g) => g.key === 'someday');

  const list = mode === 'calendar' ? undated : groups;

  const kicker = [
    t('tasks.open', { count: counts.open }),
    counts.debts > 0 ? t('tasks.debts', { count: counts.debts }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const remove = (task: Task) => {
    A.deleteTask(task.id);
    toast(t('toast.taskDeleted'), {
      label: t('common.return'),
      onPress: () => A.restoreTask(task.id),
    });
  };

  /** Наклейка со строками дел: луна — выполнить, тап — правка, свайп влево — вычеркнуть. */
  const taskCard = (
    tasks: Task[],
    debt: (task: Task) => boolean,
    head?: React.ReactNode,
    tail?: boolean
  ) => (
    <Card padded={false}>
      {/* Обрезка — во внутреннем блоке: подложка свайпа не вылезает за скругления,
          а тень наклейки остаётся снаружи. */}
      <View style={styles.clip}>
        {head}
        {tasks.map((task, i) => (
          <SwipeRow key={task.id} label={t('tasks.swipe')} onSwipe={() => remove(task)}>
            {(guard) => (
              <MoonRow
                title={task.title}
                sub={metaOf(task, today, areaName, t)}
                phase={task.doneOn ? 1 : 0}
                done={task.doneOn !== null}
                debt={debt(task)}
                tint={task.areaId ? areaColor.get(task.areaId) : undefined}
                onToggle={guard(() => {
                  if (!task.doneOn) vibrateImpact();
                  A.toggleTask(task.id);
                })}
                onPress={guard(() => editTask(task.id))}
                right={task.priority > 0 ? <PriorityMarks level={task.priority} /> : null}
                last={tail === false ? false : i === tasks.length - 1}
              />
            )}
          </SwipeRow>
        ))}
      </View>
    </Card>
  );

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACE.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        kicker={kicker}
        title={t('tab.tasks')}
        right={
          <IconButton
            icon="plus"
            variant="sun"
            label={t('tasks.add')}
            onPress={() =>
              show('task', { areaId: area, date: mode === 'calendar' ? selected : null })
            }
          />
        }
      />

      <Segmented<'list' | 'calendar'>
        label={t('tab.tasks')}
        value={mode}
        onChange={setMode}
        items={[
          { value: 'list', label: t('cal.mode.list') },
          { value: 'calendar', label: t('cal.mode.calendar') },
        ]}
      />

      <TextField
        variant="search"
        label={t('tasks.searchLabel')}
        placeholder={t('tasks.search')}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
      />

      {
        <View
          style={styles.chips}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('tasks.areas')}
        >
          {areas.length > 0 && (
            <Chip
              role="radio"
              label={t('tasks.all')}
              selected={area === null}
              onPress={() => setArea(null)}
            />
          )}
          {areas.map((a) => {
            const n = perArea.get(a.id) ?? 0;
            return (
              <Chip
                key={a.id}
                role="radio"
                label={n ? t('tasks.areaCount', { name: a.name, count: n }) : a.name}
                dot={a.color}
                selected={area === a.id}
                onPress={() => setArea(area === a.id ? null : a.id)}
              />
            );
          })}
          <Chip dashed label={t('area.add')} onPress={() => setAreaSheet((n) => n + 1)} />
        </View>
      }

      {areaSheet > 0 && (
        <AreaSheet
          key={areaSheet}
          visible
          editId={null}
          onClose={() => setAreaSheet(0)}
          onSaved={(id) => setArea(id)}
        />
      )}

      {mode === 'calendar' && (
        <>
          <TaskCalendar
            view={calView}
            cursor={cursor}
            selected={selected}
            today={today}
            weekStart={weekStart}
            index={index}
            onView={setCalView}
            onCursor={setCursor}
            onSelect={(d) => {
              setSelected(d);
              setCursor(d);
            }}
          />

          <View style={styles.group}>
            <SectionTitle
              title={selected === today ? t('when.today') : fullDate(t, selected)}
              count={dayTasks.length}
              tone={selected === today ? 'sun' : 'tag'}
              tilt={selected === today ? TILT.slightRight : -1}
            />
            {dayTasks.length === 0 && dayEntry.goals.length === 0 ? (
              <Text style={[TYPE.body, { color: p.muted }]}>{t('cal.empty')}</Text>
            ) : (
              taskCard(
                dayTasks,
                (task) => task.date !== null && task.date < today,
                dayEntry.goals.map((g, i) => (
                  <GoalDue
                    key={g.id}
                    text={g.text}
                    done={g.doneOn !== null}
                    last={dayTasks.length === 0 && i === dayEntry.goals.length - 1}
                    onPress={() => editGoal(g.id)}
                  />
                ))
              )
            )}
            <AddRow
              label={t('cal.add')}
              onPress={() => show('task', { areaId: area, date: selected })}
            />
          </View>
        </>
      )}

      {mode === 'calendar' && list.length === 0 ? null : list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[TYPE.body, { color: p.muted }]}>
            {t(query.trim() ? 'tasks.notFound' : 'tasks.empty')}
          </Text>
          {!query.trim() && (
            <AddRow label={t('tasks.add')} onPress={() => show('task', { areaId: area })} />
          )}
        </View>
      ) : (
        list.map((g) => (
          <View key={g.key} style={styles.group}>
            <SectionTitle
              title={t(GROUP_LABEL[g.key])}
              count={g.tasks.length}
              tone={GROUP_TONE[g.key][0]}
              tilt={GROUP_TONE[g.key][1]}
            />
            {taskCard(g.tasks, () => g.key === 'debts')}
          </View>
        ))
      )}

      {mode === 'list' && groups.length > 0 && (
        <Text style={[TYPE.meta, { color: p.muted }]}>{t('tasks.hint')}</Text>
      )}
    </ScrollView>
  );
}

/** Срок цели в списке дня: флажок и текст цели; тап — открыть цель. */
function GoalDue({
  text,
  done,
  last,
  onPress,
}: {
  text: string;
  done: boolean;
  last: boolean;
  onPress: () => void;
}) {
  const p = usePalette();
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('cal.goal')}: ${text}`}
      onPress={onPress}
      style={[
        styles.goalRow,
        { backgroundColor: p.surface, borderBottomColor: p.divider },
        !last && { borderBottomWidth: STROKE.thin },
      ]}
    >
      <Icon name="goals" size={22} tone="text" />
      <View style={styles.goalText}>
        <Text style={[TYPE.item, { color: p.text }]} numberOfLines={2}>
          {text}
        </Text>
        <Text style={[TYPE.meta, { color: p.muted }]}>{t('cal.goal')}</Text>
      </View>
      {done && <Icon name="check" size={20} tone="teal" />}
    </Pressable>
  );
}

/** Подпись под делом: когда (для долгов и «Позже» — дата, иначе время напоминания) · сфера. */
function metaOf(task: Task, today: string, areas: Map<string, string>, t: Translate): string {
  const when =
    task.date !== null && task.date < today && task.doneOn === null
      ? task.date === addDays(today, -1)
        ? t('tasks.yesterday')
        : dayMonth(t, task.date)
      : task.date !== null && task.date > addDays(today, 1)
        ? dayMonth(t, task.date)
        : task.remindAt;
  const area = task.areaId ? areas.get(task.areaId) : undefined;
  return [when, area].filter(Boolean).join(' · ');
}

const styles = designStyles(() =>
  StyleSheet.create({
    content: { paddingHorizontal: SPACE.screenX, paddingBottom: SPACE.xl, gap: SPACE.block },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.tight },
    group: { marginTop: SPACE.xs, gap: SPACE.md },
    clip: { overflow: 'hidden', borderRadius: RADIUS.lg - STROKE.outline },
    empty: { gap: SPACE.md, paddingTop: SPACE.sm },
    goalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      minHeight: 56,
      paddingHorizontal: SPACE.lg,
      paddingVertical: SPACE.sm,
    },
    goalText: { flex: 1, gap: 2 },
  })
);
