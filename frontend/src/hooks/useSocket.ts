import { createContext, useContext } from 'react';
import type { Room, RoomConfig } from '../types/socket';
import type { ServerToClientEvents } from '../types/socket';

export interface SocketContextValue {
  room: Room | null;
  myPlayerId: string | null;
  error: string | null;
  connected: boolean;
  createRoom: (playerName: string) => void;
  joinRoom: (code: string, playerName: string) => void;
  updateConfig: (config: Partial<RoomConfig>) => void;
  startGame: () => void;
  flipCard: () => void;
  selectPosition: (position: number) => void;
  placeCard: () => void;
  notifyAudioStarted: () => void;
  onAudioPlay: (handler: ServerToClientEvents['game:audio:play']) => () => void;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}
