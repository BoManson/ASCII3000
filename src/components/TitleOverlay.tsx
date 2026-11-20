import React from 'react';

interface TitleOverlayProps {
  onStartStarter: () => void;
  onStartBlank: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  onStartStarter,
  onStartBlank,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="title-heading"
      className="absolute inset-0 z-30 flex flex-col justify-between bg-[#080b0f]/86 px-5 py-8"
    >
      {/* Top negative-space terminal hairline */}
      <div className="flex items-center justify-between text-[11px] font-mono text-[#64748b]">
        <span>ASCII URBAN SANDBOX</span>
        <span>UNLIMITED ($∞)</span>
      </div>

      {/* Centered Emblem & Primary Actions */}
      <div className="my-auto flex flex-col items-center text-center">
        {/* Custom inline SVG Phosphor Skyline & Grid Emblem */}
        <svg
          viewBox="0 0 184 68"
          className="w-44 h-auto mb-5"
          aria-hidden="true"
        >
          {/* Base road horizon */}
          <line
            x1="8"
            y1="58"
            x2="176"
            y2="58"
            stroke="#334155"
            strokeWidth="2"
          />
          <line
            x1="16"
            y1="62"
            x2="168"
            y2="62"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />

          {/* Power plant left */}
          <rect
            x="18"
            y="36"
            width="20"
            height="21"
            rx="2"
            fill="#171d26"
            stroke="#fde047"
            strokeWidth="1.5"
          />
          <text
            x="28"
            y="50"
            textAnchor="middle"
            fill="#fde047"
            fontFamily="JetBrains Mono, monospace"
            fontSize="12"
            fontWeight="700"
          >
            P
          </text>

          {/* Power line arc */}
          <text
            x="47"
            y="49"
            textAnchor="middle"
            fill="#eab308"
            fontFamily="JetBrains Mono, monospace"
            fontSize="13"
            fontWeight="700"
          >
            ~
          </text>

          {/* Residential green skyscraper */}
          <rect
            x="56"
            y="14"
            width="24"
            height="43"
            rx="2"
            fill="#0e1f17"
            stroke="#4ade80"
            strokeWidth="1.5"
          />
          <text
            x="68"
            y="39"
            textAnchor="middle"
            fill="#86efac"
            fontFamily="JetBrains Mono, monospace"
            fontSize="15"
            fontWeight="700"
          >
            #
          </text>

          {/* Commercial blue tower */}
          <rect
            x="86"
            y="8"
            width="26"
            height="49"
            rx="2"
            fill="#0e1a2b"
            stroke="#60a5fa"
            strokeWidth="1.5"
          />
          <text
            x="99"
            y="37"
            textAnchor="middle"
            fill="#93c5fd"
            fontFamily="JetBrains Mono, monospace"
            fontSize="16"
            fontWeight="700"
          >
            $
          </text>

          {/* Park emerald */}
          <rect
            x="118"
            y="38"
            width="18"
            height="19"
            rx="2"
            fill="#0d211b"
            stroke="#34d399"
            strokeWidth="1.5"
          />
          <text
            x="127"
            y="51"
            textAnchor="middle"
            fill="#34d399"
            fontFamily="JetBrains Mono, monospace"
            fontSize="12"
            fontWeight="700"
          >
            T
          </text>

          {/* Industrial amber complex */}
          <rect
            x="142"
            y="24"
            width="24"
            height="33"
            rx="2"
            fill="#24170d"
            stroke="#fb923c"
            strokeWidth="1.5"
          />
          <text
            x="154"
            y="45"
            textAnchor="middle"
            fill="#fdba74"
            fontFamily="JetBrains Mono, monospace"
            fontSize="15"
            fontWeight="700"
          >
            %
          </text>
        </svg>

        <h1
          id="title-heading"
          className="font-mono text-3xl font-bold tracking-tight text-[#f8fafc]"
        >
          GRIDLINE 3000
        </h1>

        <p className="mt-2 max-w-[280px] text-sm text-[#94a3b8] leading-relaxed">
          Zone neighborhoods, wire phosphor power grids, and watch ASCII skylines evolve.
        </p>

        {/* Legend strip */}
        <div className="mt-5 flex items-center justify-center gap-3 font-mono text-xs text-[#94a3b8]">
          <span className="text-[#4ade80]">r→# Res</span>
          <span aria-hidden="true" className="text-[#334155]">·</span>
          <span className="text-[#60a5fa]">c→$ Com</span>
          <span aria-hidden="true" className="text-[#334155]">·</span>
          <span className="text-[#fb923c]">i→% Ind</span>
          <span aria-hidden="true" className="text-[#334155]">·</span>
          <span className="text-[#fde047]">P Power</span>
        </div>

        {/* Actions */}
        <div className="mt-7 w-full max-w-[260px] flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onStartStarter}
            className="w-full min-h-[48px] px-5 py-3 rounded-lg bg-[#22c55e] hover:bg-[#4ade80] active:scale-[0.98] text-[#05140a] font-mono text-sm font-bold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]"
          >
            Enter City
          </button>

          <button
            type="button"
            onClick={onStartBlank}
            className="w-full min-h-[44px] px-5 py-2.5 rounded-lg bg-[#111720] hover:bg-[#1a2230] border border-[#263244] text-[#cbd5e1] font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#94a3b8]"
          >
            Start Blank Map
          </button>
        </div>
      </div>

      {/* Single flat bottom control hint */}
      <div className="text-center font-mono text-[11px] text-[#64748b] whitespace-nowrap overflow-hidden text-ellipsis">
        Tap/Drag Build · Pinch Zoom · 1-9 Tools · Enter Start
      </div>
    </div>
  );
};
