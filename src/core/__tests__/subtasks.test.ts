import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as A from '../actions';
import { dayView } from '../day';
import { cleanSubtask, fromExportV5, parseBackup, toExportV5 } from '../migrate';
import { emptySnapshot } from '../model';
import { MemoryStorage } from '../storage/memory';
import { flush, initData, resetForTests, setClock, useDataStore } from '../store';
import {
  MAX_SUBTASKS,
  MAX_SUBTASK_TITLE,
  splitPasted,
  subtaskFraction,
  subtaskIndex,
  subtaskProgress,
  subtasksOf,
} from '../subtasks';

const TODAY = '2026-11-16';
const NOW = new Date(`${TODAY}T12:00:00`).getTime();
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
const titles = (taskId: string) => subtasksOf(data(), taskId).map((s) => s.title);

/** Дело со списком покупок; возвращает id дела и id пунктов по порядку. */
function shopping(items = ['молоко', 'хлеб', 'семки']) {
  const task = A.createTask({ title: 'Купить продукты' });
  A.saveSubtasks(
    task,
    items.map((title) => ({ id: null, title }))
  );
  return { task, ids: subtasksOf(data(), task).map((s) => s.id) };
}

describe('разбор вставленного списка', () => {
  test('строки становятся пунктами', () => {
    expect(splitPasted('молоко\nхлеб\nсемки')).toEqual(['молоко', 'хлеб', 'семки']);
    expect(splitPasted('молоко\r\nхлеб\rсемки')).toEqual(['молоко', 'хлеб', 'семки']);
  });

  test('маркеры списков и нумерация убираются', () => {
    expect(
      splitPasted('- молоко\n* хлеб\n• семки\n1. яблоки\n2) сыр\n[ ] чай\n[x] кофе\n☐ мёд\n✓ соль')
    ).toEqual(['молоко', 'хлеб', 'семки', 'яблоки', 'сыр', 'чай', 'кофе', 'мёд', 'соль']);
  });

  test('пустые строки и пробелы отбрасываются, дефис внутри слова остаётся', () => {
    expect(splitPasted('\n  \n  кофе-машина  \n\n')).toEqual(['кофе-машина']);
    expect(splitPasted('')).toEqual([]);
    expect(splitPasted('   ')).toEqual([]);
  });

  test('длинная строка обрезается', () => {
    const [one] = splitPasted('я'.repeat(500));
    expect(one).toHaveLength(MAX_SUBTASK_TITLE);
  });
});

describe('сохранение пунктов', () => {
  test('новые пункты создаются по порядку', () => {
    const { task } = shopping();
    expect(titles(task)).toEqual(['молоко', 'хлеб', 'семки']);
    expect(subtasksOf(data(), task).map((s) => s.order)).toEqual([0, 1, 2]);
  });

  test('переименование, перестановка и удаление; пропавшие — мягко удалены', () => {
    const { task, ids } = shopping();
    A.saveSubtasks(task, [
      { id: ids[2], title: 'семечки' },
      { id: ids[0], title: 'молоко' },
      { id: null, title: 'сыр' },
    ]);
    expect(titles(task)).toEqual(['семечки', 'молоко', 'сыр']);
    expect(data().subtasks[ids[1]].deletedAt).not.toBeNull(); // «хлеб» — запись осталась для синхронизации
  });

  test('отметки пунктов при правке списка сохраняются', () => {
    const { task, ids } = shopping();
    A.toggleSubtask(ids[0]);
    A.saveSubtasks(task, [
      { id: ids[0], title: 'молоко 3,2%' },
      { id: ids[1], title: 'хлеб' },
    ]);
    expect(data().subtasks[ids[0]]).toMatchObject({ title: 'молоко 3,2%', doneOn: TODAY });
  });

  test('пустые названия отбрасываются, названия обрезаются по краям', () => {
    const task = A.createTask({ title: 'Дело' });
    A.saveSubtasks(task, [
      { id: null, title: '  ' },
      { id: null, title: '  хлеб  ' },
    ]);
    expect(titles(task)).toEqual(['хлеб']);
  });

  test(`не больше ${MAX_SUBTASKS} пунктов`, () => {
    const task = A.createTask({ title: 'Дело' });
    A.saveSubtasks(
      task,
      Array.from({ length: MAX_SUBTASKS + 20 }, (_, i) => ({ id: null, title: `п${i}` }))
    );
    expect(subtasksOf(data(), task)).toHaveLength(MAX_SUBTASKS);
  });

  test('чужой или повторный id не дублирует и не крадёт пункт другого дела', () => {
    const a = shopping(['а1']);
    const b = shopping(['б1']);
    A.saveSubtasks(a.task, [
      { id: b.ids[0], title: 'украдено' },
      { id: a.ids[0], title: 'а1' },
      { id: a.ids[0], title: 'а1 ещё раз' },
    ]);
    expect(titles(b.task)).toEqual(['б1']);
    expect(titles(a.task)).toEqual(['украдено', 'а1', 'а1 ещё раз']);
  });

  test('у несуществующего дела пункты не создаются', () => {
    A.saveSubtasks('нет такого', [{ id: null, title: 'хлеб' }]);
    expect(Object.keys(data().subtasks)).toHaveLength(0);
  });
});

describe('отметка пунктов', () => {
  test('счёт и доля', () => {
    const { task, ids } = shopping();
    A.toggleSubtask(ids[0]);
    const items = subtasksOf(data(), task);
    expect(subtaskProgress(items)).toEqual({ done: 1, total: 3 });
    expect(subtaskFraction(items)).toBeCloseTo(1 / 3);
    expect(subtaskFraction([])).toBe(0);
  });

  test('последний пункт закрывает дело; отмена возвращает и пункт, и дело', () => {
    const { task, ids } = shopping();
    expect(A.toggleSubtask(ids[0])?.closed).toBe(false);
    expect(A.toggleSubtask(ids[1])?.closed).toBe(false);
    expect(data().tasks[task].doneOn).toBeNull();

    const last = A.toggleSubtask(ids[2])!;
    expect(last.closed).toBe(true);
    expect(data().tasks[task]).toMatchObject({ doneOn: TODAY });
    expect(dayView(data(), TODAY, TODAY).log.map((i) => i.id)).toEqual([task]);

    last.undo();
    expect(data().tasks[task]).toMatchObject({ doneOn: null, doneAt: null });
    expect(data().subtasks[ids[2]].doneOn).toBeNull();
    expect(data().subtasks[ids[0]].doneOn).toBe(TODAY); // остальные не тронуты
  });

  test('снятие пункта дело не открывает', () => {
    const { task, ids } = shopping(['а']);
    A.toggleSubtask(ids[0]); // закрыло дело
    const res = A.toggleSubtask(ids[0]); // сняли пункт
    expect(res?.closed).toBe(false);
    expect(data().subtasks[ids[0]].doneOn).toBeNull();
    expect(data().tasks[task].doneOn).toBe(TODAY);
  });

  test('уже выполненное дело повторно не закрывается и время не меняется', () => {
    const { task, ids } = shopping(['а', 'б']);
    A.toggleSubtask(ids[0]);
    A.toggleTask(task); // закрыли вручную, пункт «б» остался
    const at = data().tasks[task].doneAt;
    expect(A.toggleSubtask(ids[1])?.closed).toBe(false);
    expect(data().tasks[task].doneAt).toBe(at);
  });

  test('ручное закрытие пунктов не трогает', () => {
    const { task, ids } = shopping();
    A.toggleTask(task);
    expect(ids.map((id) => data().subtasks[id].doneOn)).toEqual([null, null, null]);
  });

  test('несуществующий и удалённый пункт, пункт удалённого дела', () => {
    const { task, ids } = shopping(['а', 'б']);
    expect(A.toggleSubtask('нет такого')).toBeNull();
    A.deleteTask(task);
    expect(A.toggleSubtask(ids[0])).toBeNull();
  });
});

describe('удаление и возврат дела', () => {
  test('пункты уходят вместе с делом и возвращаются с ним', () => {
    const { task, ids } = shopping();
    A.deleteTask(task);
    expect(subtasksOf(data(), task)).toEqual([]);
    expect(ids.every((id) => data().subtasks[id].deletedAt !== null)).toBe(true);

    A.restoreTask(task);
    expect(titles(task)).toEqual(['молоко', 'хлеб', 'семки']);
  });

  test('пункт, убранный раньше, при возврате дела остаётся убранным', () => {
    const { task, ids } = shopping();
    A.saveSubtasks(task, [
      { id: ids[0], title: 'молоко' },
      { id: ids[2], title: 'семки' },
    ]); // «хлеб» убрали
    jest.setSystemTime(NOW + 60_000);
    setClock(() => NOW + 60_000 + tick++);
    A.deleteTask(task);
    A.restoreTask(task);
    expect(titles(task)).toEqual(['молоко', 'семки']);
  });

  test('возврат несуществующего дела ничего не ломает', () => {
    expect(() => A.restoreTask('нет такого')).not.toThrow();
  });

  test('индекс по делам', () => {
    const a = shopping(['а1', 'а2']);
    const b = shopping(['б1']);
    const index = subtaskIndex(data());
    expect(index.get(a.task)?.map((s) => s.title)).toEqual(['а1', 'а2']);
    expect(index.get(b.task)?.map((s) => s.title)).toEqual(['б1']);
    expect(index.get('нет')).toBeUndefined();
  });
});

describe('бэкап и импорт', () => {
  test('экспорт и импорт возвращают пункты', () => {
    const { task, ids } = shopping();
    A.toggleSubtask(ids[0]);
    const payload = JSON.parse(JSON.stringify(toExportV5(data())));
    expect(payload.data.subtasks).toHaveLength(3);
    const back = parseBackup(JSON.stringify(payload), NOW, TODAY).snapshot;
    expect(subtasksOf(back, task).map((s) => [s.title, s.doneOn])).toEqual([
      ['молоко', TODAY],
      ['хлеб', null],
      ['семки', null],
    ]);
  });

  test('удалённые пункты в бэкап не попадают', () => {
    const { task, ids } = shopping();
    A.saveSubtasks(task, [{ id: ids[0], title: 'молоко' }]);
    expect(toExportV5(data()).data.subtasks).toHaveLength(1);
  });

  test('бэкап старого формата без пунктов читается', () => {
    const old = toExportV5(emptySnapshot(TODAY)) as unknown as { data: Record<string, unknown> };
    delete old.data.subtasks;
    expect(() => fromExportV5(old, NOW, TODAY)).not.toThrow();
  });

  test('сироты и мусор отбрасываются', () => {
    const { task } = shopping(['а']);
    const payload = JSON.parse(JSON.stringify(toExportV5(data())));
    payload.data.subtasks.push(
      { id: 's-orphan', taskId: 'нет такого дела', title: 'сирота' },
      { id: 's-empty', taskId: task, title: '   ' },
      { id: 's-notask', title: 'без дела' },
      'мусор',
      null
    );
    const back = fromExportV5(payload, NOW, TODAY);
    expect(Object.values(back.subtasks).map((s) => s.title)).toEqual(['а']);
  });

  test('очистка записи: порядок, дата, длина названия', () => {
    expect(
      cleanSubtask(
        { id: 'x', taskId: 't', title: 'я'.repeat(500), order: 2.6, doneOn: 'не дата', doneAt: 5 },
        NOW
      )
    ).toMatchObject({ order: 3, doneOn: null, doneAt: null, title: 'я'.repeat(MAX_SUBTASK_TITLE) });
    expect(
      cleanSubtask({ id: 'x', taskId: 't', title: 'а', doneOn: TODAY, doneAt: 7 }, NOW)
    ).toMatchObject({
      doneOn: TODAY,
      doneAt: 7,
      order: 0,
    });
    expect(cleanSubtask({ taskId: 't', title: 'а' }, NOW)).toBeNull();
  });

  test('пункты пишутся в хранилище и читаются при следующем запуске', async () => {
    const storage = new MemoryStorage();
    resetForTests();
    await initData({ storage });
    const { task } = shopping();
    jest.runOnlyPendingTimers();
    await flush();
    resetForTests();
    await initData({ storage });
    expect(titles(task)).toEqual(['молоко', 'хлеб', 'семки']);
  });
});
