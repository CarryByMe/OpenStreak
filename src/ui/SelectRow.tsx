/**
 * Строка формы с выпадающим списком («Обычный» и «Минималистичный»): по нажатию у строки
 * всплывает меню вариантов — цветной кружок и название, у выбранного галочка. Варианты без
 * цвета («Без приоритета», «Без сферы») — пустое кольцо. Последним пунктом может идти действие
 * («+ Сфера»). Меню закрывается выбором, тапом мимо и системной «назад».
 */
import React, { useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type HostInstance,
} from 'react-native';
import { useT } from '../store/prefsStore';
import { usePalette } from '../store/themeStore';
import { softShadow } from '../theme/sticker';
import { ensureContrast } from '../theme/readable';
import { SPACE } from '../theme/metrics';
import { TYPE } from '../theme/type';
import { FormRow } from './FormRow';
import { Icon, type IconName } from './icons';

export type SelectOption<T> = {
  value: T;
  label: string;
  /** цвет кружка; без него — пустое кольцо */
  dot?: string;
  /** значок вместо кружка (варианты даты) */
  icon?: IconName;
};

type Props<T> = {
  icon?: IconName;
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (v: T) => void;
  /** значение задано (не по умолчанию): в строке рисуется акцентом */
  set?: boolean;
  /** действие последним пунктом меню, например «+ Сфера» */
  action?: { label: string; onPress: () => void };
};

type Rect = { x: number; y: number; w: number; h: number };

const ITEM_H = 48;
const PAD = 8;
const EDGE = 16;
const MENU_W = 260;

export function SelectRow<T>({ icon, label, value, options, onChange, set, action }: Props<T>) {
  const p = usePalette();
  const t = useT();
  const win = useWindowDimensions();
  const anchor = useRef<HostInstance>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  // Цвет сферы бывает любым — доводим до контраста на фоне шторки и на меню.
  const tint = (c: string | undefined) => (c ? ensureContrast(c, [p.bg, p.surface]) : undefined);
  const current = options.find((o) => Object.is(o.value, value));

  const show = () => {
    Keyboard.dismiss();
    anchor.current?.measureInWindow((x, y, w, h) => setRect({ x, y, w, h }));
  };
  const close = () => setRect(null);

  let menuStyle = null;
  if (rect) {
    const width = Math.min(MENU_W, win.width - 2 * EDGE);
    const count = options.length + (action ? 1 : 0);
    const height = Math.min(count * ITEM_H + 2 * PAD, win.height * 0.5);
    const right = rect.x + rect.w;
    const left = Math.min(Math.max(EDGE, right - width), win.width - EDGE - width);
    const below = rect.y + rect.h;
    // Под строкой, а если не помещается — над ней.
    const top = below + height + EDGE <= win.height ? below : Math.max(EDGE, rect.y - height);
    menuStyle = { left, top, width, maxHeight: height };
  }

  return (
    <View ref={anchor} collapsable={false}>
      <FormRow
        icon={icon}
        label={label}
        value={current?.label ?? ''}
        dot={tint(current?.dot)}
        set={set}
        open={rect !== null}
        onPress={show}
      />
      <Modal
        transparent
        visible={rect !== null}
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        {menuStyle && (
          <View
            accessibilityViewIsModal
            style={[
              styles.menu,
              menuStyle,
              { backgroundColor: p.surface, borderColor: p.divider },
              softShadow(p, true),
            ]}
          >
            <ScrollView
              accessibilityRole="radiogroup"
              accessibilityLabel={label}
              contentContainerStyle={styles.list}
            >
              {options.map((o, i) => {
                const sel = Object.is(o.value, value);
                const dot = tint(o.dot);
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: sel }}
                    accessibilityLabel={o.label}
                    onPress={() => {
                      onChange(o.value);
                      close();
                    }}
                    style={({ pressed }) => [styles.item, pressed && { backgroundColor: p.bg }]}
                  >
                    {o.icon ? (
                      <Icon name={o.icon} size={18} tone="muted" />
                    ) : (
                      <View
                        style={[
                          styles.dot,
                          dot
                            ? { backgroundColor: dot }
                            : { borderWidth: 1.5, borderColor: p.muted },
                        ]}
                      />
                    )}
                    <Text numberOfLines={1} style={[TYPE.item, styles.label, { color: p.text }]}>
                      {o.label}
                    </Text>
                    {sel && <Icon name="check" size={18} tone="text" />}
                  </Pressable>
                );
              })}
              {action && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={() => {
                    close();
                    action.onPress();
                  }}
                  style={({ pressed }) => [styles.item, pressed && { backgroundColor: p.bg }]}
                >
                  <Icon name="plus" size={16} tone="muted" />
                  <Text numberOfLines={1} style={[TYPE.item, styles.label, { color: p.text }]}>
                    {action.label}
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: { position: 'absolute', borderRadius: 20, borderWidth: 1 },
  list: { paddingVertical: PAD },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    height: ITEM_H,
    marginHorizontal: 6,
    paddingHorizontal: SPACE.lg - 6,
    borderRadius: 12,
  },
  dot: { width: 16, height: 16, borderRadius: 8 },
  label: { flex: 1 },
});
