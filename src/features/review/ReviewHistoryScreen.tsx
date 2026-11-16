/**
 * История итогов дня (как в монолите): оценки и заметки прошлых дней, новые сверху.
 * Нажатие на день открывает дневник этого дня.
 */
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { live, type ISODate } from '../../core/model';
import { useDataStore } from '../../core/store';
import type { MessageKey } from '../../i18n';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { ScreenHeader } from '../../ui/ScreenHeader';
import { Card } from '../../ui/Sticker';
import { fullDate } from '../format';
import { MoodMark } from '../stats/MoodCalendar';

type Props = { onBack: () => void; onOpen: (date: ISODate) => void };

export function ReviewHistoryScreen({ onBack, onOpen }: Props) {
  const p = usePalette();
  const t = useT();
  const insets = useSafeAreaInsets();
  const data = useDataStore((s) => s.data);
  const reviews = useMemo(
    () => live(data.reviews).sort((a, b) => b.date.localeCompare(a.date)),
    [data.reviews]
  );

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACE.sm }]}
    >
      <ScreenHeader onBack={onBack} kicker={t('history.kicker')} title={t('history.title')} />
      {reviews.length === 0 ? (
        <Text style={[TYPE.body, { color: p.muted }]}>{t('history.empty')}</Text>
      ) : (
        reviews.map((r) => {
          const mood = t(`review.mood.${r.mood}` as MessageKey);
          const day = fullDate(t, r.date);
          return (
            <Card key={r.id} style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${day}: ${mood}. ${t('review.dayOpen', { date: day })}`}
                onPress={() => onOpen(r.date)}
                style={styles.row}
              >
                <MoodMark mood={r.mood} size={40} />
                <View style={styles.text}>
                  <Text style={[TYPE.itemStrong, { color: p.text }]}>{day}</Text>
                  <Text style={[TYPE.meta, { color: p.muted }]}>{mood}</Text>
                  {!!r.note && (
                    <Text numberOfLines={3} style={[TYPE.body, { color: p.text }]}>
                      {r.note}
                    </Text>
                  )}
                </View>
              </Pressable>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: SPACE.screenX, paddingBottom: SPACE.xl, gap: SPACE.md },
  card: { paddingVertical: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  text: { flex: 1, gap: SPACE.xs },
});
