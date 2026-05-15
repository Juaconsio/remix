'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MusicProvider } from '../types/game';

interface ProviderState {
  provider: MusicProvider;
  setProvider: (p: MusicProvider) => void;
}

export const useProviderStore = create<ProviderState>()(
  persist(
    (set) => ({
      provider: 'deezer',
      setProvider: (provider) => set({ provider }),
    }),
    { name: 'music-provider' }
  )
);
