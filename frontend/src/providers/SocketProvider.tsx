import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketContext, type SocketContextValue } from '../hooks/useSocket';
import type { ServerToClientEvents, ClientToServerEvents, Room, RoomConfig } from '../types/socket';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? window.location.origin;
const DEV_SESSION_KEY = 'dev_room_session';

interface DevSession { roomCode: string; playerName: string; }

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<AppSocket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const pendingPlayerNameRef = useRef<string | null>(null);

  useEffect(() => {
    const socket: AppSocket = io(BACKEND_URL, { autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      if (import.meta.env.DEV) {
        const raw = sessionStorage.getItem(DEV_SESSION_KEY);
        if (raw) {
          try {
            const session: DevSession = JSON.parse(raw);
            pendingPlayerNameRef.current = session.playerName;
            socket.emit('room:rejoin', { code: session.roomCode, playerName: session.playerName });
          } catch {
            sessionStorage.removeItem(DEV_SESSION_KEY);
          }
        }
      }
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('room:joined', ({ room, yourPlayerId }) => {
      setRoom(room);
      setMyPlayerId(yourPlayerId);
      setError(null);
      if (import.meta.env.DEV && pendingPlayerNameRef.current) {
        const session: DevSession = { roomCode: room.code, playerName: pendingPlayerNameRef.current };
        sessionStorage.setItem(DEV_SESSION_KEY, JSON.stringify(session));
        pendingPlayerNameRef.current = null;
      }
    });
    socket.on('room:error', ({ message }) => {
      setError(message);
      if (import.meta.env.DEV) sessionStorage.removeItem(DEV_SESSION_KEY);
    });
    socket.on('room:updated', ({ room }) => setRoom(room));
    socket.on('game:state', ({ room }) => setRoom(room));

    return () => { socket.disconnect(); };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    setError(null);
    pendingPlayerNameRef.current = playerName;
    socketRef.current?.emit('room:create', { playerName });
  }, []);

  const joinRoom = useCallback((code: string, playerName: string) => {
    setError(null);
    pendingPlayerNameRef.current = playerName;
    socketRef.current?.emit('room:join', { code: code.toUpperCase(), playerName });
  }, []);

  const updateConfig = useCallback((config: Partial<RoomConfig>) => {
    socketRef.current?.emit('room:config', config);
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('game:start');
  }, []);

  const flipCard = useCallback(() => {
    socketRef.current?.emit('game:flip');
  }, []);

  const selectPosition = useCallback((position: number) => {
    socketRef.current?.emit('game:select', { position });
  }, []);

  const placeCard = useCallback(() => {
    socketRef.current?.emit('game:place');
  }, []);

  const skipCard = useCallback(() => {
    socketRef.current?.emit('game:skip');
  }, []);

  const notifyAudioStarted = useCallback(() => {
    socketRef.current?.emit('game:audio:started');
  }, []);

  const onAudioPlay = useCallback((handler: ServerToClientEvents['game:audio:play']) => {
    socketRef.current?.on('game:audio:play', handler);
    return () => { socketRef.current?.off('game:audio:play', handler); };
  }, []);

  const value: SocketContextValue = {
    room,
    myPlayerId,
    error,
    connected,
    createRoom,
    joinRoom,
    updateConfig,
    startGame,
    flipCard,
    selectPosition,
    placeCard,
    notifyAudioStarted,
    onAudioPlay,
    skipCard,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
