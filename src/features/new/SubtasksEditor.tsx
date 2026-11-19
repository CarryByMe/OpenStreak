/**
 * Блок «Подзадачи» в форме дела: список подзадач и поле новой подзадачи.
 * Enter добавляет подзадачу и оставляет поле для следующей; вставленный текст с переносами строк
 * делится на подзадачи (маркеры списков убираются). Сохраняет форма (`A.saveSubtasks`).
 */
import React from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { MAX_SUBTASKS, MAX_SUBTASK_TITLE, splitPasted } from '../../core/subtasks';
import { useT } from '../../store/prefsStore';
import { usePalette, usePlain } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { Icon } from '../../ui/icons';
import { Moon } from '../../ui/Moon';
import { PlainMark } from '../../ui/PlainMark';
import { NO_WEB_OUTLINE } from '../../ui/TextField';

/** Пункт в форме: `id` — у сохранённого, null — новый; `key` нужен только списку. */
export type SubtaskRow = { key: string; id: string | null; title: string };

let counter = 0;
export const newRowKey = () => `new-${++counter}`;

type Props = {
  items: SubtaskRow[];
  onChange: (items: SubtaskRow[]) => void;
  /** текст в поле нового пункта — хранит форма, чтобы не потерять его при «Записать» */
  draft: string;
  onDraft: (text: string) => void;
  /**
   * строки по сетке `FormRow` («Обычный» и «Минималистичный»): кружок и «+» в колонке значков,
   * текст — в колонке подписей, крестик — под шевроном; разделитель сверху у каждой строки
   */
  grid?: boolean;
};

/** Добавить пункты из текста (по строкам); сколько поместилось — учитывает предел. */
export function addFromText(items: SubtaskRow[], text: string): SubtaskRow[] {
  const room = Math.max(0, MAX_SUBTASKS - items.length);
  const titles = splitPasted(text).slice(0, room);
  return [...items, ...titles.map((title) => ({ key: newRowKey(), id: null, title }))];
}

export function SubtasksEditor({ items, onChange, draft, onDraft, grid = false }: Props) {
  const p = usePalette();
  const t = useT();
  const plain = usePlain();
  const full = items.length >= MAX_SUBTASKS;

  const rowStyle = grid ? [styles.row, styles.rowGrid] : styles.row;
  const markStyle = grid ? styles.markGrid : styles.mark;

  const commit = (text: string) => {
    onChange(addFromText(items, text));
    onDraft('');
  };

  return (
    <View style={styles.wrap}>
      {items.map((item, i) => (
        <View key={item.key} style={[rowStyle, { borderColor: p.divider }]}>
          <View style={markStyle}>
            {plain ? <PlainMark shape="circle" fill={0} size={20} /> : <Moon phase={0} size={22} />}
          </View>
          <TextInput
            accessibilityLabel={t('sub.edit', { n: i + 1 })}
            value={item.title}
            maxLength={MAX_SUBTASK_TITLE}
            onChangeText={(title) =>
              onChange(items.map((x) => (x.key === item.key ? { ...x, title } : x)))
            }
            style={[
              TYPE.body,
              styles.input,
              { color: p.text },
              Platform.OS === 'web' ? NO_WEB_OUTLINE : null,
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('sub.remove', { title: item.title })}
            onPress={() => onChange(items.filter((x) => x.key !== item.key))}
            hitSlop={8}
            style={[styles.remove, grid && styles.removeGrid]}
          >
            <Icon name="close" size={18} tone="muted" />
          </Pressable>
        </View>
      ))}
      {!full && (
        <View style={[rowStyle, { borderColor: p.divider }]}>
          <View style={markStyle}>
            <Icon name="plus" size={grid ? 22 : 20} tone="muted" />
          </View>
          {/* multiline — чтобы вставка с переносами строк не склеивалась в одну; Enter при этом отправляет */}
          <TextInput
            accessibilityLabel={t('sub.add')}
            placeholder={t(grid ? 'sub.addShort' : 'sub.add')}
            placeholderTextColor={p.muted}
            value={draft}
            multiline
            // на вебе многострочное поле по умолчанию в две строки — текст уезжает вверх от «+»
            numberOfLines={Platform.OS === 'web' ? 1 : undefined}
            submitBehavior="submit"
            onChangeText={(text) => (/[\r\n]/.test(text) ? commit(text) : onDraft(text))}
            onSubmitEditing={() => commit(draft)}
            maxLength={MAX_SUBTASK_TITLE * 20}
            style={[
              TYPE.body,
              styles.input,
              { color: p.text },
              Platform.OS === 'web' ? NO_WEB_OUTLINE : null,
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: 46,
    borderBottomWidth: 1,
  },
  // В сетке формы: как у FormRow — значок 22, промежуток 14, линия сверху (снизу — у самой строки).
  rowGrid: { gap: 14, minHeight: 48, borderBottomWidth: 0, borderTopWidth: 1 },
  mark: { width: 28, alignItems: 'center' },
  markGrid: { width: 22, alignItems: 'center' },
  input: { flex: 1, paddingVertical: SPACE.sm },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  /** крестик по центру под шевроном строки (шеврон 16, кнопка 32) */
  removeGrid: { marginRight: -8 },
});
