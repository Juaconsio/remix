import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeOverride = 'light' | 'dark' | null;

interface ThemeState {
  override: ThemeOverride;
  setOverride: (o: ThemeOverride) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({ override: null, setOverride: (override) => set({ override }) }),
    { name: 'theme-override' }
  )
);
