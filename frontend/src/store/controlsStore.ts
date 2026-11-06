import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ControlsState {
  crateButtons: boolean;
  setCrateButtons: (crateButtons: boolean) => void;
}

export const useControlsStore = create<ControlsState>()(
  persist(
    (set) => ({ crateButtons: false, setCrateButtons: (crateButtons) => set({ crateButtons }) }),
    { name: 'crate-controls' },
  ),
);
