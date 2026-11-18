/** Какие дела раскрыты (показаны их пункты). Общее для «Сегодня» и «Дел»; живёт, пока открыто приложение. */
import { create } from 'zustand';

type Store = {
  open: Record<string, true>;
  toggle: (taskId: string) => void;
};

export const useExpandedTasks = create<Store>((set) => ({
  open: {},
  toggle: (taskId) =>
    set((s) => {
      const open = { ...s.open };
      if (open[taskId]) delete open[taskId];
      else open[taskId] = true;
      return { open };
    }),
}));
