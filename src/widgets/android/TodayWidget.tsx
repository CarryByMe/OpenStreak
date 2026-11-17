'use no memo';
/**
 * Виджет «Сегодня» для Android (`react-native-android-widget`): средний (`TodayMedium`) и большой
 * (`TodayLarge`), два вида — мягкая карточка («Обычный» и «Минималистичный») и наклейка «Мульта».
 * Макет — «Сегодня — L и M». Это не обычные компоненты React Native: дерево превращается в
 * RemoteViews, поэтому только `FlexWidget`, `OverlapWidget`, `TextWidget` и `SvgWidget`, без хуков.
 */
import React from 'react';
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { checkSvg, doneRingSvg, markSvg, moonSvg, plusSvg, ringSvg } from '../svg';
import type { TodayWidgetView, WidgetRowView } from '../view';

export type WidgetSize = 'medium' | 'large';

type Hex = `#${string}`;
const hex = (c: string) => c as Hex;

/** Высота строки списка, dp. */
const ROW_H = { soft: 36, mult: 38 } as const;
/** Размеры по умолчанию, пока система не сообщила (dp). */
export const DEFAULT_SIZE = { medium: { width: 250, height: 110 }, large: { width: 250, height: 250 } };

/** Сколько строк помещается: в среднем — до трёх, в большом — по высоте. */
export function visibleRows(size: WidgetSize, look: 'soft' | 'mult', height: number): number {
  const rowH = ROW_H[look];
  if (size === 'medium') return Math.max(1, Math.min(3, Math.floor((height - 24) / (rowH - 4))));
  // шапка ~48, подвал ~56, поля 28
  return Math.max(1, Math.min(6, Math.floor((height - 48 - 56 - 28) / rowH)));
}

type TextProps = {
  text: string;
  color: string;
  font: string;
  size: number;
  align?: 'left' | 'center' | 'right';
  lines?: number;
};

function Label({ text, color, font, size, align, lines = 1 }: TextProps) {
  return (
    <TextWidget
      text={text}
      maxLines={lines}
      truncate="END"
      style={{ color: hex(color), fontFamily: font, fontSize: size, textAlign: align }}
    />
  );
}

/** Подпись справа: «долг» плашкой, остальное — текстом. */
function Meta({ row, v }: { row: WidgetRowView; v: TodayWidgetView }) {
  const c = v.colors;
  if (row.debt) {
    return (
      <FlexWidget
        style={{
          backgroundColor: hex(c.red),
          borderRadius: 8,
          paddingHorizontal: 7,
          paddingVertical: 2,
          ...(v.look === 'mult' ? { borderWidth: 1.5, borderColor: hex(c.line) } : {}),
        }}
      >
        <Label text={row.meta} color={c.onRed} font={v.fonts.strong} size={10} />
      </FlexWidget>
    );
  }
  return <Label text={row.meta} color={c.text} font={v.fonts.strong} size={12} />;
}

function Mark({ row, v }: { row: WidgetRowView; v: TodayWidgetView }) {
  const c = v.colors;
  if (v.look === 'mult') {
    return (
      <SvgWidget
        svg={moonSvg(24, row.debt ? 0 : row.fraction, c, { ring: row.debt ? c.red : c.ring })}
        style={{ width: 24, height: 24 }}
      />
    );
  }
  return (
    <SvgWidget
      svg={markSvg(22, row.kind === 'habit' ? 'square' : 'circle', row.fraction, row.color, c, row.debt)}
      style={{ width: 22, height: 22 }}
    />
  );
}

function Row({ row, v, rowH }: { row: WidgetRowView; v: TodayWidgetView; rowH: number }) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        width: 'match_parent',
        height: rowH,
      }}
    >
      <FlexWidget style={{ marginRight: 10 }}>
        <Mark row={row} v={v} />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, height: 'wrap_content' }}>
        <Label text={row.title} color={v.colors.text} font={v.fonts.strong} size={13.5} />
      </FlexWidget>
      {row.meta ? (
        <FlexWidget style={{ marginLeft: 8 }}>
          <Meta row={row} v={v} />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

function Rows({
  v,
  count,
  rowH,
}: {
  v: TodayWidgetView;
  count: number;
  rowH: number;
}) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'column',
        width: 'match_parent',
        flexGap: 1,
        flexGapColor: hex(v.colors.divider),
      }}
    >
      {v.rows.slice(0, count).map((row) => (
        <Row key={`${row.kind}:${row.id}`} row={row} v={v} rowH={rowH} />
      ))}
    </FlexWidget>
  );
}

/** Счёт «5 / 8» крупными цифрами. */
function Score({ v, size }: { v: TodayWidgetView; size: number }) {
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Label text={String(v.done)} color={v.colors.text} font={v.fonts.num} size={size} />
      <Label text={` / ${v.total}`} color={v.colors.muted} font={v.fonts.text} size={size} />
    </FlexWidget>
  );
}

/** Круг дня: дуга («Обычный») или луна («Мульт»). */
function DayDial({ v, size }: { v: TodayWidgetView; size: number }) {
  const c = v.colors;
  const full = v.total > 0 && v.done === v.total;
  if (v.look === 'mult') {
    return <SvgWidget svg={moonSvg(size, v.phase, c)} style={{ width: size, height: size }} />;
  }
  return (
    <SvgWidget
      svg={full ? doneRingSvg(size, c) : ringSvg(size, v.phase, c)}
      style={{ width: size, height: size }}
    />
  );
}

/** Шапка «Мульта»: дата плашкой с наклоном. */
function DateHeading({ v }: { v: TodayWidgetView }) {
  const c = v.colors;
  if (v.look === 'soft') {
    return (
      <FlexWidget style={{ flexDirection: 'column' }}>
        <Label text={v.date} color={c.text} font={v.fonts.strong} size={15} />
        <Label text={v.sub} color={c.muted} font={v.fonts.text} size={11} />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget style={{ flexDirection: 'column' }}>
      <FlexWidget
        style={{
          backgroundColor: hex(c.tag),
          borderWidth: 2,
          borderColor: hex(c.line),
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 3,
          rotation: -2,
        }}
      >
        <Label text={v.date} color={c.text} font={v.fonts.num} size={11} />
      </FlexWidget>
      <FlexWidget style={{ marginTop: 4, marginLeft: 2 }}>
        <Label text={v.sub} color={c.muted} font={v.fonts.text} size={10.5} />
      </FlexWidget>
    </FlexWidget>
  );
}

/** «✓ Сделано · 5»: зелёная подпись («Обычный») или бирюзовая наклейка («Мульт»). */
function DoneBadge({ v, label }: { v: TodayWidgetView; label: string }) {
  const c = v.colors;
  if (v.look === 'soft') {
    return (
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SvgWidget svg={checkSvg(14, c.ok)} style={{ width: 14, height: 14 }} />
        <FlexWidget style={{ marginLeft: 5 }}>
          <Label text={label} color={c.ok} font={v.fonts.strong} size={12} />
        </FlexWidget>
      </FlexWidget>
    );
  }
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: hex(c.ok),
        borderWidth: 2,
        borderColor: hex(c.line),
        borderRadius: 10,
        paddingHorizontal: 9,
        paddingVertical: 4,
      }}
    >
      <SvgWidget svg={checkSvg(13, c.onOk)} style={{ width: 13, height: 13 }} />
      <FlexWidget style={{ marginLeft: 5 }}>
        <Label text={label} color={c.onOk} font={v.fonts.num} size={11} />
      </FlexWidget>
    </FlexWidget>
  );
}

function PlusButton({ v, size }: { v: TodayWidgetView; size: number }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: v.links.add }}
      accessibilityLabel={v.addLabel}
    >
      <SvgWidget svg={plusSvg(size, v.look, v.colors)} style={{ width: size, height: size }} />
    </FlexWidget>
  );
}

/** Кнопка «Закрыть день»: акцентная («Обычный») или жёлтая наклейка с обводкой («Мульт»). */
function CloseButton({ v }: { v: TodayWidgetView }) {
  const c = v.colors;
  const mult = v.look === 'mult';
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: v.links.review }}
      accessibilityLabel={v.closeLabel}
      style={{
        width: 'match_parent',
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hex(c.accent),
        borderRadius: mult ? 12 : 10,
        ...(mult ? { borderWidth: 2.5, borderColor: hex(c.line) } : {}),
      }}
    >
      <Label
        text={v.closeLabel}
        color={c.onAccent}
        font={mult ? v.fonts.num : v.fonts.strong}
        size={mult ? 12 : 13.5}
        align="center"
      />
    </FlexWidget>
  );
}

/** Сообщение вместо списка: «День собран…», «День закрыт…», «Пусто…». */
function Message({ v, size = 14 }: { v: TodayWidgetView; size?: number }) {
  return (
    <Label
      text={v.message}
      color={v.colors.text}
      font={v.fonts.strong}
      size={size}
      lines={3}
    />
  );
}

/** Карточка: фон, поля и (в «Мульте») обводка с жёсткой тенью. */
function Card({ v, children }: { v: TodayWidgetView; children: React.ReactNode }) {
  const c = v.colors;
  if (v.look === 'soft') {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        accessibilityLabel={v.openLabel}
        style={{
          width: 'match_parent',
          height: 'match_parent',
          backgroundColor: hex(c.surface),
          borderRadius: 24,
          padding: 14,
        }}
      >
        {children}
      </FlexWidget>
    );
  }
  const SHADOW = 5;
  return (
    <OverlapWidget style={{ width: 'match_parent', height: 'match_parent' }}>
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          marginLeft: SHADOW,
          marginTop: SHADOW,
          backgroundColor: hex(c.shadow),
          borderRadius: 24,
        }}
      />
      <FlexWidget
        clickAction="OPEN_APP"
        accessibilityLabel={v.openLabel}
        style={{
          width: 'match_parent',
          height: 'match_parent',
          marginRight: SHADOW,
          marginBottom: SHADOW,
          backgroundColor: hex(c.surface),
          borderWidth: 2.5,
          borderColor: hex(c.line),
          borderRadius: 24,
          padding: 12,
        }}
      >
        {children}
      </FlexWidget>
    </OverlapWidget>
  );
}

function Large({ v, height }: { v: TodayWidgetView; height: number }) {
  const rowH = ROW_H[v.look];
  const count = visibleRows('large', v.look, height);
  return (
    <Card v={v}>
      <FlexWidget
        style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: 48 }}
      >
        <FlexWidget style={{ flex: 1, height: 'wrap_content' }}>
          <DateHeading v={v} />
        </FlexWidget>
        <Score v={v} size={18} />
        <FlexWidget style={{ marginLeft: 10 }}>
          <DayDial v={v} size={v.look === 'mult' ? 30 : 28} />
        </FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ flex: 1, width: 'match_parent', paddingTop: 6 }}>
        {v.rows.length > 0 ? (
          <Rows v={v} count={count} rowH={rowH} />
        ) : (
          <FlexWidget style={{ width: 'match_parent' }}>
            <Message v={v} />
            {v.state === 'ready' && (
              <FlexWidget style={{ marginTop: 10, width: 'match_parent' }}>
                <CloseButton v={v} />
              </FlexWidget>
            )}
          </FlexWidget>
        )}
      </FlexWidget>
      <FlexWidget
        style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: 48 }}
      >
        <FlexWidget style={{ flex: 1, height: 'wrap_content' }}>
          {v.doneLabel ? <DoneBadge v={v} label={v.doneLabel} /> : null}
        </FlexWidget>
        <PlusButton v={v} size={44} />
      </FlexWidget>
    </Card>
  );
}

function Medium({ v, height }: { v: TodayWidgetView; height: number }) {
  const rowH = ROW_H[v.look] - 4;
  const count = visibleRows('medium', v.look, height);
  const finished = v.state === 'ready' || v.state === 'closed';
  const caption = finished ? v.fullCaption : v.state === 'empty' ? '' : v.restLabel;
  return (
    <Card v={v}>
      <FlexWidget
        style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: 'match_parent' }}
      >
        <FlexWidget
          style={{ width: 76, alignItems: 'center', justifyContent: 'center', height: 'match_parent' }}
        >
          <DayDial v={v} size={44} />
          <FlexWidget style={{ marginTop: 4 }}>
            <Score v={v} size={16} />
          </FlexWidget>
          {caption !== '' && (
            <Label
              text={caption}
              color={finished && v.look === 'soft' ? v.colors.ok : v.colors.muted}
              font={v.fonts.text}
              size={10.5}
              align="center"
            />
          )}
        </FlexWidget>
        <FlexWidget
          style={{
            flex: 1,
            height: 'match_parent',
            justifyContent: 'center',
            marginLeft: 10,
          }}
        >
          {v.rows.length > 0 ? (
            <Rows v={v} count={count} rowH={rowH} />
          ) : (
            <FlexWidget style={{ width: 'match_parent' }}>
              <Message v={v} size={13.5} />
              {v.state === 'ready' && (
                <FlexWidget style={{ marginTop: 8, width: 'match_parent' }}>
                  <CloseButton v={v} />
                </FlexWidget>
              )}
            </FlexWidget>
          )}
        </FlexWidget>
      </FlexWidget>
    </Card>
  );
}

type Props = {
  view: TodayWidgetView;
  size: WidgetSize;
  /** размеры виджета на экране, dp */
  width?: number;
  height?: number;
};

export function TodayWidget({ view, size, height }: Props) {
  const h = height && height > 0 ? height : DEFAULT_SIZE[size].height;
  return size === 'large' ? <Large v={view} height={h} /> : <Medium v={view} height={h} />;
}
