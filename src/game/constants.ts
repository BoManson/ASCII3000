import type { TileType, ToolDefinition, ZoneType } from './types';

export const GRID_WIDTH = 26;
export const GRID_HEIGHT = 26;

export const POWER_PLANT_CAPACITY = 120;

export const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

export const ZONE_SYMBOLS: Record<ZoneType, readonly [string, string, string, string]> = {
  residential: ['r', 'h', 'R', '#'],
  commercial: ['c', 's', 'C', '$'],
  industrial: ['i', 'w', 'I', '%'],
};

export const ZONE_STAGE_NAMES: Record<ZoneType, readonly [string, string, string, string]> = {
  residential: ['Empty Res Zone', 'Small House', 'Apartments', 'Skyscraper'],
  commercial: ['Empty Com Zone', 'Corner Shop', 'Office Block', 'Commerce Tower'],
  industrial: ['Empty Ind Zone', 'Workshop', 'Factory', 'Industrial Complex'],
};

export const ZONE_POPULATION: readonly [number, number, number, number] = [0, 12, 54, 185];
export const COMMERCIAL_JOBS: readonly [number, number, number, number] = [0, 10, 42, 145];
export const INDUSTRIAL_JOBS: readonly [number, number, number, number] = [0, 14, 52, 165];
export const ZONE_POWER_DRAW: readonly [number, number, number, number] = [1, 2, 5, 10];

export const TILE_COLORS: Record<TileType, string> = {
  empty: '#353e4d',
  road: '#9aa7b8',
  power_plant: '#fde047',
  power_line: '#eab308',
  residential: '#4ade80',
  commercial: '#60a5fa',
  industrial: '#fb923c',
  park: '#34d399',
};

export const STAGE_COLORS: Record<ZoneType, readonly [string, string, string, string]> = {
  residential: ['#22864b', '#34d374', '#4ade80', '#86efac'],
  commercial: ['#2f6cb0', '#4d93e8', '#60a5fa', '#93c5fd'],
  industrial: ['#a65a24', '#dd7c2e', '#fb923c', '#fdba74'],
};

export const TOOLS: readonly ToolDefinition[] = [
  {
    id: 'residential',
    symbol: 'r',
    label: 'Res',
    fullName: 'Residential',
    hint: 'r → h → R → # housing',
    accentHex: '#4ade80',
    hotkey: '1',
  },
  {
    id: 'commercial',
    symbol: 'c',
    label: 'Com',
    fullName: 'Commercial',
    hint: 'c → s → C → $ shops & offices',
    accentHex: '#60a5fa',
    hotkey: '2',
  },
  {
    id: 'industrial',
    symbol: 'i',
    label: 'Ind',
    fullName: 'Industrial',
    hint: 'i → w → I → % factories',
    accentHex: '#fb923c',
    hotkey: '3',
  },
  {
    id: 'road',
    symbol: '+',
    label: 'Road',
    fullName: 'Roadway',
    hint: 'Auto-connects (- | +)',
    accentHex: '#cbd5e1',
    hotkey: '4',
  },
  {
    id: 'power_plant',
    symbol: 'P',
    label: 'Plant',
    fullName: 'Power Plant',
    hint: '+120 MW grid generator',
    accentHex: '#fde047',
    hotkey: '5',
  },
  {
    id: 'power_line',
    symbol: '~',
    label: 'Line',
    fullName: 'Power Line',
    hint: 'Carries power over land',
    accentHex: '#eab308',
    hotkey: '6',
  },
  {
    id: 'park',
    symbol: 'T',
    label: 'Park',
    fullName: 'Park & Trees',
    hint: 'Boosts nearby land value',
    accentHex: '#34d399',
    hotkey: '7',
  },
  {
    id: 'bulldoze',
    symbol: 'X',
    label: 'Doze',
    fullName: 'Bulldozer',
    hint: 'Clears any tile back to .',
    accentHex: '#f87171',
    hotkey: '8',
  },
  {
    id: 'inspect',
    symbol: '?',
    label: 'Info',
    fullName: 'Inspect Tile',
    hint: 'Tap any tile for details',
    accentHex: '#38bdf8',
    hotkey: '9',
  },
  {
    id: 'pan',
    symbol: '✥',
    label: 'Pan',
    fullName: 'Pan Camera',
    hint: 'Drag to scroll · Pinch zoom',
    accentHex: '#94a3b8',
    hotkey: '0',
  },
];

export const TOOL_BY_ID: Record<string, ToolDefinition> = Object.fromEntries(
  TOOLS.map((tool) => [tool.id, tool])
);
