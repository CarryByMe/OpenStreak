export const TABS = {
  today: 'Сегодня',
  tasks: 'Задачи',
  habits: 'Привычки',
  count: 'Отсчёт',
  stats: 'Статистика',
} as const;

export type TabKey = keyof typeof TABS;
