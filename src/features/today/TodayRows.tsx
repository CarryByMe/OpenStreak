/**
 * Строки «Сегодня» в оформлении «Обычный» — как в монолите: каждая привычка и задача в своей
 * карточке. Привычка: плитка-значок, название, дни по расписанию, сфера, серия; справа пальма
 * отдыха, корзина и большая кнопка-галочка. Задача: круг-отметка, название, дата (долг — красным),
 * флажок с приоритетом, сфера; справа корзина.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as A from '../../core/actions';
import { habitColor } from '../../core/colors';
import { fullValue } from '../../core/habits';
import type { Habit, Task } from '../../core/model';
import { useDataStore } from '../../core/store';
import { subtaskFraction, subtasksOf } from '../../core/subtasks';
import type { MessageKey } from '../../i18n';
import { vibrateImpact } from '../../services/haptics';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { SIZE, SPACE } from '../../theme/metrics';
import { ensureContrast } from '../../theme/readable';
import { TYPE } from '../../theme/type';
import { Icon, IconTile, type UiIconName } from '../../ui/icons';
import { PlainMark } from '../../ui/PlainMark';
import { Card } from '../../ui/Sticker';
import { useToast } from '../../ui/toast';
import { relDate } from '../format';
import { useNewSheet } from '../new/newSheetStore';
import { scheduleLabel } from '../habits/habitText';
import { SubtaskBadge, SubtaskList } from '../tasks/SubtaskList';

/** Цвет сферы или привычки для подписи: контраст текста ≥ 4.5 на фоне и карточке. */
function useTextTint(color: string | undefined): string | undefined {
  const p = usePalette();
  return color ? ensureContrast(color, [p.bg, p.surface], 4.5) : undefined;
}

/** Подпись с иконкой: «🔁 пн, ср», «📅 Вчера», «⚑ Высокий». */
function Meta({ icon, text, color }: { icon?: UiIconName; text: string; color: string }) {
  return (
    <View style={styles.metaItem}>
      {icon && <Icon name={icon} size={12} color={color} />}
      <Text style={[TYPE.meta, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/** Кнопка-значок справа в строке: пальма, корзина. */
function RowButton({
  icon,
  label,
  onPress,
  armed = false,
}: {
  icon: UiIconName;
  label: string;
  onPress: () => void;
  /** корзина взведена: второе нажатие удалит */
  armed?: boolean;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.rowButton,
        armed && { backgroundColor: p.tag },
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={19} color={armed ? p.red : p.muted} />
    </Pressable>
  );
}

/** Двойное нажатие на корзину: первое взводит, второе (в течение 3 с) удаляет. */
function useTwoTap(onConfirm: () => void, onArm: () => void) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  const press = () => {
    if (armed) {
      setArmed(false);
      onConfirm();
    } else {
      setArmed(true);
      onArm();
    }
  };
  return [armed, press] as const;
}

export function TaskTodayRow({ task, today }: { task: Task; today: string }) {
  const p = usePalette();
  const t = useT();
  const toast = useToast((s) => s.show);
  const editTask = useNewSheet((s) => s.editTask);
  const area = useDataStore((s) => (task.areaId ? s.data.areas[task.areaId] : undefined));
  const allSubtasks = useDataStore((s) => s.data.subtasks);
  const items = useMemo(
    () => subtasksOf({ subtasks: allSubtasks }, task.id),
    [allSubtasks, task.id]
  );
  const areaText = useTextTint(area && !area.deletedAt ? area.color : undefined);
  const debt = task.date !== null && task.date < today;
  const prioColor = [p.muted, p.prioLow, p.prioMid, p.red][task.priority];

  const toggle = () => {
    A.toggleTask(task.id);
    vibrateImpact();
    toast(t('toast.marked', { title: task.title }), {
      label: t('common.undo'),
      onPress: () => A.toggleTask(task.id),
    });
  };
  const remove = () => {
    A.deleteTask(task.id);
    toast(t('toast.taskDeleted'), {
      label: t('common.return'),
      onPress: () => A.restoreTask(task.id),
    });
  };

  return (
    <Card padded={false} radius={15}>
      <View style={styles.task}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: false }}
          accessibilityLabel={t('a11y.check', { title: task.title })}
          onPress={toggle}
          style={({ pressed }) => [styles.taskMark, pressed && styles.pressed]}
        >
          <PlainMark fill={subtaskFraction(items)} tint={area?.color} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={task.title}
          onPress={() => editTask(task.id)}
          style={styles.body}
        >
          <Text style={[TYPE.item, { color: p.text }]}>{task.title}</Text>
          <View style={styles.meta}>
            {area && !area.deletedAt && (
              <Meta icon="layers" text={area.name} color={areaText ?? p.muted} />
            )}
            {task.date !== null && (
              <Meta
                icon="calendar"
                text={relDate(t, task.date, today)}
                color={debt ? p.red : p.muted}
              />
            )}
            {task.priority > 0 && (
              <Meta
                icon="flag"
                text={t(`priority.${task.priority}` as MessageKey)}
                color={prioColor}
              />
            )}
            {!!task.remindAt && <Meta icon="remind" text={task.remindAt} color={p.muted} />}
          </View>
        </Pressable>
        {items.length > 0 && <SubtaskBadge task={task} items={items} />}
        <RowButton icon="delete" label={t('row.delete', { title: task.title })} onPress={remove} />
      </View>
      {items.length > 0 && (
        <SubtaskList
          task={task}
          items={items}
          tint={area && !area.deletedAt ? area.color : undefined}
          onEdit={() => editTask(task.id)}
        />
      )}
    </Card>
  );
}

export function HabitTodayRow({
  habit,
  today,
  value,
  streak,
  weekStart,
}: {
  habit: Habit;
  today: string;
  /** значение за сегодня (числовая — сколько набрано) */
  value: number;
  streak: number;
  weekStart: 0 | 1;
}) {
  const p = usePalette();
  const t = useT();
  const toast = useToast((s) => s.show);
  const editHabit = useNewSheet((s) => s.editHabit);
  const areas = useDataStore((s) => s.data.areas);
  const area = habit.areaId ? areas[habit.areaId] : undefined;
  const color = habitColor(habit, areas);
  const scheduleText = useTextTint(color) ?? p.text;
  const areaText = useTextTint(area && !area.deletedAt ? area.color : undefined);
  const numeric = habit.measure === 'numeric';
  const full = fullValue(habit);

  const check = () => {
    A.setCheckValue(habit.id, today, full);
    vibrateImpact();
    toast(t('toast.marked', { title: habit.name }), {
      label: t('common.undo'),
      onPress: () => A.setCheckValue(habit.id, today, value),
    });
  };
  const rest = () => {
    A.toggleRestDay(habit.id, today);
    toast(t('toast.habitRest'), {
      label: t('common.undo'),
      onPress: () => A.toggleRestDay(habit.id, today),
    });
  };
  const [armed, remove] = useTwoTap(
    () => {
      A.deleteHabit(habit.id);
      toast(t('toast.habitDeleted'));
    },
    () => toast(t('habit.deleteConfirm'))
  );

  const extra = numeric
    ? t('row.numericLeft', { left: Math.max(0, habit.target - value) })
    : streak > 0
      ? t('row.streak', { count: streak })
      : null;

  return (
    <Card padded={false} radius={18}>
      <View style={styles.habit}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={habit.name}
          onPress={() => editHabit(habit.id)}
          style={styles.habitMain}
        >
          <IconTile icon={habit.icon} size={30} color={color} />
          <View style={styles.body}>
            <Text style={[TYPE.itemStrong, { color: p.text }]}>{habit.name}</Text>
            <View style={styles.meta}>
              <Meta
                icon="repeat"
                text={scheduleLabel(t, habit.days, weekStart)}
                color={scheduleText}
              />
              {area && !area.deletedAt && (
                <Meta icon="layers" text={area.name} color={areaText ?? p.muted} />
              )}
              {extra && <Meta text={extra} color={p.muted} />}
            </View>
          </View>
        </Pressable>
        <RowButton icon="palm" label={t('row.restFor', { title: habit.name })} onPress={rest} />
        <RowButton
          icon="delete"
          label={t('row.delete', { title: habit.name })}
          onPress={remove}
          armed={armed}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: false }}
          accessibilityLabel={t('a11y.check', { title: habit.name })}
          onPress={check}
          style={({ pressed }) => [styles.habitMark, pressed && styles.pressed]}
        >
          <PlainMark
            habit
            fill={Math.min(1, value / full)}
            tint={color}
            label={numeric ? t('row.numeric', { value, target: habit.target }) : undefined}
          />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingVertical: SPACE.sm,
    paddingLeft: SPACE.xs,
    paddingRight: SPACE.sm,
  },
  taskMark: {
    width: SIZE.touch,
    height: SIZE.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    padding: SPACE.md,
  },
  habitMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  habitMark: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 3 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  rowButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.88 }] },
});
