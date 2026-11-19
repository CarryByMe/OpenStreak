import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as A from '../actions';
import { cleanLesson, cleanSettings, fromExportV5, toExportV5 } from '../migrate';
import { planReminders } from '../reminders';
import {
  bellRhythm,
  bellsFrom,
  dateInWeek,
  lessonTime,
  lessonsOn,
  schoolYearStart,
  slotProgress,
  slotState,
  timeline,
  weekDays,
  weekOf,
} from '../schedule';
import { DEFAULT_BELLS, DEFAULT_SETTINGS, settingsOf } from '../settings';
import { MemoryStorage } from '../storage/memory';
import { initData, resetForTests, setClock, useDataStore } from '../store';

// Четверг, 19 ноября 2026.
const TODAY = '2026-11-19';
const NOW = new Date(`${TODAY}T11:00:00`).getTime();
let tick = 0;

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(NOW));
  tick = 0;
  setClock(() => NOW + tick++);
  resetForTests();
  await initData({ storage: new MemoryStorage() });
});

afterEach(() => {
  jest.useRealTimers();
});

const data = () => useDataStore.getState().data;

const base: A.LessonInput = {
  title: 'Физика',
  kind: 'pair',
  note: 'практика',
  days: [4],
  pair: 2,
  pairSpan: 1,
  start: '',
  end: '',
  weeks: 'all',
  place: 'ауд. 412',
  remindBefore: null,
  areaId: null,
  habitId: null,
};
const lesson = (over: Partial<A.LessonInput> = {}) => A.createLesson({ ...base, ...over });

describe('звонки', () => {
  test('по правилу: начало, длина, перемена', () => {
    expect(bellsFrom('08:30', 90, 10, 3)).toEqual([
      { start: '08:30', end: '10:00' },
      { start: '10:10', end: '11:40' },
      { start: '11:50', end: '13:20' },
    ]);
  });

  test('пары за полночь отбрасываются, неверное начало — пусто', () => {
    expect(bellsFrom('21:00', 90, 10, 5)).toHaveLength(1);
    expect(bellsFrom('25:00', 90, 10, 5)).toEqual([]);
  });

  test('ровный ритм узнаётся, неровный — нет', () => {
    expect(bellRhythm(DEFAULT_BELLS)).toEqual({ length: 90, pause: 10 });
    expect(
      bellRhythm([
        { start: '08:30', end: '10:00' },
        { start: '10:20', end: '11:50' },
        { start: '12:00', end: '13:30' },
      ])
    ).toBeNull();
  });

  test('saveBells сортирует и отбрасывает пустые и перевёрнутые', () => {
    A.saveBells([
      { start: '10:10', end: '11:40' },
      { start: '08:30', end: '10:00' },
      { start: '', end: '09:00' },
      { start: '12:00', end: '11:00' },
    ]);
    expect(settingsOf(data()).bells).toEqual([
      { start: '08:30', end: '10:00' },
      { start: '10:10', end: '11:40' },
    ]);
  });
});

describe('время занятия', () => {
  test('пара — по звонкам, сдвоенная — до конца следующей', () => {
    expect(lessonTime({ pair: 2, pairSpan: 1, start: '', end: '' }, DEFAULT_BELLS)).toEqual({
      start: '10:10',
      end: '11:40',
    });
    expect(lessonTime({ pair: 2, pairSpan: 2, start: '', end: '' }, DEFAULT_BELLS)).toEqual({
      start: '10:10',
      end: '13:20',
    });
  });

  test('последняя пара сдвоенной не выходит за звонки', () => {
    expect(lessonTime({ pair: 6, pairSpan: 2, start: '', end: '' }, DEFAULT_BELLS).end).toBe(
      '18:20'
    );
  });

  test('пары нет в звонках — своё время', () => {
    expect(
      lessonTime({ pair: 9, pairSpan: 1, start: '18:00', end: '19:30' }, DEFAULT_BELLS)
    ).toEqual({ start: '18:00', end: '19:30' });
  });
});

describe('чётность недели', () => {
  const s = { parityFrom: null, weekStart: 1 as const };

  test('учебный год — с 1 сентября', () => {
    expect(schoolYearStart('2026-11-19')).toBe('2026-09-01');
    expect(schoolYearStart('2027-02-10')).toBe('2026-09-01');
  });

  test('неделя 1 сентября — первая, нечётная', () => {
    expect(weekOf('2026-09-01', s)).toEqual({ number: 1, parity: 'odd' });
    expect(weekOf('2026-09-07', s)).toEqual({ number: 2, parity: 'even' });
    // 19 ноября 2026 — 12-я неделя
    expect(weekOf(TODAY, s)).toEqual({ number: 12, parity: 'even' });
  });

  test('своя дата начала отсчёта', () => {
    expect(weekOf(TODAY, { ...s, parityFrom: '2026-11-16' }).number).toBe(1);
  });
});

describe('занятия дня', () => {
  test('выключенное расписание ничего не показывает', () => {
    lesson();
    expect(settingsOf(data()).scheduleEnabled).toBe(false);
    expect(lessonsOn(data(), TODAY)).toEqual([]);
  });

  test('по дням недели и по времени', () => {
    A.updateSettings({ scheduleEnabled: true });
    lesson({
      title: 'Зал',
      kind: 'gym',
      pair: null,
      start: '18:00',
      end: '19:30',
      days: [1, 4, 5],
    });
    lesson({ title: 'Матан', pair: 1 });
    lesson({ title: 'Прога', days: [2] });
    expect(lessonsOn(data(), TODAY).map((x) => [x.lesson.title, x.start])).toEqual([
      ['Матан', '08:30'],
      ['Зал', '18:00'],
    ]);
  });

  test('чётность учитывается, только когда включена', () => {
    A.updateSettings({ scheduleEnabled: true });
    lesson({ weeks: 'odd' });
    // 19 ноября — чётная неделя
    expect(lessonsOn(data(), TODAY)).toHaveLength(1);
    A.updateSettings({ weekParity: true });
    expect(lessonsOn(data(), TODAY)).toHaveLength(0);
    expect(lessonsOn(data(), '2026-11-26')).toHaveLength(1);
  });

  test('удаление и возврат', () => {
    A.updateSettings({ scheduleEnabled: true });
    const id = lesson();
    A.deleteLesson(id);
    expect(lessonsOn(data(), TODAY)).toHaveLength(0);
    A.restoreLesson(id);
    expect(lessonsOn(data(), TODAY)).toHaveLength(1);
  });

  test('удаление сферы и привычки снимает их с занятия', () => {
    const area = A.createArea({ name: 'Учёба', color: '#2f7cf6', icon: 'book' });
    const habit = A.createQuickHabit({
      name: 'Спорт',
      kind: 'good',
      icon: 'dumbbell',
      color: '#2f7cf6',
      areaId: null,
      days: null,
      remindAt: '',
    });
    const id = lesson({ areaId: area, habitId: habit });
    A.deleteArea(area);
    A.deleteHabit(habit);
    expect(data().lessons[id]).toMatchObject({ areaId: null, habitId: null });
  });

  test('createLesson приводит поля в порядок', () => {
    const id = lesson({
      title: '  Зал ',
      pair: null,
      start: '19:30',
      end: '18:00',
      days: [5, 1, 1],
      pairSpan: 7,
    });
    expect(data().lessons[id]).toMatchObject({
      title: 'Зал',
      start: '18:00',
      end: '19:30',
      days: [1, 5],
      pairSpan: 1,
    });
  });
});

describe('лента дня', () => {
  const slot = (start: string, end: string) => ({ start, end });

  test('прошло, идёт, впереди', () => {
    expect(slotState(slot('08:30', '10:00'), '11:00')).toBe('past');
    expect(slotState(slot('10:10', '11:40'), '11:00')).toBe('now');
    expect(slotState(slot('11:50', '13:20'), '11:00')).toBe('next');
  });

  test('сколько осталось', () => {
    expect(slotProgress(slot('10:10', '11:40'), '11:05')).toEqual({ left: 35, done: 55 / 90 });
  });

  test('окно — от 30 минут', () => {
    A.updateSettings({ scheduleEnabled: true });
    lesson({ title: 'Матан', pair: 1 });
    lesson();
    lesson({ title: 'Англ', pair: 3 });
    lesson({ title: 'Зал', pair: null, start: '18:00', end: '19:30' });
    const items = timeline(lessonsOn(data(), TODAY), '11:00');
    expect(
      items.map((x) => (x.type === 'gap' ? `окно ${x.minutes}` : x.slot.lesson.title))
    ).toEqual(['Матан', 'Физика', 'Англ', 'окно 280', 'Зал']);
  });

  test('дни недели по порядку недели пользователя', () => {
    expect(weekDays(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(weekDays(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(dateInWeek(TODAY, 1, 1)).toBe('2026-11-16');
    expect(dateInWeek(TODAY, 0, 1)).toBe('2026-11-22');
  });
});

describe('напоминания', () => {
  test('за N минут до начала и только при включённом расписании', () => {
    lesson({ title: 'Англ', pair: 3, remindBefore: 10 });
    const at = new Date(NOW);
    expect(planReminders(data(), at).filter((r) => r.kind === 'lesson')).toEqual([]);
    A.updateSettings({ scheduleEnabled: true });
    const plan = planReminders(data(), at).filter((r) => r.kind === 'lesson');
    expect(plan[0]).toMatchObject({ title: 'Англ', start: '11:50', place: 'ауд. 412' });
    expect(plan[0].at.getTime()).toBe(new Date(`${TODAY}T11:40:00`).getTime());
    // горизонт — неделя: следующий четверг появится в плане завтра
    expect(plan).toHaveLength(1);
  });

  test('прошедшее занятие не напоминает', () => {
    A.updateSettings({ scheduleEnabled: true });
    lesson({ pair: 1, remindBefore: 10, days: [4] });
    const plan = planReminders(data(), new Date(NOW)).filter((r) => r.kind === 'lesson');
    expect(plan).toEqual([]);
  });
});

describe('бэкап', () => {
  test('занятия и настройки расписания переживают экспорт', () => {
    A.updateSettings({ scheduleEnabled: true, weekParity: true, parityFrom: '2026-09-01' });
    const id = lesson();
    const back = fromExportV5(JSON.parse(JSON.stringify(toExportV5(data()))), NOW, TODAY);
    expect(back.lessons[id]).toMatchObject({ title: 'Физика', pair: 2, place: 'ауд. 412' });
    expect(settingsOf(back)).toMatchObject({
      scheduleEnabled: true,
      weekParity: true,
      parityFrom: '2026-09-01',
    });
  });

  test('мусорные занятия отбрасываются', () => {
    expect(cleanLesson({ id: 'x', title: 'Зал', days: [] }, NOW)).toBeNull();
    expect(cleanLesson({ id: 'x', title: 'Зал', days: [1], start: '', end: '' }, NOW)).toBeNull();
    expect(cleanLesson({ id: 'x', title: '', days: [1], pair: 1 }, NOW)).toBeNull();
    expect(
      cleanLesson({ id: 'x', title: 'Зал', days: [9, 1], start: '19:00', end: '18:00' }, NOW)
    ).toMatchObject({ days: [1], start: '18:00', end: '19:00', pair: null, kind: 'custom' });
  });

  test('старые настройки без расписания — расписание выключено, звонки по умолчанию', () => {
    const s = cleanSettings({ theme: 'dark', bells: [{ start: 'x' }] }, NOW)!;
    expect(s.scheduleEnabled).toBe(false);
    expect(s.bells).toEqual([]);
    expect(cleanSettings({}, NOW)!.bells).toEqual(DEFAULT_SETTINGS.bells);
  });
});
