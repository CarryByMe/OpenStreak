import { describe, expect, test } from '@jest/globals';
import {
  emptySnapshot,
  SETTINGS_ID,
  type Habit,
  type RecordMeta,
  type Snapshot,
  type Task,
} from '../../core/model';
import { contrastRatio } from '../../theme/readable';
import { applyGhost, buildTodayView, buildTodayViews, ghostOf, lookOf } from '../view';

// 2026-11-16 — понедельник.
const TODAY = '2026-11-16';

const meta = (id: string): RecordMeta => ({ id, createdAt: 1, updatedAt: 1, deletedAt: null });

function task(id: string, over: Partial<Task> = {}): Task {
  return {
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
  };
}

function habit(id: string, over: Partial<Habit> = {}): Habit {
  return {
    ...meta(id),
    name: id,
    kind: 'good',
    icon: 'target',
    color: '#2f7cf6',
    days: null,
    question: '',
    remindAt: '',
    areaId: null,
    startDate: '2026-10-01',
    measure: 'boolean',
    unit: 'count',
    target: 1,
    placeId: null,
    placeTrigger: null,
    archivedAt: null,
    ...over,
  };
}

function snap(settings: Record<string, unknown> = {}, tasks: Task[] = [], habits: Habit[] = []) {
  const s: Snapshot = emptySnapshot('2026-10-01');
  s.settings[SETTINGS_ID] = {
    ...meta(SETTINGS_ID),
    theme: 'system',
    design: 'normal',
    tone: 'bro',
    quotes: true,
    ranks: true,
    locale: 'ru',
    weekStart: 1,
    reviewAt: '21:30',
    scheduleEnabled: false,
    bells: [],
    weekParity: false,
    parityFrom: null,
    ...settings,
  };
  for (const t of tasks) s.tasks[t.id] = t;
  for (const h of habits) s.habits[h.id] = h;
  return s;
}

describe('вид виджета «Сегодня»', () => {
  test('«Обычный» и «Минималистичный» — мягкая карточка, «АУФ» и «Качалка» — «Мульт»', () => {
    expect(lookOf('normal')).toBe('soft');
    expect(lookOf('minimal')).toBe('soft');
    expect(lookOf('auf')).toBe('mult');
    expect(lookOf('gym')).toBe('mult');
  });

  test('«Качалка»: своя палитра, узкие числа и «полный блин»', () => {
    const done = [task('a', { doneOn: TODAY, doneAt: 5 })];
    const v = buildTodayView(snap({ design: 'gym' }, done), TODAY, 'dark');
    expect(v.look).toBe('mult');
    expect(v.fonts.num).toBe('Oswald_700Bold');
    expect(v.fullCaption).toBe('полный блин!');
  });

  test('тексты шапки и счёта по-русски', () => {
    const v = buildTodayView(
      snap({}, [task('a', { doneOn: TODAY, doneAt: 5 }), task('b'), task('c')]),
      TODAY,
      'light'
    );
    expect(v.date).toBe('Пн, 16 ноября');
    expect(v.sub).toBe('день 47');
    expect(v.done).toBe(1);
    expect(v.total).toBe(3);
    expect(v.restLabel).toBe('осталось 2');
    expect(v.progressLabel).toBe('Сделано 1 из 3');
    expect(v.doneLabel).toBe('Сделано · 1');
    expect(v.closeLabel).toBe('Закрыть день');
  });

  test('подпись справа: долг, числовая, время, серия', () => {
    const v = buildTodayView(
      snap(
        {},
        [task('debt', { date: '2026-11-10' }), task('gym', { remindAt: '19:00' })],
        [habit('pushups', { measure: 'numeric', target: 100 })]
      ),
      TODAY,
      'light'
    );
    const meta = Object.fromEntries(v.rows.map((r) => [r.id, r.meta]));
    expect(meta).toEqual({ debt: 'долг', pushups: '0/100', gym: '19:00' });
  });

  test('«всё сделано»: текст зависит от тона и оформления', () => {
    const done = [task('a', { doneOn: TODAY, doneAt: 5 })];
    const plain = buildTodayView(snap({ design: 'normal' }, done), TODAY, 'light');
    expect(plain.state).toBe('ready');
    expect(plain.message).toBe('День собран. Осталось подвести итог.');
    expect(plain.fullCaption).toBe('всё сделано');

    const bro = buildTodayView(snap({ design: 'auf' }, done), TODAY, 'light');
    expect(bro.message).toBe('Красава. Закрой день — заберёшь +40 очков.');
    expect(bro.fullCaption).toBe('полнолуние!');
  });

  test('вне «АУФ» пацанский тон не действует, даже если он сохранён', () => {
    const v = buildTodayView(
      snap({ design: 'minimal', tone: 'bro' }, [task('a', { doneOn: TODAY, doneAt: 5 })]),
      TODAY,
      'light'
    );
    expect(v.message).toBe('День собран. Осталось подвести итог.');
  });

  test('английский язык', () => {
    const v = buildTodayView(snap({ locale: 'en' }, [task('a')]), TODAY, 'light');
    expect(v.date).toBe('Mo, November 16');
    expect(v.restLabel).toBe('1 left');
  });

  test('цвет отметки в «Обычном» держит контраст ≥ 3 с карточкой в обеих темах', () => {
    const areas = ['#cddc39', '#f59e0b', '#8bc34a', '#2f7cf6'];
    const s = snap(
      {},
      areas.map((_, i) => task(`t${i}`, { areaId: `a${i}` }))
    );
    areas.forEach((color, i) => {
      s.areas[`a${i}`] = { ...meta(`a${i}`), name: `a${i}`, color, icon: 'target' };
    });
    for (const scheme of ['light', 'dark'] as const) {
      const v = buildTodayView(s, TODAY, scheme);
      for (const r of v.rows) {
        expect([scheme, r.color, contrastRatio(r.color, v.colors.surface) >= 3]).toEqual([
          scheme,
          r.color,
          true,
        ]);
      }
    }
  });

  test('«Мульт»: цвет сферы не используется, отметка — кольцо', () => {
    const s = snap({ design: 'auf' }, [task('t', { areaId: 'a' })]);
    s.areas.a = { ...meta('a'), name: 'a', color: '#1fb876', icon: 'target' };
    const v = buildTodayView(s, TODAY, 'light');
    expect(v.look).toBe('mult');
    expect(v.rows[0].color).toBe(v.colors.ring);
  });

  test('тема: «как в системе» — обе, выбранная — одна для обеих', () => {
    const system = buildTodayViews(snap({ theme: 'system' }), TODAY);
    expect(system.light.scheme).toBe('light');
    expect(system.dark.scheme).toBe('dark');

    const forced = buildTodayViews(snap({ theme: 'dark' }), TODAY);
    expect(forced.light.scheme).toBe('dark');
    expect(forced.dark.scheme).toBe('dark');
    expect(forced.light.colors).toEqual(forced.dark.colors);
  });

  test('вид сериализуется в JSON без потерь', () => {
    const v = buildTodayView(snap({}, [task('a')], [habit('h')]), TODAY, 'dark');
    expect(JSON.parse(JSON.stringify(v))).toEqual(v);
  });
});

describe('отметка кадрами: «призрак» строки', () => {
  const three = () => [task('a'), task('b', { remindAt: '19:00' }), task('c')];

  test('строка находится в видах и после отметки возвращается на прежнее место', () => {
    const before = buildTodayViews(snap({}, three()), TODAY);
    const ghost = ghostOf(before, { kind: 'task', id: 'b' });
    expect(ghost?.light.index).toBe(0); // со временем — выше остальных
    expect(ghost?.light.row.title).toBe('b');

    const after = buildTodayViews(
      snap({}, [task('a'), task('b', { doneOn: TODAY, doneAt: 5 }), task('c')]),
      TODAY
    );
    expect(after.light.rows.map((r) => r.id)).toEqual(['a', 'c']);
    const frame = applyGhost(after, ghost!);
    expect(frame.light.rows.map((r) => r.id)).toEqual(['b', 'a', 'c']);
    expect(frame.light.rows[0]).toMatchObject({ done: true, meta: '' });
    // счёт уже новый: кадр показывает итог, а не прошлое
    expect(frame.light.done).toBe(1);
    expect(frame.dark.rows[0].done).toBe(true);
  });

  test('«призрак» не мутирует исходные виды', () => {
    const before = buildTodayViews(snap({}, three()), TODAY);
    const ghost = ghostOf(before, { kind: 'task', id: 'a' })!;
    const frame = applyGhost(before, ghost);
    expect(before.light.rows.some((r) => r.done)).toBe(false);
    expect(frame.light.rows.filter((r) => r.done)).toHaveLength(1);
  });

  test('устаревший виджет: строки, которой нет, призрака нет', () => {
    const before = buildTodayViews(snap({}, three()), TODAY);
    expect(ghostOf(before, { kind: 'task', id: 'нет' })).toBeNull();
    expect(ghostOf(before, { kind: 'habit', id: 'a' })).toBeNull(); // тот же id, другой вид
  });

  test('место за пределами списка — в конец', () => {
    const before = buildTodayViews(snap({}, three()), TODAY);
    const ghost = ghostOf(before, { kind: 'task', id: 'c' })!;
    const onlyOne = buildTodayViews(snap({}, [task('a')]), TODAY);
    const frame = applyGhost(onlyOne, ghost);
    expect(frame.light.rows.map((r) => r.id)).toEqual(['a', 'c']);
  });
});

describe('дело с пунктами в виджете', () => {
  test('справа «2/5», отметка не закрывает дело', () => {
    const s = snap({}, [task('Купить продукты')]);
    ['a', 'b', 'c', 'd', 'e'].forEach((id, i) => {
      s.subtasks[id] = {
        ...meta(id),
        taskId: 'Купить продукты',
        title: id,
        order: i,
        doneOn: i < 2 ? TODAY : null,
        doneAt: i < 2 ? 5 : null,
      };
    });
    const [row] = buildTodayView(s, TODAY, 'light').rows;
    expect(row).toMatchObject({ meta: '2/5', hasItems: true });
    expect(row.fraction).toBeCloseTo(0.4);
  });
});
