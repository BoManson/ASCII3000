import React, { useState } from 'react';
import { Volume2, VolumeX, X, RotateCcw, Eraser } from 'lucide-react';
import { MONTHS } from '../game/constants';
import type { CityState } from '../game/types';

interface CityMenuModalProps {
  city: CityState;
  muted: boolean;
  onToggleMute: () => void;
  onRenameCity: (name: string) => void;
  onResetStarter: () => void;
  onClearBlank: () => void;
  onResume: () => void;
}

export const CityMenuModal: React.FC<CityMenuModalProps> = ({
  city,
  muted,
  onToggleMute,
  onRenameCity,
  onResetStarter,
  onClearBlank,
  onResume,
}) => {
  const [nameDraft, setNameDraft] = useState(city.name);
  const { stats } = city;

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameDraft.trim().toUpperCase().slice(0, 18);
    if (cleaned) {
      onRenameCity(cleaned);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-menu-heading"
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#06080b]/85 p-4"
    >
      <div className="w-full max-w-[360px] rounded-xl bg-[#0f141c] border border-[#243040] shadow-2xl p-4 font-mono">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#1c2533]">
          <div>
            <h2
              id="city-menu-heading"
              className="text-sm font-bold text-[#f1f5f9]"
            >
              City Console
            </h2>
            <p className="text-[11px] text-[#64748b] tabular-nums mt-0.5">
              {MONTHS[city.month]} {city.year} · {stats.status} · UNLIMITED ($∞)
            </p>
          </div>
          <button
            type="button"
            aria-label="Close city console"
            onClick={onResume}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-[#161e29] border border-[#263244] text-[#94a3b8] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* City Name Form */}
        <form onSubmit={handleRenameSubmit} className="mt-3 flex items-center gap-2">
          <label htmlFor="city-name-input" className="sr-only">
            City Name
          </label>
          <input
            id="city-name-input"
            type="text"
            value={nameDraft}
            maxLength={18}
            onChange={(e) => setNameDraft(e.target.value)}
            className="flex-1 min-w-0 h-10 px-2.5 rounded-md bg-[#080b0f] border border-[#243040] text-xs font-bold text-[#f1f5f9] uppercase focus:outline-none focus:border-[#4ade80]"
          />
          <button
            type="submit"
            className="h-10 px-3 rounded-md bg-[#182230] border border-[#2d3d52] text-xs font-semibold text-[#e2e8f0] hover:bg-[#223044] transition-colors whitespace-nowrap"
          >
            Rename
          </button>
        </form>

        {/* Live Telemetry Summary Grid */}
        <div className="mt-3 grid grid-cols-2 gap-2 tabular-nums">
          <div className="rounded-md bg-[#0a0e14] border border-[#1a2230] p-2.5">
            <div className="text-[10px] text-[#64748b]">POPULATION</div>
            <div className="text-base font-bold text-[#4ade80] mt-0.5">
              {stats.population.toLocaleString()}
            </div>
          </div>
          <div className="rounded-md bg-[#0a0e14] border border-[#1a2230] p-2.5">
            <div className="text-[10px] text-[#64748b]">JOBS (C / I)</div>
            <div className="text-base font-bold text-[#60a5fa] mt-0.5">
              {stats.jobs.toLocaleString()}
            </div>
          </div>
          <div className="rounded-md bg-[#0a0e14] border border-[#1a2230] p-2.5">
            <div className="text-[10px] text-[#64748b]">POWER LOAD</div>
            <div className="text-base font-bold text-[#fde047] mt-0.5">
              {stats.powerUsed} / {stats.powerCapacity} MW
            </div>
          </div>
          <div className="rounded-md bg-[#0a0e14] border border-[#1a2230] p-2.5">
            <div className="text-[10px] text-[#64748b]">HAPPINESS</div>
            <div className="text-base font-bold text-[#e6edf3] mt-0.5">
              {stats.happiness}%
            </div>
          </div>
        </div>

        {/* Zone Counts Strip */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#94a3b8] px-1 tabular-nums">
          <span>R:{stats.zoneCounts.residential}</span>
          <span>C:{stats.zoneCounts.commercial}</span>
          <span>I:{stats.zoneCounts.industrial}</span>
          <span>Roads:{stats.zoneCounts.roads}</span>
          <span>Parks:{stats.zoneCounts.parks}</span>
        </div>

        {/* Utility & Reset Controls */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className="w-full min-h-[44px] px-3 rounded-md bg-[#131a24] border border-[#243040] text-xs font-semibold text-[#cbd5e1] hover:bg-[#1a2330] flex items-center justify-between transition-colors"
          >
            <span>Terminal Audio</span>
            <span className="flex items-center gap-1.5 text-[#94a3b8]">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#4ade80]" />}
              {muted ? 'Muted' : 'On'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onResetStarter}
              className="min-h-[44px] px-3 rounded-md bg-[#131a24] border border-[#243040] text-xs font-semibold text-[#cbd5e1] hover:bg-[#1a2330] flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Starter City
            </button>
            <button
              type="button"
              onClick={onClearBlank}
              className="min-h-[44px] px-3 rounded-md bg-[#1b1417] border border-[#3f2027] text-xs font-semibold text-[#fca5a5] hover:bg-[#291a1f] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Eraser className="w-3.5 h-3.5" />
              Blank Map
            </button>
          </div>

          <button
            type="button"
            onClick={onResume}
            className="mt-1 w-full min-h-[46px] rounded-lg bg-[#22c55e] hover:bg-[#4ade80] text-[#05140a] text-xs font-bold transition-colors"
          >
            Resume Simulation
          </button>
        </div>
      </div>
    </div>
  );
};
