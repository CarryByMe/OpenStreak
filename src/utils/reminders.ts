import { Task, Habit } from '../types/models';
import { todayStr, p2 } from './text';
import { isScheduled, isRest } from './habits';
import { showNativeNotification } from '../services/notifications';
import { vibrateImpact } from '../services/haptics';
import { useToastStore } from '../store/toastStore';

export function checkReminders(
  tasks: Task[],
  habits: Habit[],
  fired: Record<string, number>,
  updateFired: (key: string) => void
): void {
  const now = new Date();
  const hm = `${p2(now.getHours())}:${p2(now.getMinutes())}`;
  const tb = todayStr();

  const fire = (key: string, msg: string) => {
    if (fired[key]) return;
    updateFired(key);
    useToastStore.getState().show(msg);
    vibrateImpact();
    showNativeNotification('OpenStreak', msg);
  };

  habits.forEach((h) => {
    if (
      h.remind &&
      hm >= h.remind &&
      h.type !== 'bad' &&
      isScheduled(h, tb) &&
      !isRest(h, tb) &&
      !h.dates.includes(tb)
    ) {
      fire(`h:${h.id}:${tb}`, `${h.name}: не забыть сегодня`);
    }
  });

  tasks.forEach((x) => {
    if (x.remind && x.date === tb && !x.done && hm >= x.remind) {
      fire(`t:${x.id}:${tb}`, `Задача: ${x.title}`);
    }
  });
}
