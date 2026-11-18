/**
 * Строка дела или привычки внутри наклейки-списка: луна-отметка слева, название, подпись,
 * справа — пометка. Выполненное — приглушено и зачёркнуто. Между строками — пунктир.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '../store/prefsStore';
import { usePalette, usePlain, useSoft } from '../store/themeStore';
import { SIZE, SPACE, STROKE } from '../theme/metrics';
import { TYPE } from '../theme/type';
import { Moon } from './Moon';
import { PlainMark } from './PlainMark';
import { Pill } from './Sticker';

type Props = {
  title: string;
  sub?: string;
  /** 0…1: 0 — не сделано, 1 — сделано, между — числовая привычка в процессе */
  phase: number;
  /** «Обычный»: круг для дела, квадрат для привычки */
  shape?: 'circle' | 'square';
  /** красное кольцо — долг, просрочено */
  debt?: boolean;
  /** цвет сферы или привычки: в «Обычном» отметка рисуется им */
  tint?: string;
  /** выполнено: название приглушено и зачёркнуто */
  done?: boolean;
  /** нажатие на луну */
  onToggle?: () => void;
  /** свой текст луны для чтения с экрана (например, «Добавить подходы: …») */
  toggleLabel?: string;
  /** нажатие на строку (открыть) */
  onPress?: () => void;
  /** справа: «долг», важность, «60/100» */
  right?: React.ReactNode;
  /** последняя строка в наклейке — без пунктира снизу */
  last?: boolean;
};

export function MoonRow(props: Props) {
  const p = usePalette();
  const plain = usePlain();
  const soft = useSoft();
  const t = useT();
  const { title, done = false } = props;
  return (
    <View
      style={[
        styles.row,
        plain
          ? soft
            ? { backgroundColor: 'transparent', paddingLeft: SPACE.tight, paddingRight: 14 }
            : { backgroundColor: 'transparent', paddingLeft: 0, paddingRight: 4 }
          : { backgroundColor: p.surface },
        !props.last &&
          (plain
            ? { borderBottomWidth: 1, borderBottomColor: p.divider }
            : {
                borderBottomWidth: STROKE.thin,
                borderBottomColor: p.divider,
                borderStyle: 'dashed',
              }),
      ]}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={props.toggleLabel ?? t(done ? 'a11y.uncheck' : 'a11y.check', { title })}
        onPress={props.onToggle}
        style={styles.moon}
      >
        {({ pressed }) => (
          <View style={pressed && styles.pressed}>
            {plain ? (
              <PlainMark
                shape={props.shape}
                fill={done ? 1 : props.phase}
                debt={props.debt && !done}
                tint={props.tint}
              />
            ) : (
              <Moon
                phase={props.phase}
                size={SIZE.moonRow}
                ring={props.debt && !done ? 'red' : 'ring'}
              />
            )}
          </View>
        )}
      </Pressable>
      <Pressable
        style={styles.body}
        onPress={props.onPress}
        disabled={!props.onPress}
        accessibilityRole={props.onPress ? 'button' : undefined}
      >
        <Text
          style={[
            TYPE.item,
            { color: done ? p.muted : p.text, textDecorationLine: done ? 'line-through' : 'none' },
          ]}
        >
          {title}
        </Text>
        {!!props.sub && <Text style={[TYPE.meta, { color: p.muted }]}>{props.sub}</Text>}
      </Pressable>
      {props.right}
    </View>
  );
}

type LogProps = {
  time: string;
  title: string;
  /** пометка справа: «зачёт», «слив», «держусь» */
  mark?: string;
  /** пометка красным — слив */
  bad?: boolean;
  /** «Вернуть»: убрать из «Сделано» обратно в активные, если отметили случайно */
  onReturn?: () => void;
  /** текст кнопки «Вернуть» для чтения с экрана */
  returnLabel?: string;
};

/** Строка журнала «Сделано»: время, что сделано (зачёркнуто), пометка-пилюля. */
export function LogRow({ time, title, mark, bad, onReturn, returnLabel }: LogProps) {
  const p = usePalette();
  const t = useT();
  return (
    <View style={styles.log}>
      <Text style={[TYPE.meta, styles.time, { color: p.muted }]}>{time}</Text>
      <Text style={[TYPE.body, styles.logTitle, { color: p.muted }]} numberOfLines={1}>
        {title}
      </Text>
      {!!mark && <Pill label={mark} tone={bad ? 'red' : 'teal'} />}
      {onReturn && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={returnLabel}
          onPress={onReturn}
          hitSlop={8}
          style={({ pressed }) => [styles.returnButton, pressed && { backgroundColor: p.tag }]}
        >
          <Text style={[TYPE.meta, styles.returnText, { color: p.text }]}>
            {t('common.return')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: SIZE.row,
    paddingLeft: SPACE.tight,
    paddingRight: 14,
  },
  moon: {
    width: SIZE.touch,
    height: SIZE.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.88 }] },
  body: { flex: 1, minWidth: 0, paddingVertical: SPACE.sm },
  log: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    minHeight: 44,
    paddingHorizontal: SPACE.md,
  },
  time: { width: 48 },
  returnButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: SPACE.sm,
    borderRadius: 8,
  },
  returnText: { textDecorationLine: 'underline' },
  logTitle: { flex: 1, textDecorationLine: 'line-through' },
});
