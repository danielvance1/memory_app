import { useRef } from "react";
import { useNearViewport } from "../useNearViewport";
import CodeComponent from "./CodeComponent";

// A header with a 10-column grid of code tiles under it, for example
// "Double digits: 00-99" over a 10x10 grid. One component serves every group
// of codes (single digits, double digits, each hundred of the triples).
//
// The tiles are placed left to right, then top to bottom, so a grid that
// starts at 0 reads 00 01 02 ... 09 on the first row, 10 11 ... on the second.
//
// The tiles are only built once the section is near the screen (see
// useNearViewport). Until then an empty box of exactly the same height holds
// the space, so the page never jumps when they appear.

export const COLUMNS = 10;
export const GAP = 3; // pixels between tiles

/** How wide a grid is, in pixels, when its tiles are `tileSize` wide. */
export function gridWidth(tileSize: number): number {
  return COLUMNS * tileSize + (COLUMNS - 1) * GAP;
}

interface CodeSectionProps {
  title: string;
  /** The first number in the grid. */
  start: number;
  /** How many tiles to show. */
  count: number;
  /** How many digits each code has; shorter numbers get leading zeros (3 -> "003"). */
  digitWidth: number;
  /** The width and height of every tile, in pixels. */
  tileSize: number;
  /** Whether a code has been set; set tiles are drawn as set. */
  isSet: (digits: string) => boolean;
  /** Called with the tile's digits (like "042") when a tile is tapped. */
  onSelect?: (digits: string) => void;
}

export default function CodeSection({ title, start, count, digitWidth, tileSize, isSet, onSelect }: CodeSectionProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const near = useNearViewport(boxRef);

  const rows = Math.ceil(count / COLUMNS);
  const boxHeight = rows * tileSize + (rows - 1) * GAP;

  return (
    <section aria-label={title} className="mx-auto" style={{ width: gridWidth(tileSize) }}>
      <h2 className="mb-3 text-lg font-semibold text-slate-100">{title}</h2>
      <div ref={boxRef} style={{ height: boxHeight }}>
        {near && (
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${COLUMNS}, ${tileSize}px)`, gap: GAP }}
          >
            {Array.from({ length: count }, (_, i) => {
              const digits = String(start + i).padStart(digitWidth, "0");
              return (
                <CodeComponent
                  key={i}
                  digits={digits}
                  isSet={isSet(digits)}
                  size={tileSize}
                  onClick={onSelect ? () => onSelect(digits) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
