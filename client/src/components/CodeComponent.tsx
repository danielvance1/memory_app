import { useState, type CSSProperties } from "react";
import TypedText from "./TypedText";

// One "code" drawn as a square tile with its digits in the middle.
//
//   set code   -> green tile, gray border, gray digits
//   unset code -> gray tile, green border, green digits
//
// A small label above the digits tells you what the tile is doing:
//
//                 not hovered      hovered
//   set           (nothing)        "click to edit"
//   unset         "not set"        "click to set"
//
// The label types itself out whenever its words change. While a label is
// showing, the digits slide down a little to make room for it.
//
// The tile is always a perfect square. You choose how big with `size` and
// everything else (digits, label, spacing) scales to fit, so the same
// component works as a big hero tile or a small tile in a grid. Tiles
// narrower than SMALLEST_WITH_LABEL px have no room for words, so they skip the label.
//
// Two layers on purpose: the outer <button> never moves, so it is a stable
// click and hover area. Only the inner tile lifts and brightens on hover.
// If the clickable area moved with the tile, a cursor resting on the edge
// would flip in and out of hover over and over and make the tile shudder.
//
// Colors come from client/src/theme.css (accent, tile, muted).

/** Below this width in pixels the label is hidden. Keep in sync with the `@min-[64px]` classes below. */
const SMALLEST_WITH_LABEL = 64;

interface CodeComponentProps {
  /** The digits to show, as text so leading zeros survive ("007"). */
  digits: string;
  /** Whether the user has defined this code yet. */
  isSet: boolean;
  /** Called when the tile is tapped or clicked. */
  onClick?: () => void;
  /** The width and height. A number means pixels; a string is any CSS length like "4rem". */
  size?: number | string;
  className?: string;
}

export default function CodeComponent({ digits, isSet, onClick, size = "4rem", className = "" }: CodeComponentProps) {
  const length = typeof size === "number" ? `${size}px` : size;

  // "Active" means the tile is being pointed at with a mouse or pen, or has
  // keyboard focus. Touch screens have no hovering, so they never count.
  const [pointerOver, setPointerOver] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const active = pointerOver || keyboardFocus;

  const labelText = isSet ? (active ? "click to edit" : "") : active ? "click to set" : "not set";

  // Digits take up about 60% of the font size each, so longer codes need a
  // smaller font to stay inside the tile. Capped so 1-2 digit codes aren't huge.
  const digitScale = Math.min(0.55, 1.05 / Math.max(digits.length, 1));

  // The label sits just above the digits. Digit glyphs are about 72% as tall
  // as the font size, so the top of the digits is 0.36 x the font size above
  // the tile's center; the extra 0.08 is the gap between label and digits.
  const labelBottom = `calc(50% + ${length} * ${(digitScale * 0.36 + 0.08).toFixed(3)})`;

  // The label and digits together are top-heavy, so they slide down by half
  // the label's height plus its gap (0.1 + 0.08, halved) to look centered again.
  const buttonVars = { width: length, height: length, "--shift": `calc(${length} * 0.09)` } as CSSProperties;

  const colors = isSet
    ? "border-tile bg-accent text-tile"
    : "border-accent bg-tile text-accent";
  const labelColor = isSet ? "text-tile/70" : "text-muted";

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={(e) => setPointerOver(e.pointerType !== "touch")}
      onPointerLeave={() => setPointerOver(false)}
      onFocus={(e) => setKeyboardFocus(e.currentTarget.matches(":focus-visible"))}
      onBlur={() => setKeyboardFocus(false)}
      aria-label={`Code ${digits}, ${isSet ? "set" : "not set yet"}`}
      // width and height come from one number, which is what keeps it square.
      style={buttonVars}
      // "@container" lets the @min-[64px] classes inside react to this button's own width.
      className={`group @container relative inline-block shrink-0 rounded-[12%] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${className}`}
    >
      {/* The visible tile. On hover it rises 4% of its own height and glows a bit brighter. */}
      <span
        style={{ fontSize: `calc(${length} * ${digitScale})` }}
        className={`relative flex h-full w-full items-center justify-center rounded-[12%] border-2 font-extrabold tabular-nums leading-none transition duration-150 ease-out group-hover:-translate-y-[4%] group-hover:brightness-110 group-active:translate-y-0 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 ${colors}`}
      >
        {/* Digits and label move together as one block, sliding down when a label is showing. */}
        <span
          className={`absolute inset-0 flex items-center justify-center transition-transform duration-200 ease-out motion-reduce:transition-none ${
            labelText ? "@min-[64px]:translate-y-[var(--shift)]" : ""
          }`}
        >
          {labelText && (
            <span
              style={{ bottom: labelBottom, fontSize: `max(0.5rem, calc(${length} * 0.1))` }}
              className={`absolute inset-x-0 hidden whitespace-nowrap text-center font-medium leading-none tracking-wide @min-[64px]:block ${labelColor}`}
            >
              <TypedText text={labelText} />
            </span>
          )}
          {digits}
        </span>
      </span>
    </button>
  );
}
