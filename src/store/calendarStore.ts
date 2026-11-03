import { create } from 'zustand';
import { CalendarView } from '../utils/calendar';
import { todayStr, addDays } from '../utils/text';

type CalendarStore = {
  calView: CalendarView;
  calCursor: string;
  calSel: string;
  setView: (view: CalendarView) => void;
  setCursor: (cursor: string) => void;
  setSel: (sel: string) => void;
  navigatePrev: () => void;
  navigateNext: () => void;
};

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  calView: 'month',
  calCursor: todayStr(),
  calSel: todayStr(),

  setView: (view: CalendarView) => set({ calView: view }),

  setCursor: (cursor: string) => set({ calCursor: cursor }),

  setSel: (sel: string) => set({ calSel: sel }),

  navigatePrev: () => {
    const { calView, calCursor } = get();
    let newCursor = calCursor;

    if (calView === 'week') {
      newCursor = addDays(calCursor, -7);
    } else if (calView === 'month') {
      const dt = new Date(calCursor + 'T00:00');
      dt.setMonth(dt.getMonth() - 1);
      newCursor = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    } else if (calView === 'year') {
      const dt = new Date(calCursor + 'T00:00');
      dt.setFullYear(dt.getFullYear() - 1);
      newCursor = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }

    set({ calCursor: newCursor });
  },

  navigateNext: () => {
    const { calView, calCursor } = get();
    let newCursor = calCursor;

    if (calView === 'week') {
      newCursor = addDays(calCursor, 7);
    } else if (calView === 'month') {
      const dt = new Date(calCursor + 'T00:00');
      dt.setMonth(dt.getMonth() + 1);
      newCursor = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    } else if (calView === 'year') {
      const dt = new Date(calCursor + 'T00:00');
      dt.setFullYear(dt.getFullYear() + 1);
      newCursor = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }

    set({ calCursor: newCursor });
  },
}));
