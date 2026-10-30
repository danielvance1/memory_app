import { useRef, useState } from "react";
import { MEMORY_GAP } from "../tileSizing";
import CodeComponent from "./CodeComponent";

// The row of codes in the Test Memory game: the current code in the middle at
// full brightness, the previous and next ones beside it at half brightness
// (nothing at all where there isn't one). Moving to another code makes every
// tile glide to its new place, so you see the row slide.
//
// Only a few tiles near the middle are drawn, however long the sequence gets.
// Tiles two places away are drawn invisible, so they can fade out and in as
// they pass.

/** Swiping further than this many pixels counts as a move. */
const SWIPE_DISTANCE = 40;

interface CodeCarouselProps {
  /** The codes made up so far. */
  codes: string[];
  /** Which one is in the middle. */
  index: number;
  /** Width and height of a tile, in pixels. */
  tileSize: number;
  /** Called with the position of the code the user wants in the middle (tapping a neighbor or swiping). */
  onSelect: (index: number) => void;
}

const OFFSETS = [-2, -1, 0, 1, 2];

// One tile. It remembers whether it first appeared as the right-hand neighbor,
// because only then should it slide in from the right; if it simply moves from
// a distant place, the move is a plain glide.
function CarouselTile({
  code,
  offset,
  tileSize,
  onClick,
}: {
  code: string;
  offset: number;
  tileSize: number;
  onClick?: () => void;
}) {
  const [slidesIn] = useState(offset === 1);
  const step = tileSize + MEMORY_GAP;
  const x = offset * step;
  const opacity = offset === 0 ? 1 : Math.abs(offset) === 1 ? 0.5 : 0;

  return (
    <div
      aria-hidden={offset !== 0}
      onClick={onClick}
      className={`carousel-tile absolute left-1/2 top-0 ${slidesIn ? "carousel-enter" : ""} ${
        onClick ? "cursor-pointer" : ""
      }`}
      style={
        {
          width: tileSize,
          height: tileSize,
          opacity,
          transform: `translateX(calc(-50% + ${x}px))`,
          pointerEvents: Math.abs(offset) <= 1 ? "auto" : "none",
          "--x": `${x}px`,
          "--step": `${step}px`,
        } as React.CSSProperties
      }
    >
      <CodeComponent digits={code} isSet size={tileSize} showLabel={false} tabbable={false} />
    </div>
  );
}

export default function CodeCarousel({ codes, index, tileSize, onSelect }: CodeCarouselProps) {
  const swipeStart = useRef<number | null>(null);

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="Codes to memorize"
      className="relative w-full select-none overflow-hidden"
      // pan-y: up and down still scroll the page as usual; sideways movement is ours.
      style={{ height: tileSize, touchAction: "pan-y" }}
      onPointerDown={(e) => {
        swipeStart.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (swipeStart.current === null) return;
        const moved = e.clientX - swipeStart.current;
        swipeStart.current = null;
        if (moved <= -SWIPE_DISTANCE) onSelect(index + 1);
        else if (moved >= SWIPE_DISTANCE) onSelect(index - 1);
      }}
      onPointerCancel={() => {
        swipeStart.current = null;
      }}
    >
      {OFFSETS.map((offset) => {
        const i = index + offset;
        const code = codes[i];
        if (i < 0 || code === undefined) return null; // no previous / next one: an empty space
        return (
          <CarouselTile
            key={i}
            code={code}
            offset={offset}
            tileSize={tileSize}
            onClick={Math.abs(offset) === 1 ? () => onSelect(i) : undefined}
          />
        );
      })}
    </div>
  );
}
