import { create } from 'zustand';

interface YtPlayingState {
  isPlaying: boolean;
  setPlaying: (v: boolean) => void;
}

export const useYtPlayingStore = create<YtPlayingState>()((set) => ({
  isPlaying: false,
  setPlaying: (isPlaying) => set({ isPlaying }),
}));
