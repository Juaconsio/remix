import type { Room } from '../types/socket';

export function canPause(room: Room): boolean {
  if (room.paused || room.pregameReadyIds) return false;
  if (room.rosco) return room.status === 'round_active';
  return room.status === 'setup' || room.status === 'validating';
}

export function isInGame(room: Room | null): room is Room {
  return !!room && room.status !== 'lobby' && room.status !== 'finished';
}
