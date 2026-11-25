import { Coins, Home, RotateCcw, ShoppingBag, Trophy } from 'lucide-react';
import type { RunSummary } from '../types/game';

interface GameOverModalProps {
  summary: RunSummary;
  bestDistance: number;
  bestScore: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onOpenShop: () => void;
}

export function GameOverModal({
  summary,
  bestDistance,
  bestScore,
  onPlayAgain,
  onMainMenu,
  onOpenShop,
}: GameOverModalProps) {
  const reasonLabel =
    summary.reason === 'caught'
      ? 'Caught by the Himalayan Guardian'
      : summary.reason === 'fell'
        ? 'Fell off the mountain trail'
        : 'Crashed into an obstacle';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/55">
      <div className="w-full max-w-md bg-[#13161d] border border-white/15 rounded-3xl p-6 text-[#faf7f2] shadow-2xl">
        <div className="text-center">
          {(summary.isNewBestDistance || summary.isNewBestScore) && (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-2">
              <Trophy className="w-4 h-4" />
              New Personal Record
            </div>
          )}
          <h2 className="font-display text-3xl font-bold tracking-wide text-white">
            Run Complete
          </h2>
          <p className="mt-1 text-sm text-stone-400">{reasonLabel}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="bg-[#1b1f29] border border-white/8 rounded-2xl p-3.5">
            <div className="text-xs text-stone-400">Distance</div>
            <div className="font-mono-num text-2xl font-bold text-white mt-0.5">
              {summary.distance.toLocaleString()} m
            </div>
          </div>
          <div className="bg-[#1b1f29] border border-white/8 rounded-2xl p-3.5">
            <div className="text-xs text-stone-400">Coins Collected</div>
            <div className="font-mono-num text-2xl font-bold text-amber-400 mt-0.5 flex items-center gap-1.5">
              <Coins className="w-5 h-5" />
              {summary.coins.toLocaleString()}
            </div>
          </div>
          <div className="bg-[#1b1f29] border border-white/8 rounded-2xl p-3.5">
            <div className="text-xs text-stone-400">Total Score</div>
            <div className="font-mono-num text-xl font-bold text-white mt-0.5">
              {summary.score.toLocaleString()}
            </div>
          </div>
          <div className="bg-[#1b1f29] border border-white/8 rounded-2xl p-3.5">
            <div className="text-xs text-stone-400">Best Distance</div>
            <div className="font-mono-num text-xl font-bold text-emerald-400 mt-0.5">
              {bestDistance.toLocaleString()} m
            </div>
          </div>
        </div>

        <div className="mt-3 text-center text-xs text-stone-400 font-mono-num">
          All-Time Best Score: {bestScore.toLocaleString()}
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-[#111318] font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenShop}
              className="min-h-[46px] rounded-2xl bg-[#1e232e] hover:bg-[#272d3b] active:scale-[0.98] border border-white/10 text-stone-100 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              Shop
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="min-h-[46px] rounded-2xl bg-[#1e232e] hover:bg-[#272d3b] active:scale-[0.98] border border-white/10 text-stone-100 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Home className="w-4 h-4 text-stone-300" />
              Main Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
