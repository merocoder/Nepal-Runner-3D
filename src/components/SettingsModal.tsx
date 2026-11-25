import { AlertTriangle, Music, RotateCcw, Smartphone, Volume2, X } from 'lucide-react';
import { useState } from 'react';
import type { GameSettings } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onClose: () => void;
  onUpdateSettings: (next: GameSettings) => void;
  onResetProgress: () => void;
}

export function SettingsModal({
  settings,
  onClose,
  onUpdateSettings,
  onResetProgress,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/65">
      <div className="w-full max-w-lg max-h-[88vh] flex flex-col bg-[#13161d] border border-white/15 rounded-3xl text-[#faf7f2] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold">Settings</h2>
            <p className="text-xs text-stone-400">Audio, Android performance, and controls</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1d212b] hover:bg-[#262b38] border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3.5">
          {/* Sound Effects */}
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })
            }
            className="min-h-[54px] flex items-center justify-between px-4 py-3 rounded-2xl bg-[#191d26] border border-white/10 text-left"
          >
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">Sound Effects & Bells</div>
                <div className="text-xs text-stone-400">Footsteps, coins, collisions, ambience</div>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                settings.soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-white/10 text-stone-400'
              }`}
            >
              {settings.soundEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Music */}
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ ...settings, musicEnabled: !settings.musicEnabled })
            }
            className="min-h-[54px] flex items-center justify-between px-4 py-3 rounded-2xl bg-[#191d26] border border-white/10 text-left"
          >
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">Nepali Folk Music</div>
                <div className="text-xs text-stone-400">Bansuri flute & Madal drum soundtrack</div>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                settings.musicEnabled
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-white/10 text-stone-400'
              }`}
            >
              {settings.musicEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Vibration */}
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ ...settings, vibrationEnabled: !settings.vibrationEnabled })
            }
            className="min-h-[54px] flex items-center justify-between px-4 py-3 rounded-2xl bg-[#191d26] border border-white/10 text-left"
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">Touch Haptics</div>
                <div className="text-xs text-stone-400">Android vibration on jumps & crashes</div>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                settings.vibrationEnabled
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-white/10 text-stone-400'
              }`}
            >
              {settings.vibrationEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Graphics Quality */}
          <div className="p-4 rounded-2xl bg-[#191d26] border border-white/10">
            <div className="text-sm font-semibold text-white mb-2">3D Graphics Quality</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, quality: 'high' })}
                className={`min-h-[44px] rounded-xl text-xs font-bold transition-colors ${
                  settings.quality === 'high'
                    ? 'bg-amber-500 text-[#111318]'
                    : 'bg-white/10 text-stone-300'
                }`}
              >
                High Detail
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, quality: 'balanced' })}
                className={`min-h-[44px] rounded-xl text-xs font-bold transition-colors ${
                  settings.quality === 'balanced'
                    ? 'bg-amber-500 text-[#111318]'
                    : 'bg-white/10 text-stone-300'
                }`}
              >
                Android Battery Saver
              </button>
            </div>
          </div>

          {/* Controls Summary */}
          <div className="p-4 rounded-2xl bg-[#191d26] border border-white/10 text-xs text-stone-300 space-y-1.5">
            <div className="text-sm font-semibold text-white mb-1">Controls</div>
            <div>Touch / Mouse Swipe Left or Right: Switch lanes or turn at intersections</div>
            <div>Touch / Mouse Swipe Up (or W / Up / Space): Jump over barriers</div>
            <div>Touch / Mouse Swipe Down (or S / Down): Slide under beams</div>
            <div>Keyboard A / D or Left / Right Arrows: Steer & Turn</div>
          </div>

          {/* Reset Progress with Confirmation */}
          <div className="pt-2 border-t border-white/10">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full min-h-[46px] rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Saved Progress
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-rose-200 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  Erase all coins, unlocked worlds, characters, and records?
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="min-h-[42px] rounded-xl bg-white/10 text-xs font-semibold text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetProgress();
                      setConfirmReset(false);
                    }}
                    className="min-h-[42px] rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
