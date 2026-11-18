/**
 * «Что было за день» в итоге дня и дневнике: раскрывающийся список дел и привычек дня —
 * что сделано (со временем) и что осталось. Только чтение: в истории видно, что ты делал.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { clockOf } from '../../core/dates';
import type { DayItem, DayView } from '../../core/day';
import type { Snapshot } from '../../core/model';
import { useT } from '../../store/prefsStore';
import { usePalette, usePlain } from '../../store/themeStore';
import { SIZE, SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { Icon } from '../../ui/icons';
import { Moon } from '../../ui/Moon';
import { PlainMark } from '../../ui/PlainMark';
import { Card, Pill } from '../../ui/Sticker';
import { itemTint } from '../itemTint';

type Props = {
  day: DayView;
  data: Pick<Snapshot, 'tasks' | 'habits' | 'areas'>;
  /** раскрыт сразу (дневник прошлого дня) */
  initiallyOpen?: boolean;
};

export function DayLog({ day, data, initiallyOpen = false }: Props) {
  const p = usePalette();
  const t = useT();
  const plain = usePlain();
  const [open, setOpen] = useState(initiallyOpen);
  if (day.total === 0) return null;

  const done = day.log;
  const left = day.left;
  const sub = [
    t('review.logDoneCount', { count: day.done }),
    left.length > 0 ? t('review.logLeftCount', { count: left.length }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const row = (item: DayItem) => {
    const finished = item.state === 'done' || item.state === 'slip';
    const slip = item.state === 'slip';
    const mark = plain ? (
      <PlainMark
        shape={item.kind === 'habit' ? 'square' : 'circle'}
        fill={slip ? 0 : item.state === 'done' ? 1 : item.fraction}
        debt={slip || item.debt}
        tint={itemTint(data, item)}
        size={22}
      />
    ) : (
      <Moon
        phase={slip ? 1 : item.state === 'done' ? 1 : item.fraction}
        tone={slip ? 'red' : 'sun'}
        ring={slip || item.debt ? 'red' : 'ring'}
        size={SIZE.moonRow - 8}
      />
    );
    return (
      <View key={`${item.kind}:${item.id}`} style={styles.row}>
        <View style={styles.mark}>{mark}</View>
        <Text
          numberOfLines={2}
          style={[TYPE.body, styles.title, { color: finished ? p.text : p.muted }]}
        >
          {item.title}
        </Text>
        {slip ? (
          <Pill label={t('mark.slip')} tone="red" />
        ) : (
          item.state === 'done' &&
          item.at !== null && (
            <Text style={[TYPE.meta, { color: p.muted }]}>{clockOf(item.at)}</Text>
          )
        )}
      </View>
    );
  };

  return (
    <Card padded={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${t('review.dayLog')}. ${sub}`}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.head, pressed && { backgroundColor: p.tag }]}
      >
        <View style={styles.headText}>
          <Text style={[TYPE.itemStrong, { color: p.text }]}>{t('review.dayLog')}</Text>
          <Text style={[TYPE.meta, { color: p.muted }]}>{sub}</Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <Icon name="chevron" size={18} tone="muted" />
        </View>
      </Pressable>
      {open && (
        <View style={[styles.body, { borderTopColor: p.divider }]}>
          {done.length > 0 && (
            <>
              <Text style={[TYPE.meta, styles.label, { color: p.muted }]}>{t('today.done')}</Text>
              {done.map(row)}
            </>
          )}
          {left.length > 0 && (
            <>
              <Text style={[TYPE.meta, styles.label, { color: p.muted }]}>
                {t('review.logLeft')}
              </Text>
              {left.map(row)}
            </>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    minHeight: SIZE.row,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
  },
  headText: { flex: 1, gap: 2 },
  body: { borderTopWidth: 1, paddingHorizontal: SPACE.lg, paddingBottom: SPACE.sm },
  label: { marginTop: SPACE.md, marginBottom: SPACE.xs, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    minHeight: 40,
    paddingVertical: 4,
  },
  mark: { width: 28, alignItems: 'center' },
  title: { flex: 1 },
});
