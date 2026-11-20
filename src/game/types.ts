export type TileType =
  | 'empty'
  | 'road'
  | 'power_plant'
  | 'power_line'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'park';

export type ZoneType = 'residential' | 'commercial' | 'industrial';

export type ToolId =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'road'
  | 'power_plant'
  | 'power_line'
  | 'park'
  | 'bulldoze'
  | 'inspect'
  | 'pan';

export type SimSpeed = 0 | 1 | 2;

export type GamePhase = 'title' | 'playing' | 'paused';

export interface Tile {
  type: TileType;
  /** 0 = empty zone, 1 = small, 2 = medium, 3 = high-rise/complex */
  stage: 0 | 1 | 2 | 3;
  /** Fractional growth accumulator (0..100) toward next stage */
  growth: number;
  /** Connected to a power plant within grid capacity */
  powered: boolean;
  /** Adjacent (4-way) to at least one road tile */
  hasRoadAccess: boolean;
  /** Number of parks within Manhattan distance 3 */
  parkBonus: number;
  /** Ticks spent unpowered (for warning stability) */
  unpoweredTicks: number;
}

export interface RciDemand {
  /** 0..100 demand bar value (50 = neutral, >50 = growth demand) */
  residential: number;
  commercial: number;
  industrial: number;
}

export interface CityStats {
  population: number;
  jobs: number;
  commercialJobs: number;
  industrialJobs: number;
  powerUsed: number;
  powerCapacity: number;
  happiness: number;
  status: string;
  unpoweredZones: number;
  zoneCounts: {
    residential: number;
    commercial: number;
    industrial: number;
    roads: number;
    powerPlants: number;
    parks: number;
  };
}

export interface CityState {
  name: string;
  width: number;
  height: number;
  /** 0-based month (0 = JAN, 11 = DEC) */
  month: number;
  year: number;
  tickCount: number;
  grid: Tile[][];
  demand: RciDemand;
  stats: CityStats;
}

export interface TileInspection {
  x: number;
  y: number;
  symbol: string;
  type: TileType;
  typeLabel: string;
  stage: number;
  maxStage: number;
  stageLabel: string;
  isZone: boolean;
  powered: boolean;
  hasRoadAccess: boolean;
  parkBonus: number;
  landValueLabel: string;
  population: number;
  jobs: number;
  powerDraw: number;
  powerOutput: number;
  growthPercent: number;
}

export interface ToolDefinition {
  id: ToolId;
  symbol: string;
  label: string;
  fullName: string;
  hint: string;
  accentHex: string;
  hotkey: string;
}
