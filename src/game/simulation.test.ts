import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTool,
  createBlankCity,
  createStarterCity,
  getRoadSymbol,
  getTileAscii,
  inspectTile,
  stepSimulation,
} from './simulation';

test('roads auto-connect into -, |, and + symbols', () => {
  let city = createBlankCity('TEST', 10, 10);

  // Horizontal stretch
  city = applyTool(city, 'road', 2, 5).state;
  city = applyTool(city, 'road', 3, 5).state;
  city = applyTool(city, 'road', 4, 5).state;
  assert.equal(getRoadSymbol(city.grid, 2, 5), '-');
  assert.equal(getRoadSymbol(city.grid, 3, 5), '-');
  assert.equal(getRoadSymbol(city.grid, 4, 5), '-');

  // Vertical branch creating a + intersection at (3,5)
  city = applyTool(city, 'road', 3, 4).state;
  city = applyTool(city, 'road', 3, 6).state;
  assert.equal(getRoadSymbol(city.grid, 3, 4), '|');
  assert.equal(getRoadSymbol(city.grid, 3, 5), '+');
  assert.equal(getRoadSymbol(city.grid, 3, 6), '|');
});

test('power radiates from Power Plant through power lines, roads, and zones', () => {
  let city = createBlankCity('TEST', 12, 12);

  city = applyTool(city, 'power_plant', 1, 5).state;
  city = applyTool(city, 'power_line', 2, 5).state;
  city = applyTool(city, 'road', 3, 5).state;
  city = applyTool(city, 'residential', 4, 5).state;
  city = applyTool(city, 'residential', 5, 5).state;
  // Isolated unpowered zone
  city = applyTool(city, 'residential', 9, 9).state;

  assert.equal(city.grid[5][4].powered, true);
  assert.equal(city.grid[5][5].powered, true);
  assert.equal(city.grid[5][4].hasRoadAccess, true);
  assert.equal(city.grid[5][5].hasRoadAccess, false);
  assert.equal(city.grid[9][9].powered, false);
  assert.equal(city.stats.powerCapacity, 120);
  assert.equal(city.stats.unpoweredZones, 1);
});

test('powered road-connected zones evolve across all 4 ASCII stages while unpowered/roadless zones stay at stage 0', () => {
  let city = createBlankCity('TEST', 12, 12);

  // Connected R, C, I with power + road + park
  city = applyTool(city, 'power_plant', 1, 5).state;
  city = applyTool(city, 'road', 2, 5).state;
  city = applyTool(city, 'road', 3, 5).state;
  city = applyTool(city, 'road', 4, 5).state;
  city = applyTool(city, 'residential', 2, 4).state;
  city = applyTool(city, 'commercial', 3, 4).state;
  city = applyTool(city, 'industrial', 4, 4).state;
  city = applyTool(city, 'park', 3, 3).state;

  // Powered via power line, but NO road access
  city = applyTool(city, 'power_line', 1, 6).state;
  city = applyTool(city, 'residential', 1, 7).state;

  // Road access, but NO power
  city = applyTool(city, 'road', 9, 9).state;
  city = applyTool(city, 'residential', 9, 8).state;

  assert.equal(getTileAscii(city.grid, 2, 4), 'r');
  assert.equal(getTileAscii(city.grid, 3, 4), 'c');
  assert.equal(getTileAscii(city.grid, 4, 4), 'i');

  const seenR = new Set<string>([getTileAscii(city.grid, 2, 4)]);
  const seenC = new Set<string>([getTileAscii(city.grid, 3, 4)]);
  const seenI = new Set<string>([getTileAscii(city.grid, 4, 4)]);

  for (let tick = 0; tick < 120; tick++) {
    city = stepSimulation(city, () => 0.5);
    seenR.add(getTileAscii(city.grid, 2, 4));
    seenC.add(getTileAscii(city.grid, 3, 4));
    seenI.add(getTileAscii(city.grid, 4, 4));
  }

  // Verified all 4 stages reached for Residential
  assert.ok(seenR.has('r') && seenR.has('h') && seenR.has('R') && seenR.has('#'), `Expected r,h,R,# got ${[...seenR].join(',')}`);
  // Commercial and Industrial also evolved beyond empty zone
  assert.ok(seenC.has('s') && seenC.has('C'), `Expected commercial growth, got ${[...seenC].join(',')}`);
  assert.ok(seenI.has('w') && seenI.has('I'), `Expected industrial growth, got ${[...seenI].join(',')}`);

  // Roadless and unpowered zones remained undeveloped
  assert.equal(city.grid[7][1].stage, 0);
  assert.equal(city.grid[8][9].stage, 0);
  assert.ok(city.grid[8][9].unpoweredTicks > 0);
  assert.ok(city.stats.population > 0);
  assert.equal(city.year, 2010);
});

test('bulldozer clears tiles back to empty land and inspector returns accurate metadata', () => {
  let city = createStarterCity('BAYVIEW', 20, 20);
  const initialPop = city.stats.population;
  assert.ok(initialPop > 0);

  // Find a developed residential tile in starter city
  let targetX = -1;
  let targetY = -1;
  for (let y = 0; y < city.height; y++) {
    for (let x = 0; x < city.width; x++) {
      if (city.grid[y][x].type === 'residential' && city.grid[y][x].stage > 0) {
        targetX = x;
        targetY = y;
        break;
      }
    }
    if (targetX !== -1) break;
  }

  assert.notEqual(targetX, -1);
  const info = inspectTile(city, targetX, targetY);
  assert.ok(info);
  assert.equal(info.type, 'residential');
  assert.equal(info.powered, true);
  assert.equal(info.hasRoadAccess, true);
  assert.ok(info.population > 0);

  // Bulldoze it
  const result = applyTool(city, 'bulldoze', targetX, targetY);
  assert.equal(result.changed, true);
  city = result.state;
  assert.equal(getTileAscii(city.grid, targetX, targetY), '.');
  assert.ok(city.stats.population < initialPop);
});
