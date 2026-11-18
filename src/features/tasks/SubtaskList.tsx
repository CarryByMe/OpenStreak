/**
 * Пункты дела под строкой: отметка нажатием, «+ пункт» открывает правку дела. Последний
 * отмеченный пункт закрывает дело — с «Отменить» на 5 секунд. И счётчик «2/5» со стрелкой,
 * которым дело раскрывается.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as A from '../../core/actions';
import type { Subtask, Task } from '../../core/model';
import { subtaskProgress } from '../../core/subtasks';
import { vibrateImpact } from '../../services/haptics';
import { useT } from '../../store/prefsStore';
import { usePalette, usePlain } from '../../store/themeStore';
import { SIZE, SPACE, STROKE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { Icon } from '../../ui/icons';
import { Moon } from '../../ui/Moon';
import { PlainMark } from '../../ui/PlainMark';
import { useToast } from '../../ui/toast';
import { useExpandedTasks } from './expandedStore';

/** «2/5» и стрелка: нажатие раскрывает или сворачивает пункты. */
export function SubtaskBadge({ task, items }: { task: Task; items: readonly Subtask[] }) {
  const p = usePalette();
  const t = useT();
  const open = useExpandedTasks((s) => !!s.open[task.id]);
  const toggle = useExpandedTasks((s) => s.toggle);
  const { done, total } = subtaskProgress(items);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${t(open ? 'sub.collapse' : 'sub.expand', { title: task.title })}. ${t('sub.progress', { done, total })}`}
      onPress={() => toggle(task.id)}
      hitSlop={6}
      style={({ pressed }) => [styles.badge, pressed && { backgroundColor: p.tag }]}
    >
      <Text style={[TYPE.badge, { color: p.text }]}>{`${done}/${total}`}</Text>
      <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
        <Icon name="chevron" size={16} tone="muted" />
      </View>
    </Pressable>
  );
}

type ListProps = {
  task: Task;
  items: readonly Subtask[];
  /** цвет отметки (сфера дела) — в «Обычном» */
  tint?: string;
  /** «+ пункт»: открыть правку дела */
  onEdit: () => void;
};

/** Раскрытый список; ничего не рисует, пока дело свёрнуто. */
export function SubtaskList({ task, items, tint, onEdit }: ListProps) {
  const p = usePalette();
  const t = useT();
  const plain = usePlain();
  const toast = useToast((s) => s.show);
  const open = useExpandedTasks((s) => !!s.open[task.id]);
  if (!open) return null;

  const tick = (item: Subtask) => {
    const res = A.toggleSubtask(item.id);
    if (!res) return;
    vibrateImpact();
    if (res.closed) {
      toast(t('toast.marked', { title: task.title }), {
        label: t('common.undo'),
        onPress: res.undo,
      });
    }
  };

  return (
    <View style={[styles.list, { borderTopColor: p.divider }]}>
      {items.map((item) => {
        const done = item.doneOn !== null;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={t(done ? 'a11y.uncheck' : 'a11y.check', { title: item.title })}
            onPress={() => tick(item)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: p.tag }]}
          >
            <View style={styles.mark}>
              {plain ? (
                <PlainMark shape="circle" fill={done ? 1 : 0} size={20} tint={tint} />
              ) : (
                <Moon phase={done ? 1 : 0} size={24} />
              )}
            </View>
            <Text
              style={[
                TYPE.body,
                styles.title,
                {
                  color: done ? p.muted : p.text,
                  textDecorationLine: done ? 'line-through' : 'none',
                },
              ]}
            >
              {item.title}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('sub.addRow')}
        onPress={onEdit}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: p.tag }]}
      >
        <View style={styles.mark}>
          <Icon name="plus" size={18} tone="muted" />
        </View>
        <Text style={[TYPE.body, styles.title, { color: p.muted }]}>{t('sub.addRow')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 36,
    paddingHorizontal: SPACE.sm,
    borderRadius: 10,
  },
  list: { borderTopWidth: STROKE.thin, paddingLeft: SIZE.touch + SPACE.sm, paddingRight: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 44 },
  mark: { width: 28, alignItems: 'center' },
  title: { flex: 1 },
});
