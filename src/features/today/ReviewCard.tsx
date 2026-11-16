/**
 * Карточка «Итоги дня» вверху «Сегодня» (как «Вечерний обзор» в монолите): оценка дня или
 * подсказка, кнопка «Заполнить / Изменить» ведёт к итогам дня, сама карточка — к истории.
 * Кнопка — соседка ссылки, а не вложена в неё: на web <button> внутри <button> недопустим.
 * Для «Обычного» и «Минималистичного»; в «АУФ» остаётся ссылка внизу экрана.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { live } from '../../core/model';
import { useDataStore } from '../../core/store';
import type { MessageKey } from '../../i18n';
import { useT } from '../../store/prefsStore';
import { usePalette } from '../../store/themeStore';
import { RADIUS, SPACE } from '../../theme/metrics';
import { TYPE } from '../../theme/type';
import { Icon } from '../../ui/icons';
import { Card } from '../../ui/Sticker';
import { MoodMark } from '../stats/MoodCalendar';

type Props = { onOpenReview: () => void; onOpenHistory: () => void };

export function ReviewCard({ onOpenReview, onOpenHistory }: Props) {
  const p = usePalette();
  const t = useT();
  const today = useDataStore((s) => s.today);
  const reviews = useDataStore((s) => s.data.reviews);
  const review = live(reviews).find((r) => r.date === today);
  const mood = review ? t(`review.mood.${review.mood}` as MessageKey) : null;
  const sub = review ? review.note || mood : t('review.card.hint');

  return (
    <Card padded={false}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('review.link')}. ${t('review.history')}`}
          onPress={onOpenHistory}
          style={styles.main}
        >
          <View style={styles.mark}>
            {review ? (
              <MoodMark mood={review.mood} size={40} />
            ) : (
              <View style={[styles.empty, { backgroundColor: p.tag }]}>
                <Icon name="history" size={22} tone="muted" />
              </View>
            )}
          </View>
          <View style={styles.text}>
            <Text style={[TYPE.itemStrong, { color: p.text }]}>{t('review.link')}</Text>
            <Text numberOfLines={1} style={[TYPE.meta, { color: p.muted }]}>
              {sub}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenReview}
          style={[styles.button, { backgroundColor: p.sun }]}
        >
          <Text style={[TYPE.control, { color: p.onSun }]}>
            {t(review ? 'review.card.edit' : 'review.card.fill')}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.md },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  mark: { width: 44, alignItems: 'center' },
  empty: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0, gap: 2 },
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
