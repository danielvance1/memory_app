// How big the tiles on each screen should be so that everything fits without
// scrolling. These are plain functions of the room available (in pixels), so
// they can be tested without a browser.

export const COLUMNS = 10;
export const GAP = 3; // pixels between tiles in a grid
export const MAX_GRID_TILE = 64;
/** Below this a grid tile is too small to read; the screen scrolls instead of shrinking further. */
export const MIN_GRID_TILE = 16;

/** Height of a grid section's header (28px text line + 12px margin below). Keep in sync with CodeSection. */
export const SECTION_HEADER_HEIGHT = 40;
/** Space between two grid sections. Keep in sync with the `gap-8` on the All Codes page. */
export const SECTION_GAP = 32;

/** The widest a tile can be so ten of them (and nine gaps) fit across `width`. */
export function gridTileSizeForWidth(width: number): number {
  return Math.max(0, Math.min(MAX_GRID_TILE, Math.floor((width - (COLUMNS - 1) * GAP) / COLUMNS)));
}

/** How many rows of tiles each section of the All Codes page has, for a code system. */
export function sectionRowCounts(system: number): number[] {
  const rows: number[] = [];
  if (system >= 1) rows.push(1); // single digits 0-9
  if (system >= 2) rows.push(10); // double digits 00-99
  if (system >= 3) for (let hundred = 0; hundred < 10; hundred++) rows.push(10); // each hundred of the triples
  return rows;
}

/** Total height of the All Codes content when every tile is `tile` pixels. */
export function allCodesContentHeight(system: number, tile: number): number {
  const rows = sectionRowCounts(system);
  const tileRows = rows.reduce((sum, r) => sum + r, 0);
  const rowGaps = rows.reduce((sum, r) => sum + (r - 1) * GAP, 0);
  return tileRows * tile + rowGaps + rows.length * SECTION_HEADER_HEIGHT + (rows.length - 1) * SECTION_GAP;
}

/**
 * Tile size for the All Codes page.
 *  - System 3 and up is allowed to scroll, so only the width matters.
 *  - Systems 1 and 2 should fit entirely: the largest tile that fits the
 *    width and also the height, but never smaller than MIN_GRID_TILE (on a
 *    very short screen the page scrolls rather than become unreadable).
 */
export function allCodesTileSize(width: number, height: number, system: number): number {
  const byWidth = gridTileSizeForWidth(width);
  if (system >= 3) return byWidth;

  let tile = byWidth;
  while (tile > MIN_GRID_TILE && allCodesContentHeight(system, tile) > height) tile -= 1;
  return tile;
}

/** The tile on the Edit screen when no code is being edited: up to a quarter of the height. */
export function idleEditTileSize(width: number, height: number): number {
  return Math.max(0, Math.floor(Math.min(height * 0.25, width)));
}

/** The tile next to (or above) the text box while editing a code. */
export function editingTileSize(width: number, height: number, sideBySide: boolean): number {
  if (sideBySide) return Math.max(0, Math.floor(Math.min(idleEditTileSize(width, height), width * 0.4)));
  return Math.max(0, Math.floor(Math.min(Math.max(height * 0.2, 56), 120, width)));
}

/** The big tile in the drill: scales with the room, between 56px and 160px. */
export function drillTileSize(width: number, height: number): number {
  const wanted = Math.min(width * 0.45, height * 0.3);
  return Math.max(0, Math.floor(Math.min(Math.max(wanted, 56), 160, width)));
}
