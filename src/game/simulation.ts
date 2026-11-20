import {
  COMMERCIAL_JOBS,
  GRID_HEIGHT,
  GRID_WIDTH,
  INDUSTRIAL_JOBS,
  POWER_PLANT_CAPACITY,
  ZONE_POPULATION,
  ZONE_POWER_DRAW,
  ZONE_STAGE_NAMES,
  ZONE_SYMBOLS,
} from './constants';
import type {
  CityState,
  CityStats,
  RciDemand,
  Tile,
  TileInspection,
  TileType,
  ToolId,
  ZoneType,
} from './types';

const ORTHO_DIRS: readonly [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export function isZoneType(type: TileType): type is ZoneType {
  return type === 'residential' || type === 'commercial' || type === 'industrial';
}

export function isConductiveType(type: TileType): boolean {
  return (
    type === 'power_plant' ||
    type === 'power_line' ||
    type === 'road' ||
    type === 'residential' ||
    type === 'commercial' ||
    type === 'industrial'
  );
}

export function createEmptyTile(type: TileType = 'empty'): Tile {
  return {
    type,
    stage: 0,
    growth: 0,
    powered: false,
    hasRoadAccess: false,
    parkBonus: 0,
    unpoweredTicks: 0,
  };
}

export function createEmptyGrid(width = GRID_WIDTH, height = GRID_HEIGHT): Tile[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => createEmptyTile('empty'))
  );
}

export function cloneGrid(grid: Tile[][]): Tile[][] {
  return grid.map((row) => row.map((tile) => ({ ...tile })));
}

export function inBounds(grid: Tile[][], x: number, y: number): boolean {
  return y >= 0 && y < grid.length && x >= 0 && x < (grid[0]?.length ?? 0);
}

/**
 * Auto-connects road tiles using strictly '-', '|', and '+' based on adjacent road tiles.
 */
export function getRoadSymbol(grid: Tile[][], x: number, y: number): '-' | '|' | '+' {
  const n = inBounds(grid, x, y - 1) && grid[y - 1][x].type === 'road';
  const s = inBounds(grid, x, y + 1) && grid[y + 1][x].type === 'road';
  const w = inBounds(grid, x - 1, y) && grid[y][x - 1].type === 'road';
  const e = inBounds(grid, x + 1, y) && grid[y][x + 1].type === 'road';

  const hasVertical = n || s;
  const hasHorizontal = w || e;

  if (hasVertical && hasHorizontal) return '+';
  if (hasVertical) return '|';
  if (hasHorizontal) return '-';
  return '+';
}

export function getParkSymbol(x: number, y: number): 'T' | '*' {
  return (x * 7 + y * 13) % 4 === 0 ? '*' : 'T';
}

export function getTileAscii(grid: Tile[][], x: number, y: number): string {
  if (!inBounds(grid, x, y)) return '.';
  const tile = grid[y][x];
  switch (tile.type) {
    case 'empty':
      return '.';
    case 'road':
      return getRoadSymbol(grid, x, y);
    case 'power_plant':
      return 'P';
    case 'power_line':
      return '~';
    case 'park':
      return getParkSymbol(x, y);
    case 'residential':
    case 'commercial':
    case 'industrial':
      return ZONE_SYMBOLS[tile.type][tile.stage];
  }
}

export function getTilePowerDraw(tile: Tile): number {
  if (isZoneType(tile.type)) {
    return ZONE_POWER_DRAW[tile.stage];
  }
  return 0;
}

/**
 * Computes road access, nearby park bonus (Manhattan radius <= 3), and
 * BFS power propagation from every Power Plant across roads, power lines, and zones,
 * respecting total power plant MW capacity.
 */
export function computeConnectivityAndPower(grid: Tile[][]): {
  powerUsed: number;
  powerCapacity: number;
} {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  const plants: [number, number][] = [];
  const parks: [number, number][] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = grid[y][x];
      tile.powered = false;
      tile.hasRoadAccess = false;
      tile.parkBonus = 0;

      if (tile.type === 'power_plant') {
        plants.push([x, y]);
      } else if (tile.type === 'park') {
        parks.push([x, y]);
      }
    }
  }

  // Road access & park proximity bonus
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = grid[y][x];
      if (isZoneType(tile.type)) {
        for (const [dx, dy] of ORTHO_DIRS) {
          const nx = x + dx;
          const ny = y + dy;
          if (inBounds(grid, nx, ny) && grid[ny][nx].type === 'road') {
            tile.hasRoadAccess = true;
            break;
          }
        }
      }

      if (parks.length > 0 && tile.type !== 'empty') {
        let bonus = 0;
        for (const [px, py] of parks) {
          const dist = Math.abs(px - x) + Math.abs(py - y);
          if (dist > 0 && dist <= 3) {
            bonus += 1;
          }
        }
        tile.parkBonus = bonus;
      }
    }
  }

  // Power BFS per connected network so isolated subgrids only draw from their own plants
  const visited = Array.from({ length: height }, () => new Uint8Array(width));
  let totalCapacity = 0;
  let totalUsed = 0;

  for (const [startX, startY] of plants) {
    if (visited[startY][startX]) continue;

    // Discover entire connected conductive component in BFS order from all plants in it
    const component: [number, number][] = [];
    const queue: [number, number][] = [[startX, startY]];
    visited[startY][startX] = 1;
    let head = 0;
    let componentPlants = 0;

    while (head < queue.length) {
      const [cx, cy] = queue[head++];
      component.push([cx, cy]);
      if (grid[cy][cx].type === 'power_plant') {
        componentPlants++;
      }

      for (const [dx, dy] of ORTHO_DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (
          inBounds(grid, nx, ny) &&
          !visited[ny][nx] &&
          isConductiveType(grid[ny][nx].type)
        ) {
          visited[ny][nx] = 1;
          queue.push([nx, ny]);
        }
      }
    }

    // Re-run multi-source BFS from ALL plants in this component so nearest zones get power first
    const distVisited = new Set<number>();
    const multiQueue: [number, number][] = [];
    for (const [cx, cy] of component) {
      if (grid[cy][cx].type === 'power_plant') {
        multiQueue.push([cx, cy]);
        distVisited.add(cy * width + cx);
      }
    }

    const componentCapacity = componentPlants * POWER_PLANT_CAPACITY;
    totalCapacity += componentCapacity;
    let remaining = componentCapacity;
    let mHead = 0;

    while (mHead < multiQueue.length) {
      const [cx, cy] = multiQueue[mHead++];
      const tile = grid[cy][cx];
      const draw = getTilePowerDraw(tile);

      if (draw === 0) {
        tile.powered = true;
      } else if (remaining >= draw) {
        tile.powered = true;
        remaining -= draw;
        totalUsed += draw;
      } else {
        tile.powered = false;
      }

      for (const [dx, dy] of ORTHO_DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = ny * width + nx;
        if (
          inBounds(grid, nx, ny) &&
          !distVisited.has(key) &&
          isConductiveType(grid[ny][nx].type)
        ) {
          distVisited.add(key);
          multiQueue.push([nx, ny]);
        }
      }
    }
  }

  return { powerUsed: totalUsed, powerCapacity: totalCapacity };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeStatsAndDemand(
  grid: Tile[][],
  powerUsed: number,
  powerCapacity: number
): { stats: CityStats; demand: RciDemand } {
  let population = 0;
  let commercialJobs = 0;
  let industrialJobs = 0;
  let totalZones = 0;
  let poweredZones = 0;
  let unpoweredZones = 0;
  let roadConnectedZones = 0;
  let parkCoverageSum = 0;
  let industrialPollutionHits = 0;

  const zoneCounts = {
    residential: 0,
    commercial: 0,
    industrial: 0,
    roads: 0,
    powerPlants: 0,
    parks: 0,
  };

  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = grid[y][x];
      if (tile.type === 'road') zoneCounts.roads++;
      else if (tile.type === 'power_plant') zoneCounts.powerPlants++;
      else if (tile.type === 'park') zoneCounts.parks++;
      else if (isZoneType(tile.type)) {
        zoneCounts[tile.type]++;
        totalZones++;
        if (tile.powered) poweredZones++;
        else unpoweredZones++;
        if (tile.hasRoadAccess) roadConnectedZones++;
        if (tile.parkBonus > 0) parkCoverageSum++;

        if (tile.type === 'residential') {
          population += ZONE_POPULATION[tile.stage];
          // Check adjacent industrial pollution
          for (const [dx, dy] of ORTHO_DIRS) {
            const nx = x + dx;
            const ny = y + dy;
            if (inBounds(grid, nx, ny) && grid[ny][nx].type === 'industrial') {
              industrialPollutionHits++;
              break;
            }
          }
        } else if (tile.type === 'commercial') {
          commercialJobs += COMMERCIAL_JOBS[tile.stage];
        } else if (tile.type === 'industrial') {
          industrialJobs += INDUSTRIAL_JOBS[tile.stage];
        }
      }
    }
  }

  const jobs = commercialJobs + industrialJobs;

  // Happiness (0..100)
  let happiness = 72;
  if (totalZones > 0) {
    const powerRatio = poweredZones / totalZones;
    const roadRatio = roadConnectedZones / totalZones;
    const parkRatio = parkCoverageSum / totalZones;

    happiness =
      52 +
      powerRatio * 24 +
      roadRatio * 10 +
      Math.min(14, parkRatio * 22) -
      Math.min(18, industrialPollutionHits * 3);

    if (population > 0 && jobs > 0) {
      const ratio = jobs / Math.max(1, population * 0.75);
      if (ratio >= 0.7 && ratio <= 1.5) happiness += 5;
      else if (ratio < 0.4) happiness -= 8;
    }
  }
  happiness = Math.round(clamp(happiness, 15, 100));

  // RCI Demand (0..100, where >= 50 means positive growth pressure)
  const workforce = population * 0.72;
  const rTarget =
    population < 40
      ? 78
      : clamp(
          58 + (jobs - workforce) * 0.45 + (happiness - 65) * 0.4 - zoneCounts.residential * 0.4,
          18,
          98
        );

  const cTarget =
    population < 25
      ? 58
      : clamp(
          50 +
            (population * 0.45 - commercialJobs) * 0.55 +
            (industrialJobs > 0 ? 8 : -4) +
            (happiness - 60) * 0.25,
          15,
          96
        );

  const iTarget =
    industrialJobs < 30
      ? 74
      : clamp(
          54 + (workforce * 0.65 - industrialJobs) * 0.5 + (commercialJobs * 0.35 - industrialJobs * 0.2),
          15,
          96
        );

  const demand: RciDemand = {
    residential: Math.round(rTarget),
    commercial: Math.round(cTarget),
    industrial: Math.round(iTarget),
  };

  let status = 'Founding';
  if (totalZones > 0 && unpoweredZones > totalZones * 0.45) {
    status = 'Blackout';
  } else if (population >= 1500 && happiness >= 75) {
    status = 'Metropolis';
  } else if (population >= 500 && happiness >= 70) {
    status = 'Booming';
  } else if (population >= 100 && happiness >= 65) {
    status = 'Thriving';
  } else if (population > 0) {
    status = happiness >= 55 ? 'Growing' : 'Strained';
  }

  return {
    stats: {
      population,
      jobs,
      commercialJobs,
      industrialJobs,
      powerUsed,
      powerCapacity,
      happiness,
      status,
      unpoweredZones,
      zoneCounts,
    },
    demand,
  };
}

export function recalculateCity(state: CityState): CityState {
  const grid = cloneGrid(state.grid);
  const { powerUsed, powerCapacity } = computeConnectivityAndPower(grid);
  const { stats, demand } = computeStatsAndDemand(grid, powerUsed, powerCapacity);

  return {
    ...state,
    grid,
    stats,
    demand,
  };
}

export function createBlankCity(name = 'VERIDIAN 3000', width = GRID_WIDTH, height = GRID_HEIGHT): CityState {
  const grid = createEmptyGrid(width, height);
  const base: CityState = {
    name,
    width,
    height,
    month: 0,
    year: 2000,
    tickCount: 0,
    grid,
    demand: { residential: 78, commercial: 58, industrial: 74 },
    stats: {
      population: 0,
      jobs: 0,
      commercialJobs: 0,
      industrialJobs: 0,
      powerUsed: 0,
      powerCapacity: 0,
      happiness: 72,
      status: 'Founding',
      unpoweredZones: 0,
      zoneCounts: {
        residential: 0,
        commercial: 0,
        industrial: 0,
        roads: 0,
        powerPlants: 0,
        parks: 0,
      },
    },
  };
  return recalculateCity(base);
}

/**
 * Seeds a compact, active starter neighborhood in the center of the map so
 * the city looks alive immediately while leaving ample empty land to expand.
 */
export function createStarterCity(name = 'VERIDIAN 3000', width = GRID_WIDTH, height = GRID_HEIGHT): CityState {
  const state = createBlankCity(name, width, height);
  const grid = cloneGrid(state.grid);

  const ox = Math.floor(width / 2) - 5;
  const oy = Math.floor(height / 2) - 4;

  const setTile = (dx: number, dy: number, type: TileType, stage: 0 | 1 | 2 | 3 = 0) => {
    const x = ox + dx;
    const y = oy + dy;
    if (!inBounds(grid, x, y)) return;
    grid[y][x] = {
      ...createEmptyTile(type),
      stage,
    };
  };

  // Power Plant + Power Line feeding the district
  setTile(0, 1, 'power_plant');
  setTile(1, 1, 'power_line');

  // Main road grid (compact block with avenue)
  for (let x = 2; x <= 9; x++) {
    setTile(x, 1, 'road');
    setTile(x, 4, 'road');
    setTile(x, 7, 'road');
  }
  for (let y = 1; y <= 7; y++) {
    setTile(2, y, 'road');
    setTile(6, y, 'road');
    setTile(9, y, 'road');
  }

  // Residential district (top-left block)
  setTile(3, 2, 'residential', 1);
  setTile(4, 2, 'residential', 2);
  setTile(5, 2, 'residential', 1);
  setTile(3, 3, 'residential', 1);
  setTile(4, 3, 'park');
  setTile(5, 3, 'residential', 0);

  // Commercial core (right block)
  setTile(7, 2, 'commercial', 1);
  setTile(8, 2, 'commercial', 1);
  setTile(7, 3, 'commercial', 0);
  setTile(8, 3, 'park');

  // Industrial district (lower-left block)
  setTile(3, 5, 'industrial', 1);
  setTile(4, 5, 'industrial', 1);
  setTile(5, 5, 'industrial', 0);
  setTile(3, 6, 'industrial', 1);
  setTile(4, 6, 'industrial', 0);

  // Small park plaza on lower-right
  setTile(7, 5, 'park');
  setTile(8, 5, 'residential', 0);
  setTile(7, 6, 'commercial', 0);

  return recalculateCity({
    ...state,
    grid,
  });
}

export function applyTool(
  state: CityState,
  tool: ToolId,
  x: number,
  y: number
): { state: CityState; changed: boolean } {
  if (!inBounds(state.grid, x, y)) {
    return { state, changed: false };
  }
  if (tool === 'inspect' || tool === 'pan') {
    return { state, changed: false };
  }

  const current = state.grid[y][x];
  const targetType: TileType = tool === 'bulldoze' ? 'empty' : tool;

  if (current.type === targetType) {
    return { state, changed: false };
  }

  // Only allow placing on empty tiles unless bulldozing (or replacing power_line with road)
  if (
    tool !== 'bulldoze' &&
    current.type !== 'empty' &&
    !(tool === 'road' && current.type === 'power_line')
  ) {
    return { state, changed: false };
  }

  const grid = cloneGrid(state.grid);
  grid[y][x] = createEmptyTile(targetType);

  const { powerUsed, powerCapacity } = computeConnectivityAndPower(grid);
  const { stats, demand } = computeStatsAndDemand(grid, powerUsed, powerCapacity);

  return {
    state: {
      ...state,
      grid,
      stats,
      demand,
    },
    changed: true,
  };
}

/**
 * Advances the simulation by one tick (1 in-game month):
 * 1. Recalculates power connectivity and road access.
 * 2. Updates unpowered warning counters.
 * 3. Evolves powered, road-connected zones across 4 ASCII stages (0 -> 1 -> 2 -> 3)
 *    driven by RCI demand and nearby parks.
 */
export function stepSimulation(state: CityState, rng: () => number = Math.random): CityState {
  const grid = cloneGrid(state.grid);
  const { powerUsed, powerCapacity } = computeConnectivityAndPower(grid);
  const { demand } = computeStatsAndDemand(grid, powerUsed, powerCapacity);

  const nextMonthRaw = state.month + 1;
  const month = nextMonthRaw % 12;
  const year = state.year + Math.floor(nextMonthRaw / 12);

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const tile = grid[y][x];
      if (!isZoneType(tile.type)) continue;

      if (!tile.powered) {
        tile.unpoweredTicks += 1;
        continue;
      }

      tile.unpoweredTicks = 0;

      if (!tile.hasRoadAccess) {
        continue;
      }

      if (tile.stage >= 3) {
        tile.growth = 100;
        continue;
      }

      const zoneDemand = demand[tile.type];
      if (zoneDemand < 42) {
        continue;
      }

      // Growth rate based on RCI demand, park land-value bonus, and stage difficulty
      const demandFactor = (zoneDemand - 36) * 0.44;
      const parkFactor = tile.parkBonus * 5.5;
      const stageResistance = tile.stage === 0 ? 1.4 : tile.stage === 1 ? 0.55 : 0.28;
      const jitter = 0.72 + rng() * 0.56;

      // Stage 3 skyscrapers strongly favor parks or high demand
      const canReachStage3 = tile.stage < 2 || tile.parkBonus > 0 || zoneDemand >= 68;
      if (!canReachStage3) {
        tile.growth = Math.min(80, tile.growth + 3);
        continue;
      }

      tile.growth += (demandFactor + parkFactor) * stageResistance * jitter;

      if (tile.growth >= 100) {
        tile.stage = Math.min(3, tile.stage + 1) as 0 | 1 | 2 | 3;
        tile.growth = 0;
      }
    }
  }

  // Recompute power & stats after any stage promotions so HUD reflects new population/jobs/power draw immediately
  const postPower = computeConnectivityAndPower(grid);
  const postCalc = computeStatsAndDemand(grid, postPower.powerUsed, postPower.powerCapacity);

  return {
    ...state,
    month,
    year,
    tickCount: state.tickCount + 1,
    grid,
    stats: postCalc.stats,
    demand: postCalc.demand,
  };
}

export function inspectTile(state: CityState, x: number, y: number): TileInspection | null {
  if (!inBounds(state.grid, x, y)) return null;
  const tile = state.grid[y][x];
  const symbol = getTileAscii(state.grid, x, y);

  let typeLabel = 'Empty Land';
  let stageLabel = 'Undeveloped Terrain';
  let population = 0;
  let jobs = 0;
  let powerOutput = 0;

  switch (tile.type) {
    case 'empty':
      typeLabel = 'Empty Land';
      stageLabel = 'Ready to Zone';
      break;
    case 'road':
      typeLabel = 'Roadway';
      stageLabel = 'Transit & Power Conduit';
      break;
    case 'power_plant':
      typeLabel = 'Power Plant';
      stageLabel = 'Generator Station';
      powerOutput = POWER_PLANT_CAPACITY;
      break;
    case 'power_line':
      typeLabel = 'Power Line';
      stageLabel = 'High-Voltage Conduit';
      break;
    case 'park':
      typeLabel = 'Park & Trees';
      stageLabel = 'Land Value Booster';
      break;
    case 'residential':
      typeLabel = 'Residential';
      stageLabel = ZONE_STAGE_NAMES.residential[tile.stage];
      population = ZONE_POPULATION[tile.stage];
      break;
    case 'commercial':
      typeLabel = 'Commercial';
      stageLabel = ZONE_STAGE_NAMES.commercial[tile.stage];
      jobs = COMMERCIAL_JOBS[tile.stage];
      break;
    case 'industrial':
      typeLabel = 'Industrial';
      stageLabel = ZONE_STAGE_NAMES.industrial[tile.stage];
      jobs = INDUSTRIAL_JOBS[tile.stage];
      break;
  }

  const landValueLabel =
    tile.parkBonus >= 2 ? 'Prime' : tile.parkBonus === 1 ? 'High' : 'Standard';

  return {
    x,
    y,
    symbol,
    type: tile.type,
    typeLabel,
    stage: tile.stage,
    maxStage: isZoneType(tile.type) ? 3 : 0,
    stageLabel,
    isZone: isZoneType(tile.type),
    powered: tile.powered,
    hasRoadAccess: tile.hasRoadAccess,
    parkBonus: tile.parkBonus,
    landValueLabel,
    population,
    jobs,
    powerDraw: getTilePowerDraw(tile),
    powerOutput,
    growthPercent: Math.round(clamp(tile.growth, 0, 100)),
  };
}
