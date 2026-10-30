// One "code" drawn as a square tile with its digits in the middle.
//
//   set code   -> green tile, gray border, gray digits
//   unset code -> gray tile, green border, green digits, and a small "not set" label above the digits
//
// The tile is always a perfect square. You choose how big with `size` and
// everything else (the digits and the label included) scales to fit, so the
// same component works as a big hero tile or a small tile in a grid.
//
// Two layers on purpose: the outer <button> never moves, so it is a stable
// click and hover area. Only the inner tile lifts and brightens on hover.
// If the clickable area moved with the tile, a cursor resting on the edge
// would flip in and out of hover over and over and make the tile shudder.

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

  // Digits take up about 60% of the font size each, so longer codes need a
  // smaller font to stay inside the tile. Capped so 1-2 digit codes aren't huge.
  const digitScale = Math.min(0.55, 1.05 / Math.max(digits.length, 1));

  // The label sits just above the digits. Digit glyphs are about 72% as tall
  // as the font size, so the top of the digits is 0.36 x the font size above
  // the tile's center; the extra 0.08 is the gap between label and digits.
  const labelBottom = `calc(50% + ${length} * ${(digitScale * 0.36 + 0.08).toFixed(3)})`;

  const colors = isSet
    ? "border-slate-700 bg-emerald-500 text-slate-700"
    : "border-emerald-500 bg-slate-700 text-emerald-500";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Code ${digits}, ${isSet ? "set" : "not set yet"}`}
      // width and height come from one number, which is what keeps it square.
      style={{ width: length, height: length }}
      className={`group relative inline-block shrink-0 rounded-[12%] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${className}`}
    >
      {/* The visible tile. On hover it rises 4% of its own height and glows a bit brighter. */}
      <span
        style={{ fontSize: `calc(${length} * ${digitScale})` }}
        className={`relative flex h-full w-full items-center justify-center rounded-[12%] border-2 font-extrabold tabular-nums leading-none transition duration-150 ease-out group-hover:-translate-y-[4%] group-hover:brightness-110 group-active:translate-y-0 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 ${colors}`}
      >
        {!isSet && (
          <span
            aria-hidden="true"
            style={{ bottom: labelBottom, fontSize: `max(0.5rem, calc(${length} * 0.1))` }}
            className="absolute inset-x-0 text-center font-medium leading-none tracking-wide text-slate-400"
          >
            not set
          </span>
        )}
        {digits}
      </span>
    </button>
  );
}
