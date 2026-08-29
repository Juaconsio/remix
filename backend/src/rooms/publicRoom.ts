import type { Room, RoscoCell } from './types.js';

const REVEALED: RoscoCell['status'][] = ['correct', 'wrong'];

// Sin esto el payload de game:state le entrega la respuesta a quien debe adivinarla.
export function redactRoom(room: Room, viewerId: string): Room {
  if (!room.rosco || viewerId === room.hostId) return room;

  return {
    ...room,
    rosco: {
      ...room.rosco,
      boards: room.rosco.boards.map((board) =>
        board.map((cell) =>
          REVEALED.includes(cell.status) ? cell : { ...cell, song: null }
        )
      ),
    },
  };
}
