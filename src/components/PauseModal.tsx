import { Home, Music, Play, RotateCcw, Volume2 } from 'lucide-react';
import type { GameSettings } from '../types/game';

interface PauseModalProps {
  settings: GameSettings;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
}

export function PauseModal({
  settings,
  onResume,
  onRestart,
  onMainMenu,
  onToggleSound,
  onToggleMusic,
}: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-sm bg-[#13161d] border border-white/15 rounded-3xl p-6 text-[#faf7f2] shadow-2xl">
        <h2 className="font-display text-2xl font-bold text-center">Paused</h2>
        <p className="text-xs text-stone-400 text-center mt-1">Catch your breath on the trail</p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-[#111318] font-bold text-base flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            Resume Run
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full min-h-[46px] rounded-2xl bg-[#1e232e] hover:bg-[#272d3b] border border-white/10 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            Restart
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="w-full min-h-[46px] rounded-2xl bg-[#1e232e] hover:bg-[#272d3b] border border-white/10 font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-stone-300" />
            Main Menu
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onToggleSound}
            className="min-h-[44px] rounded-xl bg-[#191d26] border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Volume2 className={`w-4 h-4 ${settings.soundEnabled ? 'text-amber-400' : 'text-stone-500'}`} />
            SFX: {settings.soundEnabled ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={onToggleMusic}
            className="min-h-[44px] rounded-xl bg-[#191d26] border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Music className={`w-4 h-4 ${settings.musicEnabled ? 'text-amber-400' : 'text-stone-500'}`} />
            Music: {settings.musicEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  );
}
