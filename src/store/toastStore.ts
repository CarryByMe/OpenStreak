import { create } from 'zustand';

type ToastStore = {
  message: string;
  visible: boolean;
  show: (message: string, duration?: number) => void;
  hide: () => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  message: '',
  visible: false,

  show: (message: string, duration: number = 2100) => {
    set({ message, visible: true });
    setTimeout(() => {
      set({ visible: false });
    }, duration);
  },

  hide: () => {
    set({ visible: false });
  },
}));
