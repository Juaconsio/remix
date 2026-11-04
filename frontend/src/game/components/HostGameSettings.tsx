import { useState } from 'react';
import type { AudioOutput, Room } from '../../types/socket';
import { useSocket } from '../../hooks/useSocket';
import { canPause } from '../../utils/pause';
import { cn } from '../../utils/cn';

interface RowProps {
  title: string;
  description: string;
  isSelected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function Row({ title, description, isSelected = false, disabled = false, onClick }: RowProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left px-4 py-3 rounded-[14px] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] enabled:active:scale-[0.97] motion-reduce:enabled:active:scale-100 disabled:opacity-40',
        isSelected ? 'bg-tint' : 'bg-transparent',
      )}
      style={{ border: isSelected ? '2.5px solid var(--cut-ink)' : '1.5px solid var(--cut-border)' }}
    >
      <p className="font-display text-ink" style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>
        {title}
      </p>
      <p className="font-mono-cut text-muted mt-1" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
        {description}
      </p>
    </button>
  );
}

type Exit = 'lobby' | 'end';

const AUDIO_OUTPUTS: { id: AudioOutput; title: string; description: string }[] = [
  { id: 'everyone', title: 'suena en todos.', description: 'la canción suena en todos los celulares' },
  { id: 'host', title: 'suena en tu celular.', description: 'tu celular hace de parlante' },
  { id: 'turn', title: 'suena en el turno.', description: 'solo escucha quien tiene el turno' },
];

export function HostGameSettings({ room, onDone }: { room: Room; onDone: () => void }) {
  const { pauseGame, updateConfig, returnToLobby, endGame } = useSocket();
  const [armedExit, setArmedExit] = useState<Exit | null>(null);
  const isPausable = canPause(room);

  const confirmExit = (exit: Exit, action: () => void) => {
    if (armedExit !== exit) { setArmedExit(exit); return; }
    action();
    onDone();
  };

  return (
    <section className="flex flex-col gap-2 mt-8">
      <p className="font-mono-cut text-muted mb-1" style={{ fontSize: 11 }}>
        partida
      </p>

      <Row
        title="pausar."
        description={isPausable ? 'la mesa se detiene hasta que sigas' : 'se puede pausar entre turnos'}
        disabled={!isPausable}
        onClick={() => { pauseGame(); onDone(); }}
      />

      {!room.rosco && AUDIO_OUTPUTS.map((output) => (
        <Row
          key={output.id}
          title={output.title}
          description={output.description}
          isSelected={room.config.audioOutput === output.id}
          onClick={() => updateConfig({ audioOutput: output.id })}
        />
      ))}

      <Row
        title={armedExit === 'lobby' ? '¿volver al lobby?' : 'volver al lobby.'}
        description={armedExit === 'lobby' ? 'toca otra vez · se pierde el marcador' : 'misma mesa, otra partida'}
        isSelected={armedExit === 'lobby'}
        onClick={() => confirmExit('lobby', returnToLobby)}
      />

      <Row
        title={armedExit === 'end' ? '¿terminar ahora?' : 'terminar partida.'}
        description={armedExit === 'end' ? 'toca otra vez · gana quien va adelante' : 'directo a los resultados'}
        isSelected={armedExit === 'end'}
        onClick={() => confirmExit('end', endGame)}
      />
    </section>
  );
}
