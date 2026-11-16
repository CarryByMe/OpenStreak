/**
 * «Итоги» в «Обычном» (монолит): четыре карточки 2×2 — плитка со значком, крупное число, подпись.
 * Плитка — бледный сплошной оттенок цвета значка (без opacity); значок на ней — не ниже 3:1.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../store/themeStore';
import { SPACE } from '../../theme/metrics';
import { ensureContrast, mixWith } from '../../theme/readable';
import { TYPE } from '../../theme/type';
import { Icon, type UiIconName } from '../../ui/icons';
import { Card } from '../../ui/Sticker';

export type StatCard = {
  icon: UiIconName;
  /** цвет значка из палитры */
  color: string;
  value: number;
  label: string;
  /** вторая строка подписи: «сейчас», «лучшая серия» */
  note?: string;
};

export function StatCards({ cards }: { cards: StatCard[] }) {
  return (
    <View style={styles.grid}>
      {cards.map((c) => (
        <StatTile key={c.label + (c.note ?? '')} card={c} />
      ))}
    </View>
  );
}

function StatTile({ card }: { card: StatCard }) {
  const p = usePalette();
  const tile = mixWith(card.color, p.surface, 0.84);
  const icon = ensureContrast(card.color, [tile], 3);
  return (
    <Card padded={false} radius={18} style={styles.cell}>
      <View
        style={styles.inner}
        accessible
        accessibilityLabel={[card.value, card.label, card.note].filter(Boolean).join(' ')}
      >
        <View style={[styles.tile, { backgroundColor: tile }]}>
          <Icon name={card.icon} size={17} color={icon} />
        </View>
        <Text style={[TYPE.numberL, { color: p.text }]}>{card.value}</Text>
        <Text style={[TYPE.caption, { color: p.muted }]}>{card.label}</Text>
        {!!card.note && <Text style={[TYPE.caption, { color: p.muted }]}>{card.note}</Text>}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { flexBasis: '47%', flexGrow: 1 },
  inner: { padding: 15, gap: 2 },
  tile: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.sm,
  },
});
