/**
 * Операции над данными в терминах модели v2. Никаких побочных эффектов кроме записи данных:
 * вибро, тосты и запросы разрешений — забота слоя интерфейса.
 */
import { todayStr } from './dates';
import { fullValue, liveCheck } from './habits';
import { newId } from './ids';
import { clampRadius, isValidCoords } from './places';
import { MAX_SUBTASKS, MAX_SUBTASK_TITLE, subtasksOf } from './subtasks';
import { MAX_BELLS, minutesOf } from './schedule';
import {
  SETTINGS_ID,
  checkId,
  live,
  type HabitKind,
  type HabitMeasure,
  type HabitUnit,
  type Bell,
  type ISODate,
  type Lesson,
  type PlaceTrigger,
  type Priority,
} from './model';
import { DEFAULT_SETTINGS, type SettingsFields } from './settings';
import type { StoredRecord } from './storage/types';
import {
  commit,
  compact,
  draftCreate,
  draftDelete,
  draftPatch,
  draftRestore,
  get,
  now,
  useDataStore,
} from './store';

const data = () => useDataStore.getState().data;

// ── Задачи ───────────────────────────────────────────────────────────────────

export type TaskInput = {
  title: string;
  notes?: string;
  date?: ISODate | null;
  priority?: Priority;
  remindAt?: string;
  areaId?: string | null;
  /** привязка к месту; placeId null — без места (триггер тогда тоже сбрасывается) */
  placeId?: string | null;
  placeTrigger?: PlaceTrigger;
};

/** Согласованная пара «место + вход/выход»: без места триггера нет, с местом по умолчанию — вход. */
function placePair(input: { placeId?: string | null; placeTrigger?: PlaceTrigger }) {
  if (input.placeId === undefined) return {};
  return input.placeId
    ? { placeId: input.placeId, placeTrigger: input.placeTrigger ?? ('enter' as const) }
    : { placeId: null, placeTrigger: null };
}

export function createTask(input: TaskInput): string {
  const id = newId();
  commit([
    draftCreate('tasks', id, {
      title: input.title.trim(),
      notes: (input.notes ?? '').trim(),
      date: input.date === undefined ? todayStr() : input.date,
      priority: input.priority ?? 0,
      doneOn: null,
      doneAt: null,
      areaId: input.areaId ?? null,
      remindAt: input.remindAt ?? '',
      placeId: null,
      placeTrigger: null,
      ...placePair(input),
    }),
  ]);
  return id;
}

export function updateTask(id: string, input: TaskInput): void {
  commit(
    compact([
      draftPatch('tasks', id, {
        title: input.title.trim(),
        ...(input.notes !== undefined && { notes: input.notes.trim() }),
        ...(input.date !== undefined && { date: input.date }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.remindAt !== undefined && { remindAt: input.remindAt }),
        ...(input.areaId !== undefined && { areaId: input.areaId }),
        ...placePair(input),
      }),
    ])
  );
}

export function toggleTask(id: string): void {
  const t = get('tasks', id);
  if (!t) return;
  commit(
    compact([
      draftPatch(
        'tasks',
        id,
        t.doneOn ? { doneOn: null, doneAt: null } : { doneOn: todayStr(), doneAt: now() }
      ),
    ])
  );
}

/**
 * Вернуть из «Сделано» в активные — когда отметили случайно. Дело становится невыполненным
 * (дата остаётся, так что прошлая снова станет долгом), у привычки снимается отметка за `date`
 * (и слив тоже). Возвращает функцию «отменить» или null, если возвращать нечего: дело не
 * выполнено, у привычки нет отметки (например, чистый день вредной привычки).
 */
export function returnToActive(
  kind: 'task' | 'habit',
  id: string,
  date: ISODate
): (() => void) | null {
  if (kind === 'task') {
    const task = get('tasks', id);
    if (!task || task.doneOn === null) return null;
    const { doneOn, doneAt } = task;
    commit(compact([draftPatch('tasks', id, { doneOn: null, doneAt: null })]));
    // Отмена возвращает прежние день и время выполнения, а не «сейчас».
    return () => commit(compact([draftPatch('tasks', id, { doneOn, doneAt })]));
  }
  if (!get('habits', id)) return null;
  const check = liveCheck(data(), id, date);
  if (!check) return null;
  commit(compact([draftDelete('checks', check.id)]));
  return () =>
    commit([
      draftCreate('checks', check.id, {
        habitId: id,
        date,
        value: check.value,
        ...(check.slip ? { slip: true } : {}),
      }),
    ]);
}

/** Пункты удаляются вместе с делом: метки удаления отличаются на миллисекунды, не больше. */
const CASCADE_MS = 2000;

export function deleteTask(id: string): void {
  const items = subtasksOf(data(), id);
  commit(compact([draftDelete('tasks', id), ...items.map((s) => draftDelete('subtasks', s.id))]));
}

/**
 * Отменить удаление задачи: запись возвращается с теми же полями и датой создания, а с ней — пункты,
 * удалённые вместе с ней (пункт, убранный раньше, остаётся убранным).
 */
export function restoreTask(id: string): void {
  const deletedAt = data().tasks[id]?.deletedAt ?? null;
  const items =
    deletedAt === null
      ? []
      : Object.values(data().subtasks).filter(
          (s) =>
            s.taskId === id &&
            s.deletedAt !== null &&
            Math.abs(s.deletedAt - deletedAt) < CASCADE_MS
        );
  commit(compact([draftRestore('tasks', id), ...items.map((s) => draftRestore('subtasks', s.id))]));
}

// ── Пункты дел ───────────────────────────────────────────────────────────────

/** Пункт в форме: `id` — у существующего, null — новый. */
export type SubtaskDraft = { id: string | null; title: string };

/**
 * Привести пункты дела к списку из формы: новые создаются, переименованные и переставленные
 * правятся, пропавшие из списка мягко удаляются. Пустые названия отбрасываются, лишнее сверх
 * `MAX_SUBTASKS` обрезается. Отметки пунктов не трогаются.
 */
export function saveSubtasks(taskId: string, drafts: SubtaskDraft[]): void {
  if (!get('tasks', taskId)) return;
  const existing = subtasksOf(data(), taskId);
  const byId = new Map(existing.map((s) => [s.id, s]));
  const kept = new Set<string>();
  const out: (StoredRecord | null)[] = [];
  drafts
    .map((d) => ({ id: d.id, title: d.title.trim().slice(0, MAX_SUBTASK_TITLE) }))
    .filter((d) => d.title !== '')
    .slice(0, MAX_SUBTASKS)
    .forEach((d, order) => {
      const prev = d.id ? byId.get(d.id) : undefined;
      if (prev && !kept.has(prev.id)) {
        kept.add(prev.id);
        if (prev.title !== d.title || prev.order !== order) {
          out.push(draftPatch('subtasks', prev.id, { title: d.title, order }));
        }
      } else {
        out.push(
          draftCreate('subtasks', newId(), {
            taskId,
            title: d.title,
            order,
            doneOn: null,
            doneAt: null,
          })
        );
      }
    });
  for (const s of existing) if (!kept.has(s.id)) out.push(draftDelete('subtasks', s.id));
  commit(compact(out));
}

/**
 * Отметить или снять пункт. Если отмечен последний неотмеченный пункт, дело закрывается само.
 * Снятие пункта дело не открывает: выполненное дело возвращает «Вернуть». Возвращает, закрылось
 * ли дело, и функцию «отменить» (вернёт и пункт, и дело); null — пункта нет.
 */
export function toggleSubtask(id: string): { closed: boolean; undo: () => void } | null {
  const item = get('subtasks', id);
  const task = item && get('tasks', item.taskId);
  if (!item || !task) return null;
  const was = { doneOn: item.doneOn, doneAt: item.doneAt };
  commit(
    compact([
      draftPatch(
        'subtasks',
        id,
        was.doneOn ? { doneOn: null, doneAt: null } : { doneOn: todayStr(), doneAt: now() }
      ),
    ])
  );
  let closed = false;
  if (!was.doneOn && task.doneOn === null) {
    const items = subtasksOf(data(), task.id);
    if (items.length > 0 && items.every((s) => s.doneOn !== null)) {
      commit(compact([draftPatch('tasks', task.id, { doneOn: todayStr(), doneAt: now() })]));
      closed = true;
    }
  }
  const undo = () => {
    commit(
      compact([
        draftPatch('subtasks', id, was),
        ...(closed ? [draftPatch('tasks', task.id, { doneOn: null, doneAt: null })] : []),
      ])
    );
  };
  return { closed, undo };
}

// ── Места ────────────────────────────────────────────────────────────────────

export type PlaceInput = { name: string; latitude: number; longitude: number; radius: number };

function placeFields(input: PlaceInput): PlaceInput {
  if (!isValidCoords(input)) throw new Error('Некорректные координаты места');
  return { ...input, name: input.name.trim(), radius: clampRadius(input.radius) };
}

export function createPlace(input: PlaceInput, id: string = newId()): string {
  commit([draftCreate('places', id, placeFields(input))]);
  return id;
}

export function updatePlace(id: string, input: PlaceInput): void {
  commit(compact([draftPatch('places', id, placeFields(input))]));
}

/** Удалить место; дела и привычки остаются, но без привязки к месту. */
export function deletePlace(id: string): void {
  const d = data();
  commit(
    compact([
      draftDelete('places', id),
      ...live(d.tasks)
        .filter((t) => t.placeId === id)
        .map((t) => draftPatch('tasks', t.id, { placeId: null, placeTrigger: null })),
      ...live(d.habits)
        .filter((h) => h.placeId === id)
        .map((h) => draftPatch('habits', h.id, { placeId: null, placeTrigger: null })),
    ])
  );
}

export function restorePlace(id: string): void {
  commit(compact([draftRestore('places', id)]));
}

// ── Сферы и цели ─────────────────────────────────────────────────────────────

export type AreaInput = { name: string; color: string; icon: string };

export function createArea(input: AreaInput, id: string = newId()): string {
  commit([draftCreate('areas', id, { ...input, name: input.name.trim() })]);
  return id;
}

export function updateArea(id: string, input: AreaInput): void {
  commit(compact([draftPatch('areas', id, { ...input, name: input.name.trim() })]));
}

/** Удалить сферу вместе с её целями; задачи и привычки остаются, но без сферы. */
export function deleteArea(id: string): void {
  const d = data();
  commit(
    compact([
      draftDelete('areas', id),
      ...live(d.goals)
        .filter((g) => g.areaId === id)
        .map((g) => draftDelete('goals', g.id)),
      ...live(d.tasks)
        .filter((t) => t.areaId === id)
        .map((t) => draftPatch('tasks', t.id, { areaId: null })),
      ...live(d.habits)
        .filter((h) => h.areaId === id)
        .map((h) => draftPatch('habits', h.id, { areaId: null })),
      ...live(d.lessons)
        .filter((l) => l.areaId === id)
        .map((l) => draftPatch('lessons', l.id, { areaId: null })),
    ])
  );
}

export type GoalInput = {
  text: string;
  criterion: string;
  reward: string;
  penalty: string;
  deadline: ISODate | null;
  doneOn?: ISODate | null;
};

export function createGoal(areaId: string | null, input: GoalInput, id: string = newId()): string {
  commit([
    draftCreate('goals', id, {
      areaId,
      text: input.text.trim(),
      criterion: input.criterion,
      reward: input.reward,
      penalty: input.penalty,
      deadline: input.deadline,
      doneOn: input.doneOn ?? null,
    }),
  ]);
  return id;
}

/** Привести цели сферы к переданному списку: добавить новые, обновить изменённые, удалить лишние. */
export function syncAreaGoals(areaId: string, goals: (GoalInput & { id: string })[]): void {
  const existing = live(data().goals).filter((g) => g.areaId === areaId);
  const keep = new Set(goals.map((g) => g.id));
  commit(
    compact([
      ...existing.filter((g) => !keep.has(g.id)).map((g) => draftDelete('goals', g.id)),
      ...goals.map((g) => {
        const fields = {
          areaId,
          text: g.text.trim(),
          criterion: g.criterion,
          reward: g.reward,
          penalty: g.penalty,
          deadline: g.deadline,
          doneOn: g.doneOn ?? null,
        };
        const prev = get('goals', g.id);
        if (!prev) return draftCreate('goals', g.id, fields);
        const changed = (Object.keys(fields) as (keyof typeof fields)[]).some(
          (k) => prev[k] !== fields[k]
        );
        return changed ? draftPatch('goals', g.id, fields) : null;
      }),
    ])
  );
}

export function toggleGoal(id: string): void {
  const g = get('goals', id);
  if (!g) return;
  commit(compact([draftPatch('goals', id, { doneOn: g.doneOn ? null : todayStr() })]));
}

/** Правка договора из шторки: текст, срок, зачёт, награда, «если слил». Пустой текст — без изменений. */
export function editGoal(id: string, input: Omit<GoalInput, 'doneOn'>): void {
  const text = input.text.trim();
  if (!text) return;
  commit(
    compact([
      draftPatch('goals', id, {
        text,
        criterion: input.criterion.trim(),
        reward: input.reward.trim(),
        penalty: input.penalty.trim(),
        deadline: input.deadline,
      }),
    ])
  );
}

/** Отменить удаление цели. */
export function restoreGoal(id: string): void {
  commit(compact([draftRestore('goals', id)]));
}

export function deleteGoal(id: string): void {
  commit(compact([draftDelete('goals', id)]));
}

// ── Привычки ─────────────────────────────────────────────────────────────────

export type HabitInput = {
  name: string;
  kind: HabitKind;
  icon: string;
  color: string;
  days: number[] | null;
  question: string;
  remindAt: string;
  areaId: string | null;
  measure: HabitMeasure;
  unit: HabitUnit;
  target: number;
  placeId?: string | null;
  placeTrigger?: PlaceTrigger;
};

/** Дни недели привычки: по порядку, без повторов; пусто или все семь — каждый день (null). */
export function normalizeDays(days: number[] | null | undefined): number[] | null {
  const set = [...new Set((days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
  return set.length === 0 || set.length === 7 ? null : set.sort();
}

function habitFields(input: HabitInput) {
  const numeric = input.measure === 'numeric';
  return {
    name: input.name.trim(),
    kind: input.kind,
    icon: input.icon,
    color: input.color,
    days: normalizeDays(input.days),
    question: input.question,
    remindAt: input.remindAt,
    areaId: input.areaId,
    measure: input.measure,
    unit: numeric ? input.unit : ('count' as const),
    target: numeric && input.target > 0 ? input.target : 1,
    ...placePair(input),
  };
}

export function createHabit(input: HabitInput): string {
  const id = newId();
  commit([
    draftCreate('habits', id, {
      placeId: null,
      placeTrigger: null,
      ...habitFields(input),
      startDate: todayStr(),
      archivedAt: null,
    }),
  ]);
  return id;
}

/** Привычка из шторки «Новое»: только название, вид и напоминание; остальное — по умолчанию. */
export function createQuickHabit(input: {
  name: string;
  kind: HabitKind;
  /** ключ значка из набора; по умолчанию — «цель» */
  icon?: string;
  /** дни недели (0 = вс … 6 = сб); null — каждый день */
  days?: number[] | null;
  /** цвет привычки (`#RRGGBB`); по умолчанию — первый цвет набора */
  color?: string;
  /** сфера; по умолчанию — без сферы */
  areaId?: string | null;
  remindAt: string;
  placeId?: string | null;
  placeTrigger?: PlaceTrigger;
}): string {
  return createHabit({
    name: input.name,
    kind: input.kind,
    icon: input.icon || 'target',
    // Цвет рисуется только в «Обычном» оформлении; в остальных плитка берётся из иконки.
    color: input.color && /^#[0-9a-fA-F]{6}$/.test(input.color) ? input.color : '#2f7cf6',
    days: input.days ?? null,
    question: '',
    remindAt: input.kind === 'bad' ? '' : input.remindAt,
    areaId: input.areaId ?? null,
    measure: 'boolean',
    unit: 'count',
    target: 1,
    placeId: input.kind === 'bad' ? null : input.placeId,
    placeTrigger: input.placeTrigger,
  });
}

/** Правка из шторки: название, вид и напоминание; остальные поля привычки не трогаем. */
export function editHabitBasics(
  id: string,
  input: {
    name: string;
    kind: HabitKind;
    /** новый значок; без него значок не меняется */
    icon?: string;
    /** новое расписание; undefined — не меняется, null — каждый день */
    days?: number[] | null;
    /** новый цвет (`#RRGGBB`); без него цвет не меняется */
    color?: string;
    /** новая сфера; undefined — не меняется, null — убрать сферу */
    areaId?: string | null;
    remindAt: string;
    placeId?: string | null;
    placeTrigger?: PlaceTrigger;
  }
): void {
  const name = input.name.trim();
  if (!name) return;
  commit(
    compact([
      draftPatch('habits', id, {
        name,
        kind: input.kind,
        ...(input.icon ? { icon: input.icon } : {}),
        ...(input.color && /^#[0-9a-fA-F]{6}$/.test(input.color) ? { color: input.color } : {}),
        ...(input.areaId !== undefined ? { areaId: input.areaId } : {}),
        ...(input.days !== undefined ? { days: normalizeDays(input.days) } : {}),
        remindAt: input.kind === 'bad' ? '' : input.remindAt,
        ...placePair(input.kind === 'bad' ? { placeId: null } : input),
      }),
    ])
  );
}

export function updateHabit(id: string, input: HabitInput): void {
  commit(compact([draftPatch('habits', id, habitFields(input))]));
}

/** Удалить привычку вместе с отметками и периодами отдыха. */
export function deleteHabit(id: string): void {
  const d = data();
  commit(
    compact([
      draftDelete('habits', id),
      ...live(d.checks)
        .filter((c) => c.habitId === id)
        .map((c) => draftDelete('checks', c.id)),
      ...live(d.rests)
        .filter((r) => r.habitId === id)
        .map((r) => draftDelete('rests', r.id)),
      ...live(d.lessons)
        .filter((l) => l.habitId === id)
        .map((l) => draftPatch('lessons', l.id, { habitId: null })),
    ])
  );
}

/** Значение «выполнено полностью» для привычки: цель для numeric, 1 для остальных. */
export { fullValue };

/** Отметить/снять отметку за день (для вредной — срыв). Отметка поверх «слил» заменяет слив. */
export function toggleCheck(habitId: string, date: ISODate): void {
  const h = get('habits', habitId);
  if (!h) return;
  const id = checkId(habitId, date);
  const prev = get('checks', id);
  if (prev && !prev.slip) {
    commit(compact([draftDelete('checks', id)]));
  } else {
    commit([draftCreate('checks', id, { habitId, date, value: fullValue(h) })]);
  }
}

/** Задать значение за день; 0 и меньше — снять отметку. */
export function setCheckValue(habitId: string, date: ISODate, value: number): void {
  if (!get('habits', habitId)) return;
  const id = checkId(habitId, date);
  if (value <= 0) {
    commit(compact([draftDelete('checks', id)]));
  } else {
    commit([draftCreate('checks', id, { habitId, date, value })]);
  }
}

/** «Слил сегодня» у полезной привычки (снимает выполнение за день). Повтор — снимает слив. */
export function toggleSlip(habitId: string, date: ISODate): void {
  const h = get('habits', habitId);
  if (!h || h.kind !== 'good') return;
  const id = checkId(habitId, date);
  if (get('checks', id)?.slip) {
    commit(compact([draftDelete('checks', id)]));
  } else {
    commit([draftCreate('checks', id, { habitId, date, value: 0, slip: true })]);
  }
}

/** Выходной на один день: включить или выключить. Период из нескольких дней не дробится. */
export function toggleRestDay(habitId: string, date: ISODate): void {
  if (!get('habits', habitId)) return;
  const single = live(data().rests).find(
    (r) => r.habitId === habitId && r.from === date && r.to === date
  );
  if (single) commit(compact([draftDelete('rests', single.id)]));
  else addRest(habitId, date, date);
}

export function addRest(habitId: string, from: ISODate, to: ISODate): void {
  if (!get('habits', habitId)) return;
  const [f, t] = from <= to ? [from, to] : [to, from];
  commit([draftCreate('rests', newId(), { habitId, from: f, to: t })]);
}

export function removeRest(habitId: string, from: ISODate, to: ISODate): void {
  commit(
    compact(
      live(data().rests)
        .filter((r) => r.habitId === habitId && r.from === from && r.to === to)
        .map((r) => draftDelete('rests', r.id))
    )
  );
}

// ── Итог дня ─────────────────────────────────────────────────────────────────

export function saveReview(date: ISODate, mood: number, note: string): void {
  commit([
    draftCreate('reviews', date, {
      date,
      mood: Math.min(5, Math.max(1, Math.round(mood))),
      note: note.trim(),
    }),
  ]);
}

// ── Расписание ───────────────────────────────────────────────────────────────

export type LessonInput = Omit<Lesson, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/** Поля занятия в порядке: дни без повторов, время по порядку, длина сдвоенной 1–2. */
function lessonFields(input: LessonInput): LessonInput {
  const days = [...new Set(input.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
  const s = minutesOf(input.start);
  const e = minutesOf(input.end);
  const swap = s !== null && e !== null && e < s;
  return {
    ...input,
    title: input.title.trim(),
    note: input.note.trim(),
    place: input.place.trim(),
    days: days.sort(),
    pair: input.pair !== null && input.pair >= 1 && input.pair <= MAX_BELLS ? input.pair : null,
    pairSpan: input.pairSpan === 2 ? 2 : 1,
    start: swap ? input.end : input.start,
    end: swap ? input.start : input.end,
    remindBefore: input.remindBefore !== null && input.remindBefore > 0 ? input.remindBefore : null,
  };
}

export function createLesson(input: LessonInput, id: string = newId()): string {
  commit([draftCreate('lessons', id, lessonFields(input))]);
  return id;
}

export function updateLesson(id: string, input: LessonInput): void {
  commit(compact([draftPatch('lessons', id, lessonFields(input))]));
}

export function deleteLesson(id: string): void {
  commit(compact([draftDelete('lessons', id)]));
}

export function restoreLesson(id: string): void {
  commit(compact([draftRestore('lessons', id)]));
}

/** Звонки: время по порядку, не больше `MAX_BELLS`; пары без времени отбрасываются. */
export function saveBells(bells: Bell[]): void {
  const clean = bells
    .filter((b) => minutesOf(b.start) !== null && minutesOf(b.end) !== null && b.start < b.end)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, MAX_BELLS);
  updateSettings({ bells: clean });
}

// ── Настройки ────────────────────────────────────────────────────────────────

/** Изменить настройки; запись создаётся при первом изменении. */
export function updateSettings(changes: Partial<SettingsFields>): void {
  const prev = get('settings', SETTINGS_ID);
  if (prev) {
    commit(compact([draftPatch('settings', SETTINGS_ID, changes)]));
  } else {
    commit([draftCreate('settings', SETTINGS_ID, { ...DEFAULT_SETTINGS, ...changes })]);
  }
}
