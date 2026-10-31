import { useEffect, useRef, type ReactNode } from "react";
import CodeComponent from "./CodeComponent";

// The comparison shown after a Test Memory round: a row of the codes that were
// actually shown, and under it a row of what the user typed, lined up position
// by position. One box holds both rows, so scrolling left or right moves them
// together and every typed code stays under the code it was meant to be. Under
// each pair is a mark: ✓ right, ✗ wrong, — not typed. The row names stay in
// view on the left while the codes scroll under them.
//
// (The box is `relative` on purpose: the hidden screen-reader words in it ("correct", "wrong")
// are absolutely positioned, and without this they escape the box's clipping and make the
// whole page scroll sideways.)
//
// A typed code is drawn as set only if it really is one of the user's set codes;
// otherwise it is drawn in the gray "not set" style (a hint that it was a guess).

const TILE = 48;
const LABEL_WIDTH = 88;
const GAP = 6; // between columns
const ROW_GAP = 8; // between rows (room for the rings around the tiles)

interface RecallComparisonProps {
  /** The codes that were shown, in order. */
  shown: string[];
  /** The codes the user typed, in order. */
  placed: string[];
  /** Whether a code is one the user has actually set. */
  isSet: (code: string) => boolean;
}

// A gap in a row: no code shown there, or none typed there.
function Empty({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className=" border-2 border-dashed border-line"
      style={{ width: TILE, height: TILE }}
    />
  );
}

// A row name that stays at the left edge while the codes scroll under it. It fills the whole height of
// its row and the box has no padding on the left (the label brings its own), so nothing shows through beside it.
function RowLabel({ children }: { children?: ReactNode }) {
  return (
    <div className="sticky left-0 z-10 -my-1 flex items-center self-stretch bg-canvas py-1 pl-2 pr-2 text-sm font-semibold text-fg">
      {children}
    </div>
  );
}

export default function RecallComparison({ shown, placed, isSet }: RecallComparisonProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const count = Math.max(shown.length, placed.length);

  // A mouse wheel turns the box sideways (there is nothing else for it to scroll here).
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    function onWheel(event: WheelEvent) {
      if (!box || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (box.scrollWidth <= box.clientWidth) return;
      event.preventDefault();
      box.scrollLeft += event.deltaY;
    }
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={boxRef}
      role="region"
      aria-label="The codes shown and the codes you typed, side by side. Scroll left and right."
      tabIndex={0}
      className="relative w-full shrink-0 overflow-x-auto overflow-y-hidden border border-line bg-canvas py-2 pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div
        className="grid w-max items-center"
        style={{ gridTemplateColumns: `${LABEL_WIDTH}px repeat(${count}, ${TILE}px)`, columnGap: GAP, rowGap: ROW_GAP }}
      >
        {/* Row 1 is the position numbers, row 2 the shown codes, row 3 the typed ones, row 4 the marks.
            The grid is filled a row at a time, so each Column below puts its four cells in their rows. */}
        <RowLabel>#</RowLabel>
        {Array.from({ length: count }, (_, i) => (
          <div key={`n${i}`} className="text-center text-xs tabular-nums text-muted">
            {i + 1}
          </div>
        ))}
        <RowLabel>Shown</RowLabel>
        {Array.from({ length: count }, (_, i) =>
          shown[i] !== undefined ? (
            <CodeComponent key={`s${i}`} digits={shown[i]} isSet size={TILE} showLabel={false} tabbable={false} />
          ) : (
            <Empty key={`s${i}`} label="no code was shown here" />
          ),
        )}
        <RowLabel>You typed</RowLabel>
        {Array.from({ length: count }, (_, i) => {
          const typed = placed[i];
          if (typed === undefined) return <Empty key={`t${i}`} label="nothing typed here" />;
          const correct = typed === shown[i];
          return (
            <CodeComponent
              key={`t${i}`}
              digits={typed}
              isSet={isSet(typed)}
              size={TILE}
              showLabel={false}
              tabbable={false}
              className={
                correct
                  ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas"
                  : "ring-2 ring-danger ring-offset-2 ring-offset-canvas"
              }
            />
          );
        })}
        <RowLabel>Result</RowLabel>
        {Array.from({ length: count }, (_, i) => {
          const typed = placed[i];
          const correct = typed !== undefined && typed === shown[i];
          return (
            <div
              key={`m${i}`}
              className={`text-center text-sm font-bold ${
                typed === undefined ? "text-muted" : correct ? "text-accent" : "text-danger"
              }`}
            >
              {typed === undefined ? "—" : correct ? "✓" : "✗"}
              <span className="sr-only">{typed === undefined ? "not typed" : correct ? "correct" : "wrong"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
