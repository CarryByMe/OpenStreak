/**
 * Виджет «Сегодня» для iOS (`expo-widgets`, SwiftUI): средний и большой, «Обычный» (и
 * «Минималистичный») и «Мульт». Макет — «Сегодня — L и M».
 *
 * Функция с директивой `'widget'` превращается в строку и исполняется в процессе виджета, поэтому
 * она самодостаточна: ни импортов модулей приложения, ни замыканий — всё приходит в `props`
 * (готовые тексты и цвета из `widgets/view.ts`). Компоненты и модификаторы внутри — глобальные
 * имена среды виджета; импорты ниже нужны только типам.
 *
 * Отличия от Android: системный шрифт (шрифты в расширение не кладём), «луна» «Мульта» — круг с
 * заливкой снизу вместо серпа (в SwiftUI нет произвольных контуров).
 */
import {
  Circle,
  Gauge,
  HStack,
  Link,
  Rectangle,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  background,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  lineLimit,
  padding,
  shapes,
  strokeBorder,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { Scheme } from '../../theme/palette';
import type { TodayWidgetView } from '../view';

export type TodayWidgetProps = Record<Scheme, TodayWidgetView>;

const TodayWidget = (props: TodayWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const v = env.colorScheme === 'dark' ? props.dark : props.light;
  const c = v.colors;
  const mult = v.look === 'mult';
  const large = env.widgetFamily === 'systemLarge';
  const num = { weight: 'bold' as const, design: 'rounded' as const };

  const label = (text: string, size: number, color: string, weight: 'medium' | 'bold' = 'bold') => (
    <Text modifiers={[font({ size, weight }), foregroundStyle(color), lineLimit(1)]}>{text}</Text>
  );

  /** Отметка строки: рамка цвета сферы; у начатой — заливка снизу; в «Мульте» — «луна». */
  const mark = (row: TodayWidgetView['rows'][number]) => {
    const size = 22;
    const tone = row.debt ? c.red : row.color;
    const square = !mult && row.kind === 'habit';
    const f = Math.max(0, Math.min(1, row.fraction));
    const shape = (extra: ModifierConfig[]) =>
      square ? (
        <RoundedRectangle cornerRadius={6} modifiers={extra} />
      ) : (
        <Circle modifiers={extra} />
      );
    return (
      <ZStack modifiers={[frame({ width: size, height: size })]}>
        {mult
          ? shape([foregroundStyle(c.track), frame({ width: size, height: size })])
          : null}
        {f > 0 ? (
          <VStack spacing={0} modifiers={[frame({ width: size, height: size })]}>
            <Spacer />
            <Rectangle
              modifiers={[
                foregroundStyle(mult ? c.accent : tone),
                frame({ width: size, height: Math.max(3, size * f) }),
              ]}
            />
          </VStack>
        ) : null}
        {shape([
          strokeBorder({
            content: mult && !row.debt ? c.ring : tone,
            style: { lineWidth: mult ? 2.5 : 2 },
            shape: square ? 'roundedRectangle' : 'circle',
            cornerRadius: square ? 6 : undefined,
          }),
          frame({ width: size, height: size }),
        ])}
      </ZStack>
    );
  };

  const meta = (row: TodayWidgetView['rows'][number]) =>
    row.meta === '' ? null : row.debt ? (
      <Text
        modifiers={[
          font({ size: 10, weight: 'bold' }),
          foregroundStyle(c.onRed),
          padding({ horizontal: 7, vertical: 2 }),
          background(c.red, shapes.roundedRectangle({ cornerRadius: 8 })),
        ]}
      >
        {row.meta}
      </Text>
    ) : (
      label(row.meta, 12, c.text)
    );

  const rows = (count: number) =>
    v.rows.slice(0, count).map((row) => (
      <HStack key={`${row.kind}:${row.id}`} spacing={10} modifiers={[padding({ vertical: 6 })]}>
        {mark(row)}
        <Text
          modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(c.text), lineLimit(1)]}
        >
          {row.title}
        </Text>
        <Spacer />
        {meta(row)}
      </HStack>
    ));

  /** Круг дня: дуга («Обычный») или луна («Мульт»). */
  const dial = (size: number) =>
    mult ? (
      <ZStack modifiers={[frame({ width: size, height: size })]}>
        <Circle modifiers={[foregroundStyle(c.track), frame({ width: size, height: size })]} />
        <VStack spacing={0} modifiers={[frame({ width: size, height: size })]}>
          <Spacer />
          <Rectangle
            modifiers={[foregroundStyle(c.accent), frame({ width: size, height: size * v.phase })]}
          />
        </VStack>
        <Circle
          modifiers={[
            strokeBorder({ content: c.ring, style: { lineWidth: 2.5 }, shape: 'circle' }),
            frame({ width: size, height: size }),
          ]}
        />
      </ZStack>
    ) : (
      <Gauge
        value={v.phase}
        modifiers={[
          gaugeStyle('circularCapacity'),
          tint(v.total > 0 && v.done === v.total ? c.ok : c.accent),
          frame({ width: size, height: size }),
        ]}
      />
    );

  const score = (size: number) => (
    <HStack spacing={0}>
      <Text modifiers={[font({ size, ...num }), foregroundStyle(c.text)]}>{String(v.done)}</Text>
      <Text modifiers={[font({ size, weight: 'medium' }), foregroundStyle(c.muted)]}>
        {` / ${v.total}`}
      </Text>
    </HStack>
  );

  const closeButton = (
    <Link destination={v.links.review}>
      <Text
        modifiers={[
          font({ size: 14, weight: 'bold' }),
          foregroundStyle(c.onAccent),
          frame({ maxWidth: 10000, minHeight: 38, alignment: 'center' }),
          background(c.accent, shapes.roundedRectangle({ cornerRadius: mult ? 12 : 10 })),
        ]}
      >
        {v.closeLabel}
      </Text>
    </Link>
  );

  const message = (
    <VStack alignment="leading" spacing={8}>
      <Text
        modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(c.text), lineLimit(3)]}
      >
        {v.message}
      </Text>
      {v.state === 'ready' ? closeButton : <Spacer />}
    </VStack>
  );

  const plus = (
    <Link destination={v.links.add}>
      <ZStack modifiers={[frame({ width: 44, height: 44 })]}>
        <Circle modifiers={[foregroundStyle(c.accent), frame({ width: 44, height: 44 })]} />
        {mult ? (
          <Circle
            modifiers={[
              strokeBorder({ content: c.line, style: { lineWidth: 2.5 }, shape: 'circle' }),
              frame({ width: 44, height: 44 }),
            ]}
          />
        ) : null}
        <Text modifiers={[font({ size: 26, weight: 'bold' }), foregroundStyle(c.onAccent)]}>+</Text>
      </ZStack>
    </Link>
  );

  const finished = v.state === 'ready' || v.state === 'closed';
  const caption = finished ? v.fullCaption : v.state === 'empty' ? '' : v.restLabel;

  const root = [containerBackground(c.surface, 'widget'), widgetURL(v.links.open)];

  if (!large) {
    return (
      <HStack spacing={12} modifiers={root}>
        <VStack spacing={4} modifiers={[frame({ width: 76 })]}>
          {dial(44)}
          {score(16)}
          {caption === '' ? null : label(caption, 10.5, finished && !mult ? c.ok : c.muted, 'medium')}
        </VStack>
        <VStack alignment="leading" spacing={0}>
          {v.rows.length > 0 ? rows(3) : message}
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={6} modifiers={root}>
      <HStack spacing={10}>
        <VStack alignment="leading" spacing={2}>
          {label(v.date, 15, c.text)}
          {label(v.sub, 11, c.muted, 'medium')}
        </VStack>
        <Spacer />
        {score(18)}
        {dial(30)}
      </HStack>
      <VStack alignment="leading" spacing={0}>
        {v.rows.length > 0 ? rows(6) : message}
      </VStack>
      <Spacer />
      <HStack>
        {v.doneLabel ? label(v.doneLabel, 12, c.ok) : null}
        <Spacer />
        {plus}
      </HStack>
    </VStack>
  );
};

export default createWidget<TodayWidgetProps>('Today', TodayWidget);
