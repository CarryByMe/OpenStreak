import { create } from 'zustand';
import { todayStr } from '../utils/text';

type UiStore = {
  showDone: boolean;
  taskSheetVisible: boolean;
  editingTaskId: string | null;
  taskSheetPresetDate: string | null;
  tipShown: boolean;
  areaFilter: string | null;
  habAreaFilter: string | null;
  areasSheetVisible: boolean;
  areaEditVisible: boolean;
  editingAreaId: string | null;
  habitSheetVisible: boolean;
  editingHabitId: string | null;
  progressHabitId: string | null;
  progressDate: string | null;
  restHabitId: string | null;
  goalSheetVisible: boolean;
  goalRequireDeadline: boolean;
  goalFixedAreaId: string | null;
  goalDetailAreaId: string | null;
  goalDetailGoalId: string | null;
  reviewDate: string | null;
  reviewHistoryVisible: boolean;
  toggleShowDone: () => void;
  openTaskSheet: (taskId?: string | null, presetDate?: string | null) => void;
  closeTaskSheet: () => void;
  markTipShown: () => void;
  setAreaFilter: (areaId: string | null) => void;
  setHabAreaFilter: (areaId: string | null) => void;
  openAreasSheet: () => void;
  closeAreasSheet: () => void;
  openAreaEditSheet: (areaId?: string | null) => void;
  closeAreaEditSheet: () => void;
  openHabitSheet: (habitId?: string | null) => void;
  closeHabitSheet: () => void;
  openProgressSheet: (habitId: string, date: string) => void;
  closeProgressSheet: () => void;
  openRestSheet: (habitId: string) => void;
  closeRestSheet: () => void;
  openGoalSheet: (opts?: { requireDeadline?: boolean; fixedAreaId?: string | null }) => void;
  closeGoalSheet: () => void;
  openGoalDetail: (areaId: string, goalId: string) => void;
  closeGoalDetail: () => void;
  openReview: (date?: string) => boolean;
  closeReview: () => void;
  openReviewHistory: () => void;
  closeReviewHistory: () => void;
};

export const useUiStore = create<UiStore>((set) => ({
  showDone: true,
  taskSheetVisible: false,
  editingTaskId: null,
  taskSheetPresetDate: null,
  tipShown: false,
  areaFilter: null,
  habAreaFilter: null,
  areasSheetVisible: false,
  areaEditVisible: false,
  editingAreaId: null,
  habitSheetVisible: false,
  editingHabitId: null,
  progressHabitId: null,
  progressDate: null,
  restHabitId: null,
  goalSheetVisible: false,
  goalRequireDeadline: true,
  goalFixedAreaId: null,
  goalDetailAreaId: null,
  goalDetailGoalId: null,
  reviewDate: null,
  reviewHistoryVisible: false,
  toggleShowDone: () => set((state) => ({ showDone: !state.showDone })),
  openTaskSheet: (taskId: string | null = null, presetDate: string | null = null) =>
    set({ taskSheetVisible: true, editingTaskId: taskId, taskSheetPresetDate: presetDate }),
  closeTaskSheet: () =>
    set({ taskSheetVisible: false, editingTaskId: null, taskSheetPresetDate: null }),
  markTipShown: () => set({ tipShown: true }),
  setAreaFilter: (areaId: string | null) => set({ areaFilter: areaId }),
  setHabAreaFilter: (areaId: string | null) => set({ habAreaFilter: areaId }),
  openAreasSheet: () =>
    set({ areasSheetVisible: true, areaEditVisible: false, editingAreaId: null }),
  closeAreasSheet: () =>
    set({ areasSheetVisible: false, areaEditVisible: false, editingAreaId: null }),
  openAreaEditSheet: (areaId: string | null = null) =>
    set({ areasSheetVisible: false, areaEditVisible: true, editingAreaId: areaId }),
  closeAreaEditSheet: () =>
    set({ areasSheetVisible: false, areaEditVisible: false, editingAreaId: null }),
  openHabitSheet: (habitId: string | null = null) =>
    set({ habitSheetVisible: true, editingHabitId: habitId }),
  closeHabitSheet: () => set({ habitSheetVisible: false, editingHabitId: null }),
  openProgressSheet: (habitId: string, date: string) =>
    set({ progressHabitId: habitId, progressDate: date }),
  closeProgressSheet: () => set({ progressHabitId: null, progressDate: null }),
  openRestSheet: (habitId: string) => set({ restHabitId: habitId }),
  closeRestSheet: () => set({ restHabitId: null }),
  openGoalSheet: (opts?: { requireDeadline?: boolean; fixedAreaId?: string | null }) =>
    set({
      goalSheetVisible: true,
      goalRequireDeadline: opts?.requireDeadline ?? true,
      goalFixedAreaId: opts?.fixedAreaId ?? null,
    }),
  closeGoalSheet: () =>
    set({ goalSheetVisible: false, goalRequireDeadline: true, goalFixedAreaId: null }),
  openGoalDetail: (areaId: string, goalId: string) =>
    set({ goalDetailAreaId: areaId, goalDetailGoalId: goalId }),
  closeGoalDetail: () => set({ goalDetailAreaId: null, goalDetailGoalId: null }),
  openReview: (date: string = todayStr()) => {
    if (date > todayStr()) return false;
    set({ reviewDate: date });
    return true;
  },
  closeReview: () => set({ reviewDate: null }),
  openReviewHistory: () => set({ reviewHistoryVisible: true }),
  closeReviewHistory: () => set({ reviewHistoryVisible: false }),
}));
