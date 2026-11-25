import { Coins, Pause, Shield } from 'lucide-react';
import { POWERUP_META } from '../data/gameData';
import type { HudSnapshot } from '../types/game';

interface GameplayHudProps {
  hud: HudSnapshot;
  runElapsedHint: boolean;
  onPause: () => void;
}

export function GameplayHud({ hud, runElapsedHint, onPause }: GameplayHudProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 pt-safe pb-safe">
      {/* Top Row: Distance/Score + Coins/Pause */}
      <div className="flex items-start justify-between gap-3">
        <div className="bg-[#111318]/85 border border-white/12 rounded-2xl px-4 py-2.5 text-[#faf7f2] shadow-lg">
          <div className="flex items-baseline gap-2">
            <span className="font-mono-num text-2xl sm:text-3xl font-bold tracking-tight">
              {hud.distance.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-amber-400">m</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-300 mt-0.5">
            <span className="font-mono-num">Score {hud.score.toLocaleString()}</span>
            {hud.hasShield && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-sky-300 font-semibold">
                  <Shield className="w-3.5 h-3.5" />
                  Shield
                </span>
              </>
            )}
          </div>
          {hud.dangerLevel > 0.35 && (
            <div className="mt-1 text-[11px] font-semibold text-rose-400">
              Creature closing in!
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-[#111318]/85 border border-white/12 rounded-2xl px-3.5 py-2.5 flex items-center gap-2 shadow-lg">
            <Coins className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="font-mono-num text-lg sm:text-xl font-bold text-amber-300">
              {hud.coins.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause game"
            className="pointer-events-auto min-w-[46px] min-h-[46px] flex items-center justify-center rounded-2xl bg-[#111318]/90 hover:bg-[#1c2029] active:scale-95 border border-white/15 text-[#faf7f2] shadow-lg transition-transform"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Turn Prompt */}
      {hud.turnPrompt && (
        <div className="self-center mt-2 bg-[#111318]/92 border border-amber-400/50 rounded-2xl px-5 py-2.5 shadow-xl text-center">
          <div className="text-sm sm:text-base font-bold tracking-wide text-amber-300">
            {hud.turnPrompt === 'left'
              ? 'SWIPE LEFT TO TURN'
              : hud.turnPrompt === 'right'
                ? 'SWIPE RIGHT TO TURN'
                : 'SWIPE LEFT OR RIGHT'}
          </div>
        </div>
      )}

      {/* Bottom Row: Active Power-ups & Initial Swipe Hint */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2 max-w-[220px]">
          {hud.activePowerUps.map((pu) => {
            const meta = POWERUP_META[pu.type];
            const pct = Math.max(0, Math.min(100, (pu.remaining / pu.duration) * 100));
            return (
              <div
                key={pu.type}
                className="bg-[#111318]/88 border border-white/12 rounded-xl px-3 py-2 shadow-md"
              >
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-stone-100">
                  <span style={{ color: meta.color }}>{meta.shortLabel}</span>
                  <span className="font-mono-num text-stone-300">{pu.remaining.toFixed(1)}s</span>
                </div>
                <div className="mt-1.5 h-1.5 w-36 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-75"
                    style={{ width: `${pct}%`, backgroundColor: meta.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {runElapsedHint && (
          <div className="bg-[#111318]/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-stone-200 text-right">
            Swipe or Arrow Keys: Steer · Jump · Slide
          </div>
        )}
      </div>
    </div>
  );
}
