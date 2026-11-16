/**
 * «Привычки» (design/mult/M-Habits): сколько в деле и вредных, фильтр, наклейки привычек —
 * плитка-иконка, название, норма, бейдж серии, неделя лунами; заметка, если вчера слил.
 * Тап по наклейке — карточка привычки.
 */
import { habitColor } from '../../core/colors';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as A from '../../core/actions';
import { addDays } from '../../core/dates';
import {
  activeHabits,
  dataOf,
  fullValue,
  habitDay,
  habitDays,
  habitStats,
  indexHabits,
  liveCheck,
} from '../../core/habits';
import { live, type Habit, type Snapshot } from '../../core/model';
import { settingsOf } from '../../core/settings';
import { useDataStore } from '../../core/store';
import { useT } from '../../store/prefsStore';
import { usePalette, usePlain, useSoft } from '../../store/themeStore';
import { SHADOW, SPACE, TILT } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { AddRow, IconButton } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { HabitGlyph, IconTile } from '../../ui/icons';
import { ScreenHeader } from '../../ui/ScreenHeader';
import { Segmented } from '../../ui/Segmented';
import { PlainMark } from '../../ui/PlainMark';
import { Badge, Card, Tag } from '../../ui/Sticker';
import { WeekMoons } from '../../ui/WeekMoons';
import { useNewSheet } from '../new/newSheetStore';
import { habitMeta, moonDays, streakLabel } from './habitText';
import { designStyles } from '../../theme/design';

type Filter = 'all' | 'good' | 'bad';

/** Вредная привычка: сегодня срыв отмечен. */
function slippedToday(data: Snapshot, habitId: string, today: string): boolean {
  return !!liveCheck(data, habitId, today);
}

/**
 * Отметка за сегодня. Полезная: сделано — норма выполнена, иначе доля нормы. Вредная: отметка —
 * это срыв; нет срыва — круг пустой, нажатие отмечает срыв, повторное — снимает.
 */
function todayMark(h: Habit, slipped: boolean, value: number, full: number) {
  const bad = h.kind === 'bad';
  const on = bad ? slipped : value >= full;
  return { bad, on, fill: on ? 1 : bad ? 0 : Math.min(1, value / full) };
}

/** Наклон бейджей серий по очереди — как наклейки, налепленные от руки. */
const BADGE_TILT = [8, -6, 5, -4];

export function HabitsScreen({ onOpen }: { onOpen: (habitId: string) => void }) {
  const p = usePalette();
  const t = useT();
  const insets = useSafeAreaInsets();
  const data = useDataStore((s) => s.data);
  const today = useDataStore((s) => s.today);
  const show = useNewSheet((s) => s.show);
  const plain = usePlain();
  const soft = useSoft();
  const [filter, setFilter] = useState<Filter>('all');
  const [area, setArea] = useState<string | null>(null);
  const { weekStart } = settingsOf(data);

  const all = useMemo(() => {
    const idx = indexHabits(data);
    const yesterday = addDays(today, -1);
    return activeHabits(data).map((h) => {
      const hd = dataOf(idx, h.id);
      return {
        habit: h,
        stats: habitStats(h, hd, today),
        week: moonDays(habitDays(h, hd, addDays(today, -6), today, today), h, today),
        value: liveCheck(data, h.id, today)?.value ?? 0,
        slippedYesterday: h.kind === 'good' && habitDay(h, hd, yesterday, today).mark === 'slip',
      };
    });
  }, [data, today]);

  const badCount = all.filter((x) => x.habit.kind === 'bad').length;
  const areas = useMemo(
    () => live(data.areas).sort((a, b) => a.createdAt - b.createdAt),
    [data.areas]
  );
  // Выбранную сферу могли удалить — тогда фильтр снова «все».
  const areaId = area !== null && areas.some((a) => a.id === area) ? area : null;
  const shown = all.filter(
    (x) =>
      (filter === 'all' || x.habit.kind === filter) &&
      (areaId === null || x.habit.areaId === areaId)
  );
  const kicker = [
    t('habits.active', { count: all.length }),
    badCount > 0 ? t('habits.bad', { count: badCount }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACE.md }]}
    >
      <ScreenHeader
        kicker={kicker}
        title={t('tab.habits')}
        right={
          <IconButton
            icon="plus"
            variant="sun"
            label={t('habits.add')}
            onPress={() => show('habit', { areaId })}
          />
        }
      />

      {all.length > 0 && (
        <Segmented<Filter>
          label={t('habits.filter')}
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'all', label: t('habits.all') },
            { value: 'good', label: t('habits.good') },
            { value: 'bad', label: t('habits.badOnes') },
          ]}
        />
      )}

      {all.length > 0 && areas.length > 0 && (
        <View style={styles.chips} accessibilityRole="radiogroup">
          <Chip
            role="radio"
            label={t('tasks.all')}
            selected={areaId === null}
            onPress={() => setArea(null)}
          />
          {areas.map((a) => (
            <Chip
              key={a.id}
              role="radio"
              label={a.name}
              dot={a.color}
              selected={areaId === a.id}
              onPress={() => setArea(areaId === a.id ? null : a.id)}
            />
          ))}
        </View>
      )}

      {all.length === 0 && (
        <View style={styles.empty}>
          <Text style={[TYPE.body, { color: p.muted }]}>{t('habits.empty')}</Text>
          <AddRow label={t('habits.add')} onPress={() => show('habit', { areaId })} />
        </View>
      )}

      {plain && !soft && (
        <View>
          {shown.map(({ habit: h, stats, week, value, slippedYesterday }) => {
            const full = fullValue(h);
            const {
              bad,
              on: done,
              fill,
            } = todayMark(h, slippedToday(data, h.id, today), value, full);
            return (
              <View key={h.id} style={[styles.plainRow, { borderTopColor: p.divider }]}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={
                    bad
                      ? t(done ? 'habit.slipOff' : 'habit.slip')
                      : t(done ? 'a11y.uncheck' : 'a11y.check', { title: h.name })
                  }
                  onPress={() =>
                    bad ? A.toggleCheck(h.id, today) : A.setCheckValue(h.id, today, done ? 0 : full)
                  }
                  style={styles.plainMark}
                >
                  <PlainMark shape="square" fill={fill} debt={bad} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={h.name}
                  onPress={() => onOpen(h.id)}
                  style={styles.plainBody}
                >
                  <View style={styles.plainHead}>
                    <HabitGlyph icon={h.icon} size={26} tone="text" />
                    <View style={styles.titles}>
                      <Text style={[TYPE.item, { color: p.text }]}>{h.name}</Text>
                      <Text style={[TYPE.meta, { color: p.muted }]}>
                        {habitMeta(t, h, value, weekStart)}
                      </Text>
                    </View>
                    <View style={styles.plainStreak}>
                      <Text style={[TYPE.numberL, { color: p.text }]}>{stats.streak}</Text>
                      <Text style={[TYPE.tiny, { color: p.muted }]}>
                        {streakLabel(t, h, stats.streak)}
                      </Text>
                    </View>
                  </View>
                  <WeekMoons days={week} />
                  {slippedYesterday && (
                    <Text style={[TYPE.meta, { color: p.red }]}>{t('habits.slipNote')}</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {soft &&
        shown.map(({ habit: h, stats, week, value, slippedYesterday }) => {
          const full = fullValue(h);
          const {
            bad,
            on: done,
            fill,
          } = todayMark(h, slippedToday(data, h.id, today), value, full);
          return (
            <Card key={h.id} padded style={styles.card}>
              <View style={styles.head}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={h.name}
                  onPress={() => onOpen(h.id)}
                  style={[styles.head, styles.titles]}
                >
                  <IconTile icon={h.icon} size={40} color={habitColor(h, data.areas)} />
                  <View style={styles.titles}>
                    <Text style={[TYPE.itemStrong, { color: p.text }]}>{h.name}</Text>
                    <Text style={[TYPE.meta, { color: p.muted }]}>
                      {habitMeta(t, h, value, weekStart)}
                    </Text>
                  </View>
                  <View style={styles.plainStreak}>
                    <Text style={[TYPE.numberL, { color: p.text }]}>{stats.streak}</Text>
                    <Text style={[TYPE.tiny, { color: p.muted }]}>
                      {streakLabel(t, h, stats.streak)}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={
                    bad
                      ? t(done ? 'habit.slipOff' : 'habit.slip')
                      : t(done ? 'a11y.uncheck' : 'a11y.check', { title: h.name })
                  }
                  onPress={() =>
                    bad ? A.toggleCheck(h.id, today) : A.setCheckValue(h.id, today, done ? 0 : full)
                  }
                  style={styles.softMark}
                >
                  <PlainMark
                    habit
                    cross={bad}
                    fill={fill}
                    debt={bad}
                    tint={habitColor(h, data.areas)}
                    label={
                      !bad && h.measure === 'numeric'
                        ? t('row.numeric', { value, target: h.target })
                        : undefined
                    }
                  />
                </Pressable>
              </View>
              <WeekMoons days={week} tint={habitColor(h, data.areas)} />
              {slippedYesterday && (
                <Text style={[TYPE.meta, { color: p.red }]}>{t('habits.slipNote')}</Text>
              )}
            </Card>
          );
        })}

      {!plain &&
        shown.map(({ habit: h, stats, week, value, slippedYesterday }, i) => (
          <Pressable
            key={h.id}
            accessibilityRole="button"
            accessibilityLabel={h.name}
            onPress={() => onOpen(h.id)}
          >
            {({ pressed }) => (
              <Card
                shadow={pressed ? 'none' : 'lg'}
                style={[styles.card, pressed && styles.pressed]}
              >
                <View style={styles.head}>
                  <IconTile icon={h.icon} />
                  <View style={styles.titles}>
                    <Text style={[TYPE.itemStrong, { color: p.text }]}>{h.name}</Text>
                    <Text style={[TYPE.meta, { color: p.muted }]}>
                      {habitMeta(t, h, value, weekStart)}
                    </Text>
                  </View>
                  <Badge
                    value={stats.streak}
                    label={streakLabel(t, h, stats.streak)}
                    tone={stats.streak === 0 ? 'tag' : h.kind === 'bad' ? 'teal' : 'sun'}
                    tilt={BADGE_TILT[i % BADGE_TILT.length]}
                  />
                </View>
                <WeekMoons days={week} />
                {slippedYesterday && (
                  <View style={styles.note}>
                    <Tag
                      label={t('habits.slipNote')}
                      tone="tag"
                      tilt={TILT.slightLeft}
                      header={false}
                      alert
                    />
                  </View>
                )}
              </Card>
            )}
          </Pressable>
        ))}
    </ScrollView>
  );
}

const styles = designStyles(() =>
  StyleSheet.create({
    content: { paddingHorizontal: SPACE.screenX, paddingBottom: SPACE.xl, gap: SPACE.block },
    card: { gap: 14 },
    pressed: { transform: [{ translateX: SHADOW.lg }, { translateY: SHADOW.lg }] },
    head: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    titles: { flex: 1, minWidth: 0 },
    note: { alignItems: 'flex-start' },
    empty: { gap: SPACE.md },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.tight },
    plainRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderTopWidth: 1,
      paddingBottom: 14,
    },
    plainMark: {
      width: 44,
      height: 44,
      marginLeft: -10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plainBody: { flex: 1, gap: 10, paddingTop: 2 },
    plainHead: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
    plainStreak: { alignItems: 'flex-end', paddingTop: 2 },
    softMark: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  })
);
