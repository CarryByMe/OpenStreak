/**
 * «Сегодня» (design/mult/M-Today): дата плашкой, луна дня в наклейке со счётом и очками дня,
 * волк с цитатой, строка «Запиши…», «Осталось» лунами и журнал «Сделано» со временем.
 */
import { habitColor } from '../../core/colors';
import React, { useMemo } from 'react';
import { ReviewCard } from './ReviewCard';
import { HabitTodayRow, TaskTodayRow } from './TodayRows';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as A from '../../core/actions';
import { vibrateImpact } from '../../services/haptics';
import { addDays, clockOf } from '../../core/dates';
import { closedStreak, dayNumber, dayView, isClosed, type DayItem } from '../../core/day';
import { dataOf, fullValue, habitStats, indexHabits, liveCheck } from '../../core/habits';
import { dayPoints } from '../../core/points';
import { quoteOfDay } from '../../core/quotes';
import { effectiveSettings, settingsOf } from '../../core/settings';
import type { Snapshot } from '../../core/model';
import { useDataStore } from '../../core/store';
import { subtaskFraction, subtasksOf } from '../../core/subtasks';
import { quoteCount, type MessageKey } from '../../i18n';
import { useT, type Translate } from '../../store/prefsStore';
import { usePalette, usePlain, useSoft } from '../../store/themeStore';
import { designStyles } from '../../theme/design';
import { RADIUS, SIZE, SPACE, STROKE, TILT } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { AddRow, IconButton, LinkRow } from '../../ui/Button';
import { Moon } from '../../ui/Moon';
import { DayRail, type RailState } from '../../ui/DayRail';
import { LogRow, MoonRow } from '../../ui/MoonRow';
import { PriorityMarks } from '../../ui/Priority';
import { SectionTitle } from '../../ui/ScreenHeader';
import { Card, Pill, Tag, WolfQuote } from '../../ui/Sticker';
import { useToast } from '../../ui/toast';
import { dayMonth, fullDate } from '../format';
import { itemTint } from '../itemTint';
import { useNewSheet } from '../new/newSheetStore';
import { SubtaskBadge, SubtaskList } from '../tasks/SubtaskList';

type Props = {
  onOpenSettings: () => void;
  onOpenReview: () => void;
  onOpenHistory: () => void;
};

export function TodayScreen({ onOpenSettings, onOpenReview, onOpenHistory }: Props) {
  const p = usePalette();
  const t = useT();
  const insets = useSafeAreaInsets();
  const data = useDataStore((s) => s.data);
  const today = useDataStore((s) => s.today);
  const showNew = useNewSheet((s) => s.show);
  const toast = useToast((s) => s.show);

  const view = useMemo(() => {
    const idx = indexHabits(data);
    const day = dayView(data, today, today, idx);
    const points = dayPoints(data, today, today, idx);
    const streakOf = (habitId: string) => {
      const h = data.habits[habitId];
      return h ? habitStats(h, dataOf(idx, habitId), today).streak : 0;
    };
    return { day, points, streakOf };
  }, [data, today]);

  const settings = effectiveSettings(data);
  const quote = quoteOfDay(settings, today, quoteCount('ru'));
  const { day } = view;
  const closed = isClosed(data, today);
  const streak = closedStreak(data, today);
  const number = dayNumber(data.profile.startedAt, today);
  const rest = day.total - day.done;
  const plain = usePlain();
  const soft = useSoft();
  const rail: RailState[] = [
    ...Array.from({ length: day.done }, (): RailState => 'done'),
    ...day.left.map((i): RailState => (i.kind === 'task' && i.debt ? 'debt' : 'open')),
  ];

  const phaseText =
    day.total === 0
      ? t('today.empty')
      : rest > 0
        ? t('today.toFull', { count: rest })
        : t(closed ? 'today.closed' : 'today.fullMoon');

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACE.md }]}
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <Tag label={fullDate(t, today)} font="date" tilt={TILT.slightLeft} shadow="sm" />
          {plain ? (
            <Text accessibilityRole="header" style={[TYPE.title, { color: p.text }]}>
              {t('tab.today')}
            </Text>
          ) : (
            <Text style={[TYPE.meta, { color: p.muted }]}>
              {streak > 0
                ? t('today.meta', { day: number, streak })
                : t('today.metaFirst', { day: number })}
            </Text>
          )}
        </View>
        <IconButton icon="settings" label={t('settings.title')} onPress={onOpenSettings} />
      </View>

      {plain ? (
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={[TYPE.item, { color: p.text }]}>
              {day.total === 0
                ? t('today.empty')
                : t('today.doneOf', { done: day.done, total: day.total })}
            </Text>
            {rest > 0 && (
              <Text style={[TYPE.meta, { color: p.muted }]}>
                {t('today.restCount', { count: rest })}
              </Text>
            )}
          </View>
          {day.total > 0 && (
            <DayRail
              items={rail}
              label={t('today.progress', { done: day.done, total: day.total })}
            />
          )}
        </View>
      ) : (
        <Card radius={RADIUS.xl} style={styles.hero}>
          <View
            style={styles.heroRow}
            accessible
            accessibilityLabel={t('today.progress', { done: day.done, total: day.total })}
          >
            <Moon phase={day.phase} size={SIZE.moonDay} />
            <View style={styles.score}>
              <Text style={[TYPE.numberXL, { color: p.text }]}>
                {day.done}
                <Text style={[TYPE.numberXLLight, { color: p.muted }]}>
                  {' / '}
                  {day.total}
                </Text>
              </Text>
              <Text style={[TYPE.note, { color: p.muted }]}>{phaseText}</Text>
            </View>
          </View>
          {settings.ranks && view.points > 0 && (
            <View style={styles.points}>
              <Tag
                label={t('today.points', { count: view.points })}
                tone="sun"
                font="badge"
                tilt={6}
                header={false}
              />
            </View>
          )}
        </Card>
      )}

      {quote !== null && (
        <WolfQuote
          text={t(`quote.${quote}` as MessageKey)}
          sign={t('wolf.signature')}
          mood={day.total > 0 && rest === 0 ? 'proud' : 'smirk'}
        />
      )}

      <AddRow
        label={t(soft ? 'today.addTask' : 'common.addPrompt')}
        onPress={() => showNew('task')}
      />

      {plain && <ReviewCard onOpenReview={onOpenReview} onOpenHistory={onOpenHistory} />}

      {soft ? (
        <SoftLists
          data={data}
          today={today}
          left={day.left}
          habitsDone={day.log.some((i) => i.kind === 'habit')}
          streakOf={view.streakOf}
        />
      ) : (
        day.left.length > 0 && (
          <View style={styles.section}>
            <SectionTitle
              title={t('today.left')}
              count={day.left.length}
              tone="sun"
              tilt={TILT.left}
            />
            <Card padded={false}>
              <View style={styles.clip}>
                {day.left.map((item, i) => (
                  <LeftRow
                    key={`${item.kind}:${item.id}`}
                    item={item}
                    today={today}
                    view={view}
                    t={t}
                    last={i === day.left.length - 1}
                  />
                ))}
              </View>
            </Card>
          </View>
        )
      )}

      {day.log.length > 0 && (
        <View style={styles.section}>
          <SectionTitle
            title={t('today.done')}
            count={day.done}
            tone="teal"
            tilt={TILT.slightRight}
          />
          <Card padded={false}>
            <View style={styles.clip}>
              {day.log.map((item, i) => {
                // чистый день вредной привычки — не отметка, вернуть нечего
                const returnable = item.kind === 'task' || item.at !== null;
                const giveBack = () => {
                  const undo = A.returnToActive(item.kind, item.id, today);
                  if (!undo) return;
                  vibrateImpact();
                  toast(t('toast.returned', { title: item.title }), {
                    label: t('common.undo'),
                    onPress: undo,
                  });
                };
                const returnLabel = t('a11y.returnItem', { title: item.title });
                const key = `${item.kind}:${item.id}`;
                if (item.state === 'done' && !item.bad) {
                  // Выполненное — тот же кружок с галочкой, что у строк выше; нажатие возвращает
                  // в активные. Цвет — сферы или привычки, как в «Обычном».
                  const tint = itemTint(data, item);
                  return (
                    <MoonRow
                      key={key}
                      title={item.title}
                      sub={item.at !== null ? clockOf(item.at) : undefined}
                      phase={1}
                      done
                      shape={item.kind === 'habit' ? 'square' : 'circle'}
                      tint={tint}
                      onToggle={giveBack}
                      toggleLabel={returnLabel}
                      last={i === day.log.length - 1}
                    />
                  );
                }
                return (
                  <LogRow
                    key={key}
                    time={item.at !== null ? clockOf(item.at) : ''}
                    title={item.title}
                    mark={t(item.state === 'slip' ? 'mark.slip' : 'mark.clean')}
                    bad={item.state === 'slip'}
                    onReturn={returnable ? giveBack : undefined}
                    returnLabel={returnLabel}
                  />
                );
              })}
            </View>
          </Card>
        </View>
      )}

      {!plain && day.total > 0 && (
        <LinkRow
          title={t(closed ? 'review.linkClosed' : 'review.link')}
          sub={t(closed ? 'review.linkClosedSub' : 'review.linkSub')}
          onPress={onOpenReview}
        />
      )}
    </ScrollView>
  );
}

/**
 * «Обычный» (монолит): «Привычки на сегодня» и «Задачи на сегодня» — отдельными блоками,
 * каждая строка в своей карточке.
 */
function SoftLists({
  data,
  today,
  left,
  habitsDone,
  streakOf,
}: {
  data: Snapshot;
  today: string;
  left: DayItem[];
  /** сегодня есть отмеченные привычки — когда открытых нет, пишем «все выполнены» */
  habitsDone: boolean;
  streakOf: (habitId: string) => number;
}) {
  const p = usePalette();
  const t = useT();
  const { weekStart } = settingsOf(data);
  const habits = left.filter((i) => i.kind === 'habit');
  const tasks = left.filter((i) => i.kind === 'task');
  return (
    <>
      {habits.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle
            title={t('today.habitsTitle')}
            count={habits.length}
            tone="sun"
            tilt={TILT.left}
          />
          <View style={styles.list}>
            {habits.map((item) => {
              const habit = data.habits[item.id];
              if (!habit) return null;
              return (
                <HabitTodayRow
                  key={item.id}
                  habit={habit}
                  today={today}
                  value={liveCheck(data, habit.id, today)?.value ?? 0}
                  streak={streakOf(habit.id)}
                  weekStart={weekStart}
                />
              );
            })}
          </View>
        </View>
      ) : (
        habitsDone && (
          <Text style={[TYPE.meta, styles.note, { color: p.muted }]}>
            {t('today.habitsAllDone')}
          </Text>
        )
      )}
      {tasks.length > 0 && (
        <View style={styles.section}>
          <SectionTitle
            title={t('today.tasksTitle')}
            count={tasks.length}
            tone="sun"
            tilt={TILT.slightRight}
          />
          <View style={styles.list}>
            {tasks.map((item) => {
              const task = data.tasks[item.id];
              return task ? <TaskTodayRow key={item.id} task={task} today={today} /> : null;
            })}
          </View>
        </View>
      )}
    </>
  );
}

type RowProps = {
  item: DayItem;
  today: string;
  view: { streakOf: (habitId: string) => number };
  t: Translate;
  last: boolean;
};

function LeftRow({ item, today, view, t, last }: RowProps) {
  const p = usePalette();
  const data = useDataStore((s) => s.data);
  const toast = useToast((s) => s.show);
  const editTask = useNewSheet((s) => s.editTask);

  if (item.kind === 'task') {
    const task = data.tasks[item.id];
    if (!task) return null;
    const sub = item.debt
      ? task.date === addDays(today, -1)
        ? t('row.debtYesterday')
        : t('row.debtSince', { date: dayMonth(t, task.date!) })
      : task.remindAt
        ? t('row.remindAt', { time: task.remindAt })
        : undefined;
    const items = subtasksOf(data, task.id);
    const base = item.debt ? (
      <Pill label={t('mark.debt')} tone="red" filled />
    ) : task.priority > 0 ? (
      <PriorityMarks level={task.priority} />
    ) : null;
    const right =
      items.length > 0 ? (
        <View style={styles.rowRight}>
          <SubtaskBadge task={task} items={items} />
          {base}
        </View>
      ) : (
        base
      );
    const row = (
      <MoonRow
        title={item.title}
        sub={sub}
        phase={subtaskFraction(items)}
        debt={item.debt}
        tint={task.areaId ? data.areas[task.areaId]?.color : undefined}
        right={right}
        last={last}
        onToggle={() => {
          A.toggleTask(task.id);
          vibrateImpact();
          toast(t('toast.marked', { title: item.title }), {
            label: t('common.undo'),
            onPress: () => A.toggleTask(task.id),
          });
        }}
      />
    );
    return items.length > 0 ? (
      <>
        {row}
        <SubtaskList task={task} items={items} onEdit={() => editTask(task.id)} />
      </>
    ) : (
      row
    );
  }

  const habit = data.habits[item.id];
  if (!habit) return null;
  const streak = view.streakOf(habit.id);
  const numeric = habit.measure === 'numeric';
  const value = liveCheck(data, habit.id, today)?.value ?? 0;
  const sub = numeric
    ? [
        t('row.numericLeft', { left: Math.max(0, habit.target - value) }),
        streak > 0 ? t('row.streak', { count: streak }) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;
  const meta = numeric
    ? t('row.numeric', { value, target: habit.target })
    : streak > 0
      ? t('row.streakShort', { count: streak })
      : '';
  return (
    <MoonRow
      title={item.title}
      sub={sub}
      phase={item.fraction}
      shape="square"
      tint={habitColor(habit, data.areas)}
      last={last}
      right={meta ? <Text style={[TYPE.badge, { color: p.text }]}>{meta}</Text> : null}
      onToggle={() => {
        A.setCheckValue(habit.id, today, fullValue(habit));
        vibrateImpact();
        toast(t('toast.marked', { title: item.title }), {
          label: t('common.undo'),
          onPress: () => A.setCheckValue(habit.id, today, value),
        });
      }}
    />
  );
}

const styles = designStyles(() =>
  StyleSheet.create({
    content: { paddingHorizontal: SPACE.screenX, paddingBottom: SPACE.xl, gap: SPACE.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    titles: { flex: 1, alignItems: 'flex-start', gap: SPACE.sm },
    hero: { marginTop: SPACE.xs },
    // Обрезка во внутреннем блоке: фон строк не вылезает за скругления, а тень наклейки остаётся снаружи.
    clip: { overflow: 'hidden', borderRadius: RADIUS.lg - STROKE.outline },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.hero },
    score: { flex: 1, gap: SPACE.xs },
    points: { position: 'absolute', top: -16, right: 14 },
    section: { gap: SPACE.md },
    list: { gap: 9 },
    note: { textAlign: 'center' },
    summary: { gap: SPACE.sm },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  })
);
