// One "code" drawn as a square tile with its digits in the middle.
//
//   set code   -> green tile, gray border, gray digits
//   unset code -> gray tile, green border, green digits
//
// The tile is always a perfect square. You choose how big with `size` and
// everything else (the digits included) scales to fit, so the same component
// works as a big hero tile or a small tile in a grid.

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

  const colors = isSet
    ? "border-slate-700 bg-emerald-500 text-slate-700"
    : "border-emerald-500 bg-slate-700 text-emerald-500";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Code ${digits}, ${isSet ? "set" : "not set yet"}`}
      // width, height and font size all come from one number, which is what keeps it square.
      style={{ width: length, height: length, fontSize: `calc(${length} * ${digitScale})` }}
      className={`inline-flex shrink-0 items-center justify-center rounded-[12%] border-2 font-extrabold tabular-nums leading-none transition duration-150 ease-out hover:-translate-y-1 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${colors} ${className}`}
    >
      {digits}
    </button>
  );
}
