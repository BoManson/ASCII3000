import React from 'react';
import { TOOL_BY_ID, TOOLS } from '../game/constants';
import type { ToolId } from '../game/types';

interface BottomToolbarProps {
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  activeTool,
  onSelectTool,
}) => {
  const activeDef = TOOL_BY_ID[activeTool];

  return (
    <nav
      aria-label="City building tools"
      className="shrink-0 bg-[#0d1117] border-t border-[#1f2937] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] select-none"
    >
      {/* 1-line Contextual Tool Guide */}
      <div className="flex items-center justify-between gap-2 px-1 pb-1.5 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="font-bold shrink-0"
            style={{ color: activeDef.accentHex }}
          >
            [{activeDef.symbol}]
          </span>
          <span className="font-semibold text-[#e6edf3] whitespace-nowrap shrink-0">
            {activeDef.fullName}
          </span>
          <span aria-hidden="true" className="text-[#475569] shrink-0">
            ·
          </span>
          <span className="text-[#8b98a8] truncate">{activeDef.hint}</span>
        </div>
      </div>

      {/* Two-row 5-column Thumb Dock (all buttons >= 48px tall, zero truncated labels) */}
      <div className="grid grid-cols-5 gap-1.5">
        {TOOLS.map((tool) => {
          const isSelected = tool.id === activeTool;
          return (
            <button
              key={tool.id}
              type="button"
              aria-label={`${tool.fullName} (${tool.symbol})`}
              aria-pressed={isSelected}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectTool(tool.id);
              }}
              className={`relative flex flex-col items-center justify-center min-h-[48px] px-1 py-1 rounded-md border font-mono transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e6edf3] active:scale-[0.97] ${
                isSelected
                  ? 'bg-[#17202c] text-white'
                  : 'bg-[#10151d] border-[#1f2937] text-[#94a3b8] hover:bg-[#151c27] hover:text-[#e2e8f0]'
              }`}
              style={
                isSelected
                  ? {
                      borderColor: tool.accentHex,
                      boxShadow: `inset 0 -2px 0 0 ${tool.accentHex}`,
                    }
                  : undefined
              }
            >
              <span
                aria-hidden="true"
                className="text-base font-bold leading-none"
                style={{ color: tool.accentHex }}
              >
                {tool.symbol}
              </span>
              <span className="mt-1 text-[11px] font-medium leading-none whitespace-nowrap">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
