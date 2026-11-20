/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AsciiMapCanvas } from './components/AsciiMapCanvas';
import { BottomToolbar } from './components/BottomToolbar';
import { CityMenuModal } from './components/CityMenuModal';
import { InspectorToast } from './components/InspectorToast';
import { TitleOverlay } from './components/TitleOverlay';
import { TopHud } from './components/TopHud';
import { terminalAudio } from './game/audio';
import { TOOLS } from './game/constants';
import {
  applyTool,
  createBlankCity,
  createStarterCity,
  inspectTile,
  stepSimulation,
} from './game/simulation';
import type { CityState, GamePhase, SimSpeed, ToolId } from './game/types';

function shouldAutostart(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('autostart') === '1';
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>(() =>
    shouldAutostart() ? 'playing' : 'title'
  );
  const [city, setCity] = useState<CityState>(() => createStarterCity('VERIDIAN 3000'));
  const [activeTool, setActiveTool] = useState<ToolId>('residential');
  const [speed, setSpeed] = useState<SimSpeed>(1);
  const [inspectedCoords, setInspectedCoords] = useState<{ x: number; y: number } | null>(null);
  const [muted, setMuted] = useState(false);

  const cityRef = useRef(city);
  cityRef.current = city;

  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  // Mirror game phase onto document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = phase;
  }, [phase]);

  // Simulation tick loop (1.5s at 1x, 0.75s at 2x, paused at 0)
  useEffect(() => {
    if (phase !== 'playing' || speed === 0) return;
    const intervalMs = speed === 2 ? 750 : 1500;
    const timer = window.setInterval(() => {
      setCity((prev) => stepSimulation(prev));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [phase, speed]);

  // Global keyboard shortcuts (Enter/Space on title, Esc/P for menu, 1-9/0 for tools)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (phase === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          terminalAudio.playUiClick();
          setPhase('playing');
        }
        return;
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setPhase((prev) => (prev === 'paused' ? 'playing' : 'paused'));
        return;
      }

      if (phase !== 'playing') return;

      const matchedTool = TOOLS.find((t) => t.hotkey === e.key);
      if (matchedTool) {
        setActiveTool(matchedTool.id);
        terminalAudio.playUiClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  const handleStartStarter = useCallback(() => {
    terminalAudio.playUiClick();
    setPhase('playing');
  }, []);

  const handleStartBlank = useCallback(() => {
    terminalAudio.playUiClick();
    setCity(createBlankCity('VERIDIAN 3000'));
    setInspectedCoords(null);
    setPhase('playing');
  }, []);

  const handlePaintTile = useCallback((x: number, y: number): boolean => {
    const tool = activeToolRef.current;
    const result = applyTool(cityRef.current, tool, x, y);
    if (!result.changed) return false;

    cityRef.current = result.state;
    setCity(result.state);

    if (tool === 'bulldoze') {
      terminalAudio.playBulldoze();
    } else if (tool === 'power_plant' || tool === 'power_line') {
      terminalAudio.playPlace('power');
    } else if (tool === 'road') {
      terminalAudio.playPlace('road');
    } else if (tool === 'park') {
      terminalAudio.playPlace('park');
    } else {
      terminalAudio.playPlace('zone');
    }

    return true;
  }, []);

  const handleInspectTile = useCallback((x: number, y: number) => {
    terminalAudio.playInspect();
    setInspectedCoords({ x, y });
  }, []);

  const handleBulldozeFromInspector = useCallback((x: number, y: number) => {
    const result = applyTool(cityRef.current, 'bulldoze', x, y);
    if (result.changed) {
      terminalAudio.playBulldoze();
      cityRef.current = result.state;
      setCity(result.state);
    }
  }, []);

  const handleSelectTool = useCallback((tool: ToolId) => {
    terminalAudio.playUiClick();
    setActiveTool(tool);
    if (tool !== 'inspect') {
      setInspectedCoords(null);
    }
  }, []);

  const handleChangeSpeed = useCallback((nextSpeed: SimSpeed) => {
    terminalAudio.playUiClick();
    setSpeed(nextSpeed);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      terminalAudio.setMuted(next);
      return next;
    });
  }, []);

  const inspection = useMemo(() => {
    if (!inspectedCoords) return null;
    return inspectTile(city, inspectedCoords.x, inspectedCoords.y);
  }, [city, inspectedCoords]);

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-[#05070a] flex items-center justify-center md:p-4">
      {/* Mobile-first Portrait Shell (fills 100% on phone, centered console on desktop) */}
      <main className="relative flex flex-col w-full h-full md:max-w-[460px] lg:max-w-[500px] md:h-[min(94dvh,880px)] bg-[#080b0f] md:rounded-2xl md:border md:border-[#1e293b] md:shadow-[0_24px_80px_rgba(0,0,0,0.75)] overflow-hidden">
        {phase !== 'title' && (
          <TopHud
            city={city}
            speed={speed}
            onChangeSpeed={handleChangeSpeed}
            onOpenMenu={() => {
              terminalAudio.playUiClick();
              setPhase('paused');
            }}
          />
        )}

        {/* Interactive ASCII Map Viewport + Floating Inspector Toast */}
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          <AsciiMapCanvas
            city={city}
            activeTool={activeTool}
            inspectedCoords={inspectedCoords}
            interactive={phase === 'playing'}
            onPaintTile={handlePaintTile}
            onInspectTile={handleInspectTile}
          />

          {phase === 'playing' && inspection && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
              <InspectorToast
                inspection={inspection}
                onClose={() => setInspectedCoords(null)}
                onBulldozeTile={handleBulldozeFromInspector}
              />
            </div>
          )}
        </div>

        {phase !== 'title' && (
          <BottomToolbar activeTool={activeTool} onSelectTool={handleSelectTool} />
        )}

        {/* Live-World Title Screen Overlay */}
        {phase === 'title' && (
          <TitleOverlay
            onStartStarter={handleStartStarter}
            onStartBlank={handleStartBlank}
          />
        )}

        {/* City Console / Pause Modal */}
        {phase === 'paused' && (
          <CityMenuModal
            city={city}
            muted={muted}
            onToggleMute={handleToggleMute}
            onRenameCity={(name) => setCity((prev) => ({ ...prev, name }))}
            onResetStarter={() => {
              terminalAudio.playUiClick();
              setCity(createStarterCity(city.name));
              setInspectedCoords(null);
              setPhase('playing');
            }}
            onClearBlank={() => {
              terminalAudio.playBulldoze();
              setCity(createBlankCity(city.name));
              setInspectedCoords(null);
              setPhase('playing');
            }}
            onResume={() => {
              terminalAudio.playUiClick();
              setPhase('playing');
            }}
          />
        )}
      </main>
    </div>
  );
}
