/**
 * Раскладка iOS-виджета: функция с директивой 'widget' превращается babel-плагином в строку.
 * Берём эту строку, исполняем с заглушками компонентов и проверяем собранное дерево.
 */
import { describe, expect, jest, test } from '@jest/globals';
import { SETTINGS_ID, emptySnapshot, type RecordMeta, type Task } from '../../core/model';
import { buildTodayViews } from '../view';

let captured: unknown;
jest.mock('expo-widgets', () => ({
  createWidget: (_name: string, layout: unknown) => {
    captured = layout;
    return {};
  },
}));
jest.mock('@expo/ui/swift-ui', () => ({}));
jest.mock('@expo/ui/swift-ui/modifiers', () => ({}));

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

type Node = { type: string; props: Record<string, unknown> };

/** Среда виджета: каждый компонент и модификатор — функция, которая запоминает свои аргументы. */
function run(design: 'normal' | 'auf', tasks: Task[], family: string) {
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
    scheduleEnabled: false,
    bells: [],
    weekParity: false,
    parityFrom: null,
  };
  for (const t of tasks) s.tasks[t.id] = t;
  const views = buildTodayViews(s, TODAY);

  const names = [
    'Circle',
    'Gauge',
    'HStack',
    'Link',
    'Rectangle',
    'RoundedRectangle',
    'Spacer',
    'Text',
    'VStack',
    'ZStack',
  ];
  const mods = [
    'background',
    'containerBackground',
    'font',
    'foregroundStyle',
    'frame',
    'gaugeStyle',
    'lineLimit',
    'padding',
    'strokeBorder',
    'tint',
    'widgetURL',
  ];
  const env: Record<string, unknown> = {};
  for (const n of names) env[n] = n;
  for (const m of mods) env[m] = (...args: unknown[]) => ({ modifier: m, args });
  env.shapes = { roundedRectangle: (p: unknown) => ({ shape: 'roundedRectangle', p }) };
  // JSX → jsx(type, props, key)
  const jsx = (type: string, props: Record<string, unknown>, key?: string): Node => ({
    type,
    props: key === undefined ? props : { ...props, key },
  });
  env.jsx = jsx;
  env.jsxs = jsx;
  env._jsx = jsx;
  env._jsxs = jsx;
  const layout = new Function(...Object.keys(env), `return (${captured as string});`)(
    ...Object.values(env)
  ) as (p: unknown, e: unknown) => Node;
  return layout(views, { colorScheme: 'light', widgetFamily: family });
}

describe('раскладка iOS-виджета', () => {
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../ios/today');
  });

  test('функция с директивой превратилась в строку', () => {
    expect(typeof captured).toBe('string');
    expect(captured as string).not.toContain("'widget';");
  });

  const tasks = [
    task('Закрыть долг Сане', { date: '2026-11-10' }),
    task('Читать'),
    task('Готово', { doneOn: TODAY, doneAt: 5 }),
  ];

  test.each(['normal', 'auf'] as const)('%s: средний и большой собираются', (design) => {
    for (const family of ['systemMedium', 'systemLarge']) {
      for (const list of [tasks, [task('Готово', { doneOn: TODAY, doneAt: 5 })], []]) {
        const tree = run(design, list, family);
        expect(JSON.stringify(tree)).toContain('containerBackground');
      }
    }
  });

  test('большой: строки, «Сделано · N» и ссылка «+»', () => {
    const text = JSON.stringify(run('normal', tasks, 'systemLarge'));
    expect(text).toContain('Закрыть долг Сане');
    expect(text).toContain('Сделано · 1');
    expect(text).toContain('openstreak://widget/add');
  });

  test('всё сделано: кнопка «Закрыть день» ведёт на итог', () => {
    const text = JSON.stringify(
      run('auf', [task('Готово', { doneOn: TODAY, doneAt: 5 })], 'systemMedium')
    );
    expect(text).toContain('openstreak://widget/review');
    expect(text).toContain('Красава. Закрой день');
  });
});
