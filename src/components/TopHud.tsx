import React from 'react';
import { Pause, Play, FastForward, SlidersHorizontal } from 'lucide-react';
import { MONTHS } from '../game/constants';
import type { CityState, SimSpeed } from '../game/types';

interface TopHudProps {
  city: CityState;
  speed: SimSpeed;
  onChangeSpeed: (speed: SimSpeed) => void;
  onOpenMenu: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  city,
  speed,
  onChangeSpeed,
  onOpenMenu,
}) => {
  const { stats, demand } = city;
  const dateLabel = `${MONTHS[city.month]} ${city.year}`;
  const powerOverloaded =
    stats.unpoweredZones > 0 || (stats.powerCapacity > 0 && stats.powerUsed >= stats.powerCapacity);

  return (
    <header className="shrink-0 bg-[#0d1117] border-b border-[#1f2937] px-2.5 pt-2 pb-2 select-none">
      {/* Row 1: City Name, Date, Unlimited Budget, Speed Controls & Menu */}
      <div className="flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenMenu();
          }}
          aria-label={`Open city menu for ${city.name}`}
          className="min-w-0 flex items-center gap-1.5 text-left py-1 pr-1 rounded hover:bg-[#161e29] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4ade80]"
        >
          <span className="font-mono text-sm font-bold tracking-tight text-[#f1f5f9] truncate max-w-[118px] sm:max-w-[156px]">
            {city.name}
          </span>
          <span
            aria-hidden="true"
            className="text-[#475569] font-mono text-xs shrink-0"
          >
            /
          </span>
          <span
            data-testid="hud-date"
            className="font-mono text-xs font-medium text-[#94a3b8] tabular-nums whitespace-nowrap shrink-0"
          >
            {dateLabel}
          </span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Speed Toggle Group */}
          <div
            role="group"
            aria-label="Simulation speed"
            className="flex items-center bg-[#080b0f] border border-[#1f2937] rounded-md p-0.5"
          >
            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause simulation"
              aria-pressed={speed === 0}
              onClick={(e) => {
                e.currentTarget.blur();
                onChangeSpeed(0);
              }}
              className={`flex items-center justify-center w-8 h-7 rounded text-xs font-mono transition-colors ${
                speed === 0
                  ? 'bg-[#263244] text-[#fde047]'
                  : 'text-[#64748b] hover:text-[#cbd5e1]'
              }`}
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Normal speed 1x"
              aria-pressed={speed === 1}
              onClick={(e) => {
                e.currentTarget.blur();
                onChangeSpeed(1);
              }}
              className={`flex items-center justify-center w-8 h-7 rounded text-[11px] font-mono font-semibold transition-colors ${
                speed === 1
                  ? 'bg-[#193529] text-[#4ade80]'
                  : 'text-[#64748b] hover:text-[#cbd5e1]'
              }`}
            >
              <Play className="w-3 h-3 mr-0.5" />1x
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Fast speed 2x"
              aria-pressed={speed === 2}
              onClick={(e) => {
                e.currentTarget.blur();
                onChangeSpeed(2);
              }}
              className={`flex items-center justify-center w-8 h-7 rounded text-[11px] font-mono font-semibold transition-colors ${
                speed === 2
                  ? 'bg-[#193529] text-[#4ade80]'
                  : 'text-[#64748b] hover:text-[#cbd5e1]'
              }`}
            >
              <FastForward className="w-3 h-3 mr-0.5" />2x
            </button>
          </div>

          <button
            type="button"
            tabIndex={-1}
            aria-label="City stats and settings"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMenu();
            }}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-[#111720] border border-[#1f2937] text-[#94a3b8] hover:text-white hover:border-[#334155] transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 2: Population, Jobs, Power, Happiness, Unlimited Budget & RCI Mini-Bars */}
      <div className="mt-1.5 pt-1.5 border-t border-[#161e29] flex items-center justify-between gap-2">
        {/* Core City Readouts */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 font-mono tabular-nums">
          <div className="flex flex-col leading-none">
            <span className="text-[9px] text-[#64748b] tracking-wide">POP</span>
            <span
              data-testid="hud-population"
              className="text-[11px] font-bold text-[#e6edf3] mt-0.5"
            >
              {stats.population.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col leading-none">
            <span className="text-[9px] text-[#64748b] tracking-wide">JOBS</span>
            <span
              data-testid="hud-jobs"
              className="text-[11px] font-semibold text-[#cbd5e1] mt-0.5"
            >
              {stats.jobs.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col leading-none">
            <span className="text-[9px] text-[#64748b] tracking-wide">PWR</span>
            <span
              data-testid="hud-power"
              className={`text-[11px] font-semibold mt-0.5 whitespace-nowrap ${
                powerOverloaded ? 'text-[#f87171]' : 'text-[#fde047]'
              }`}
            >
              {stats.powerUsed}/{stats.powerCapacity}
              {stats.unpoweredZones > 0 ? '!' : ''}
            </span>
          </div>

          <div className="flex flex-col leading-none">
            <span className="text-[9px] text-[#64748b] tracking-wide">HAP</span>
            <span
              data-testid="hud-happiness"
              className="text-[11px] font-semibold text-[#cbd5e1] mt-0.5"
            >
              {stats.happiness}%
            </span>
          </div>

          <div className="flex flex-col leading-none">
            <span className="text-[9px] text-[#64748b] tracking-wide">BUDGET</span>
            <span
              data-testid="hud-budget"
              className="text-[11px] font-bold text-[#4ade80] mt-0.5 whitespace-nowrap"
            >
              UNLIMITED ($∞)
            </span>
          </div>
        </div>

        {/* RCI Demand Mini-Bars */}
        <div
          className="flex items-end gap-1.5 shrink-0 pl-2 border-l border-[#1f2937]"
          aria-label={`RCI Demand: Residential ${demand.residential}%, Commercial ${demand.commercial}%, Industrial ${demand.industrial}%`}
        >
          {(
            [
              { key: 'R', value: demand.residential, color: '#4ade80', track: '#12291c' },
              { key: 'C', value: demand.commercial, color: '#60a5fa', track: '#112238' },
              { key: 'I', value: demand.industrial, color: '#fb923c', track: '#2d1c10' },
            ] as const
          ).map((bar) => (
            <div key={bar.key} className="flex flex-col items-center gap-0.5">
              <div
                className="w-2.5 h-6 rounded-[2px] overflow-hidden flex flex-col justify-end"
                style={{ backgroundColor: bar.track }}
              >
                <div
                  className="w-full transition-all duration-300"
                  style={{
                    height: `${Math.max(10, bar.value)}%`,
                    backgroundColor: bar.color,
                  }}
                />
              </div>
              <span
                className="font-mono text-[10px] font-bold leading-none"
                style={{ color: bar.color }}
              >
                {bar.key}
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
};
