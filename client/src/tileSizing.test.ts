import { describe, expect, it } from "vitest";
import {
  GAP,
  MAX_GRID_TILE,
  MIN_GRID_TILE,
  allCodesContentHeight,
  allCodesTileSize,
  drillTileSize,
  editingTileSize,
  gridTileSizeForWidth,
  idleEditTileSize,
  MEMORY_GAP,
  memoryTileSize,
  sectionRowCounts,
} from "./tileSizing";

describe("gridTileSizeForWidth", () => {
  it("makes ten tiles and nine gaps fit across the width", () => {
    for (const width of [272, 300, 342, 500, 700, 976]) {
      const tile = gridTileSizeForWidth(width);
      expect(tile * 10 + 9 * GAP).toBeLessThanOrEqual(width);
    }
  });
  it("is capped on wide screens and never negative", () => {
    expect(gridTileSizeForWidth(2000)).toBe(MAX_GRID_TILE);
    expect(gridTileSizeForWidth(0)).toBe(0);
    expect(gridTileSizeForWidth(10)).toBe(0);
  });
});

describe("sectionRowCounts", () => {
  it("has a section per group of codes", () => {
    expect(sectionRowCounts(1)).toEqual([1]);
    expect(sectionRowCounts(2)).toEqual([1, 10]);
    expect(sectionRowCounts(3)).toEqual([1, 10, ...Array(10).fill(10)]);
  });
});

describe("allCodesContentHeight (checked against hand-worked sums)", () => {
  it("system 1: one header and one row of tiles", () => {
    expect(allCodesContentHeight(1, 24)).toBe(24 + 40);
  });
  it("system 2: two headers, 11 rows of tiles with gaps between the double-digit rows, and a gap between sections", () => {
    // 11 rows x 24 + 9 row gaps x 3 + 2 headers x 40 + 1 section gap x 32
    expect(allCodesContentHeight(2, 24)).toBe(264 + 27 + 80 + 32);
    expect(allCodesContentHeight(2, 20)).toBe(220 + 27 + 80 + 32);
  });
  it("system 3: twelve sections", () => {
    // 1 + 10 + 100 rows x 20 + (9 gaps x 3) x 11 sections + 12 headers x 40 + 11 section gaps x 32
    expect(allCodesContentHeight(3, 20)).toBe(111 * 20 + 11 * 27 + 12 * 40 + 11 * 32);
  });
});

describe("allCodesTileSize", () => {
  it("systems 1 and 2 shrink until the whole page fits the height", () => {
    for (const system of [1, 2]) {
      for (const height of [300, 360, 420, 500, 640, 800]) {
        const tile = allCodesTileSize(272, height, system);
        const fits = allCodesContentHeight(system, tile) <= height;
        // either it fits, or it is already as small as allowed and scrolling takes over
        expect(fits || tile === MIN_GRID_TILE).toBe(true);
      }
    }
  });

  it("uses the width-based size when there is plenty of height", () => {
    expect(allCodesTileSize(272, 5000, 2)).toBe(gridTileSizeForWidth(272));
    expect(allCodesTileSize(272, 5000, 1)).toBe(gridTileSizeForWidth(272));
  });

  it("is as large as it can be: one pixel bigger would not fit", () => {
    for (const height of [330, 400, 450]) {
      const tile = allCodesTileSize(272, height, 2);
      if (tile > MIN_GRID_TILE && tile < gridTileSizeForWidth(272)) {
        expect(allCodesContentHeight(2, tile + 1)).toBeGreaterThan(height);
      }
    }
  });

  it("never goes below the readable minimum, however short the screen", () => {
    expect(allCodesTileSize(272, 50, 2)).toBe(MIN_GRID_TILE);
    expect(allCodesTileSize(272, 0, 1)).toBe(MIN_GRID_TILE);
  });

  it("never exceeds what the width allows", () => {
    expect(allCodesTileSize(272, 5000, 2)).toBeLessThanOrEqual(gridTileSizeForWidth(272));
    expect(allCodesTileSize(100, 5000, 1)).toBeLessThanOrEqual(gridTileSizeForWidth(100));
  });

  it("system 3 and above only cares about the width (the page scrolls)", () => {
    expect(allCodesTileSize(272, 100, 3)).toBe(gridTileSizeForWidth(272));
    expect(allCodesTileSize(272, 5000, 3)).toBe(gridTileSizeForWidth(272));
    expect(allCodesTileSize(272, 100, 4)).toBe(gridTileSizeForWidth(272));
  });
});

describe("edit screen tiles", () => {
  it("idle: at most a quarter of the height and never wider than the area", () => {
    expect(idleEditTileSize(272, 400)).toBe(100);
    expect(idleEditTileSize(50, 4000)).toBe(50);
    expect(idleEditTileSize(272, 0)).toBe(0);
  });

  it("editing, stacked: between 56 and 120 and within the width", () => {
    expect(editingTileSize(272, 200, false)).toBe(56);
    expect(editingTileSize(272, 400, false)).toBe(80);
    expect(editingTileSize(272, 2000, false)).toBe(120);
    expect(editingTileSize(40, 400, false)).toBe(40);
  });

  it("editing, side by side: no more than 40% of the width", () => {
    expect(editingTileSize(1000, 800, true)).toBe(200);
    expect(editingTileSize(600, 800, true)).toBe(200); // a quarter of the height is smaller than 40% of the width
    expect(editingTileSize(600, 1200, true)).toBe(240); // here 40% of the width is the smaller one
    expect(editingTileSize(600, 400, true)).toBe(100);
  });
});

describe("drillTileSize", () => {
  it("scales with the room but stays between 56 and 160", () => {
    expect(drillTileSize(272, 200)).toBe(60);
    expect(drillTileSize(272, 100)).toBe(56);
    expect(drillTileSize(1000, 2000)).toBe(160);
    expect(drillTileSize(272, 600)).toBe(122);
  });
  it("never wider than the area", () => {
    expect(drillTileSize(40, 600)).toBe(40);
  });
});

describe("memoryTileSize", () => {
  it("three tiles and two gaps always fit across the width", () => {
    for (const width of [200, 272, 300, 448, 700]) {
      const tile = memoryTileSize(width, 5000);
      expect(tile * 3 + 2 * MEMORY_GAP).toBeLessThanOrEqual(width);
    }
  });
  it("is capped at 160 and by a bit over a third of the height", () => {
    expect(memoryTileSize(2000, 5000)).toBe(160);
    expect(memoryTileSize(2000, 200)).toBe(70);
    expect(memoryTileSize(272, 5000)).toBe(82);
  });
  it("never negative", () => {
    expect(memoryTileSize(10, 5000)).toBe(0);
    expect(memoryTileSize(272, 0)).toBe(0);
  });
});
