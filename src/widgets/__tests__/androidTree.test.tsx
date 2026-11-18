import { describe, expect, test } from '@jest/globals';
import React from 'react';
import { buildWidgetTree } from 'react-native-android-widget/lib/commonjs/api/build-widget-tree';
import {
  SETTINGS_ID,
  emptySnapshot,
  type RecordMeta,
  type Snapshot,
  type Task,
} from '../../core/model';
import { visibleRows, TodayWidget, type WidgetSize } from '../android/TodayWidget';
import { WIDGET_LINKS } from '../links';
import { applyGhost, buildTodayViews, ghostOf, buildTodayView } from '../view';

const TODAY = '2026-11-16';
const meta = (id: string): RecordMeta => ({ id, createdAt: 1, updatedAt: 1, deletedAt: null });
const task = (id: string, over: Partial<Task> = {}): Task => ({
  ...meta(id),
  title: id,
  notes: '',
  date: TODAY,
  priority: 0,
  doneOn: null,
  doneAt: null,
  areaId: null,
  remindAt: '',
  placeId: null,
  placeTrigger: null,
  ...over,
});

function snap(design: 'normal' | 'minimal' | 'auf', tasks: Task[]): Snapshot {
  const s = emptySnapshot('2026-10-01');
  s.settings[SETTINGS_ID] = {
    ...meta(SETTINGS_ID),
    theme: 'system',
    design,
    tone: 'bro',
    quotes: true,
    ranks: true,
    locale: 'ru',
    weekStart: 1,
    reviewAt: '21:30',
  };
  for (const t of tasks) s.tasks[t.id] = t;
  return s;
}

const SIZES: WidgetSize[] = ['medium', 'large'];
const DESIGNS = ['normal', 'minimal', 'auf'] as const;

/** Все тексты и ссылки дерева одной строкой. */
function flat(node: unknown): string {
  return JSON.stringify(node);
}

describe('дерево виджета Android', () => {
  const progress = [
    task('Закрыть долг Сане', { date: '2026-11-10' }),
    task('Записаться в зал', { remindAt: '19:00' }),
    task('Читать 20 минут'),
    task('Сделанное', { doneOn: TODAY, doneAt: 5 }),
  ];
  const ready = [task('Сделанное', { doneOn: TODAY, doneAt: 5 })];

  test.each(DESIGNS.flatMap((d) => SIZES.map((s) => [d, s] as const)))(
    '%s, %s: собирается без ошибок для всех состояний',
    (design, size) => {
      for (const tasks of [progress, ready, []]) {
        for (const scheme of ['light', 'dark'] as const) {
          const view = buildTodayView(snap(design, tasks), TODAY, scheme);
          const tree = buildWidgetTree(<TodayWidget view={view} size={size} height={250} />);
          expect(tree).toBeTruthy();
        }
      }
    }
  );

  test('в процессе: строки и счёт на месте, долг подписан', () => {
    const view = buildTodayView(snap('normal', progress), TODAY, 'light');
    const text = flat(buildWidgetTree(<TodayWidget view={view} size="large" height={260} />));
    expect(text).toContain('Закрыть долг Сане');
    expect(text).toContain('долг');
    expect(text).toContain('19:00');
    expect(text).toContain('Сделано · 1');
    expect(text).toContain(WIDGET_LINKS.add);
    expect(text).not.toContain(WIDGET_LINKS.review);
  });

  test('всё сделано: «Закрыть день» ведёт на итог дня', () => {
    const view = buildTodayView(snap('auf', ready), TODAY, 'light');
    const text = flat(buildWidgetTree(<TodayWidget view={view} size="medium" height={110} />));
    expect(text).toContain('Красава. Закрой день — заберёшь +40 очков.');
    expect(text).toContain('Закрыть день');
    expect(text).toContain(WIDGET_LINKS.review);
  });

  test('день закрыт: кнопки закрытия нет', () => {
    const s = snap('normal', ready);
    s.reviews[TODAY] = { ...meta(TODAY), date: TODAY, mood: 4, note: '' };
    const view = buildTodayView(s, TODAY, 'light');
    expect(
      flat(buildWidgetTree(<TodayWidget view={view} size="medium" height={110} />))
    ).not.toContain(WIDGET_LINKS.review);
  });

  test('«Мульт» рисует жёсткую тень отдельным слоем', () => {
    const mult = flat(
      buildWidgetTree(
        <TodayWidget view={buildTodayView(snap('auf', progress), TODAY, 'light')} size="large" />
      )
    );
    expect(mult).toContain('FrameLayoutWidget');
    const soft = flat(
      buildWidgetTree(
        <TodayWidget view={buildTodayView(snap('normal', progress), TODAY, 'light')} size="large" />
      )
    );
    expect(soft).not.toContain('FrameLayoutWidget');
  });
});

describe('сколько строк помещается', () => {
  test('средний — от одной до трёх', () => {
    expect(visibleRows('medium', 'soft', 60)).toBe(1);
    expect(visibleRows('medium', 'soft', 110)).toBe(2);
    expect(visibleRows('medium', 'soft', 200)).toBe(3);
  });

  test('большой — по высоте, не меньше одной и не больше шести', () => {
    expect(visibleRows('large', 'soft', 100)).toBe(1);
    expect(visibleRows('large', 'soft', 250)).toBe(3);
    expect(visibleRows('large', 'mult', 250)).toBe(3);
    expect(visibleRows('large', 'soft', 700)).toBe(6);
  });
});

describe('кадр «отмечено»', () => {
  test('отмеченная строка не нажимается повторно, остальные нажимаются', () => {
    const before = buildTodayViews(snap('normal', [task('Первое'), task('Второе')]), TODAY);
    const ghost = ghostOf(before, { kind: 'task', id: 'Первое' })!;
    const after = buildTodayViews(
      snap('normal', [task('Первое', { doneOn: TODAY, doneAt: 5 }), task('Второе')]),
      TODAY
    );
    const frame = applyGhost(after, ghost).light;
    const text = flat(buildWidgetTree(<TodayWidget view={frame} size="large" height={260} />));
    expect(text.match(/"clickAction":"MARK_ROW"/g)).toHaveLength(1); // только «Второе»
    expect(text).toContain('Первое');
  });

  test.each(DESIGNS)('%s: кадр собирается для обоих размеров', (design) => {
    const before = buildTodayViews(snap(design, [task('Дело')]), TODAY);
    const ghost = ghostOf(before, { kind: 'task', id: 'Дело' })!;
    const after = buildTodayViews(
      snap(design, [task('Дело', { doneOn: TODAY, doneAt: 5 })]),
      TODAY
    );
    for (const size of SIZES) {
      const frame = applyGhost(after, ghost).dark;
      expect(buildWidgetTree(<TodayWidget view={frame} size={size} height={250} />)).toBeTruthy();
    }
  });
});

describe('дело с пунктами в дереве виджета', () => {
  test('нажатие на отметку открывает приложение, а не помечает', () => {
    const s = snap('normal', [task('Купить продукты'), task('Позвонить')]);
    s.subtasks.a = {
      ...meta('a'),
      taskId: 'Купить продукты',
      title: 'молоко',
      order: 0,
      doneOn: null,
      doneAt: null,
    };
    const text = flat(
      buildWidgetTree(
        <TodayWidget view={buildTodayView(s, TODAY, 'light')} size="large" height={260} />
      )
    );
    expect(text.match(/"clickAction":"MARK_ROW"/g)).toHaveLength(1); // только «Позвонить»
    expect(text).toContain('"clickAction":"OPEN_APP"');
    expect(text).toContain('0/1');
  });
});
