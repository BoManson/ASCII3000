import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { STAGE_COLORS, TILE_COLORS } from '../game/constants';
import { isZoneType } from '../game/simulation';
import type { TileInspection } from '../game/types';

interface InspectorToastProps {
  inspection: TileInspection;
  onClose: () => void;
  onBulldozeTile: (x: number, y: number) => void;
}

export const InspectorToast: React.FC<InspectorToastProps> = ({
  inspection,
  onClose,
  onBulldozeTile,
}) => {
  const symbolColor = isZoneType(inspection.type)
    ? STAGE_COLORS[inspection.type][inspection.stage]
    : TILE_COLORS[inspection.type];

  const primaryOutputLabel =
    inspection.type === 'residential'
      ? `${inspection.population} Pop`
      : inspection.type === 'commercial' || inspection.type === 'industrial'
      ? `${inspection.jobs} Jobs`
      : inspection.type === 'power_plant'
      ? `+${inspection.powerOutput} MW`
      : inspection.type === 'park'
      ? '+Land Value'
      : '—';

  return (
    <div
      role="region"
      aria-label="Tile inspector"
      data-testid="inspector-toast"
      className="pointer-events-auto mx-2.5 mb-2 rounded-lg bg-[#10161f] border border-[#2a384c] shadow-2xl px-3 py-2.5 font-mono"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Framed ASCII Symbol */}
          <div
            className="flex items-center justify-center w-10 h-10 rounded-md bg-[#080b0f] border border-[#243040] text-xl font-bold shrink-0"
            style={{ color: symbolColor }}
          >
            {inspection.symbol}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold text-[#f1f5f9] truncate">
                {inspection.stageLabel}
              </h2>
              <span className="text-[11px] text-[#64748b] tabular-nums shrink-0">
                ({inspection.x},{inspection.y})
              </span>
            </div>
            <div className="text-[11px] text-[#94a3b8] mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{inspection.typeLabel}</span>
              {inspection.isZone && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    Level {inspection.stage + 1}/{inspection.maxStage + 1}
                  </span>
                </>
              )}
              {inspection.isZone && inspection.stage < 3 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums text-[#cbd5e1]">
                    Growth {inspection.growthPercent}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {inspection.type !== 'empty' && (
            <button
              type="button"
              aria-label={`Bulldoze tile at ${inspection.x},${inspection.y}`}
              onClick={() => onBulldozeTile(inspection.x, inspection.y)}
              className="flex items-center justify-center w-9 h-9 rounded-md bg-[#1a1419] border border-[#3f2027] text-[#f87171] hover:bg-[#2a191f] transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            aria-label="Close tile inspector"
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-[#161e29] border border-[#263244] text-[#94a3b8] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status & Metrics Row */}
      <div className="mt-2 pt-2 border-t border-[#1c2533] grid grid-cols-4 gap-1.5 text-[11px] tabular-nums">
        <div>
          <div className="text-[10px] text-[#64748b]">POWER</div>
          <div
            className={`font-semibold mt-0.5 ${
              inspection.isZone || inspection.type === 'power_line' || inspection.type === 'road'
                ? inspection.powered
                  ? 'text-[#4ade80]'
                  : 'text-[#f87171]'
                : inspection.type === 'power_plant'
                ? 'text-[#fde047]'
                : 'text-[#64748b]'
            }`}
          >
            {inspection.type === 'power_plant'
              ? 'Active'
              : inspection.isZone || inspection.type === 'power_line' || inspection.type === 'road'
              ? inspection.powered
                ? 'Powered'
                : 'No Power !'
              : 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-[#64748b]">ROAD</div>
          <div
            className={`font-semibold mt-0.5 ${
              inspection.isZone
                ? inspection.hasRoadAccess
                  ? 'text-[#cbd5e1]'
                  : 'text-[#fb923c]'
                : 'text-[#64748b]'
            }`}
          >
            {inspection.isZone
              ? inspection.hasRoadAccess
                ? 'Connected'
                : 'No Road'
              : inspection.type === 'road'
              ? 'Road Tile'
              : 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-[#64748b]">OUTPUT</div>
          <div className="font-semibold text-[#e6edf3] mt-0.5">
            {primaryOutputLabel}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-[#64748b]">VALUE</div>
          <div className="font-semibold text-[#34d399] mt-0.5">
            {inspection.landValueLabel}
          </div>
        </div>
      </div>
    </div>
  );
};
