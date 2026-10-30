import { memo, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth";
import { useCodes } from "../codes";
import {
  MAX_CODES,
  MAX_RECALL_DIGITS,
  MEMORIZE_SECONDS,
  extendSequence,
  scoreRecall,
  usableCodes,
} from "../memory/sequence";
import { gridTileSizeForWidth, memoryTileSize } from "../tileSizing";
import { useAreaSize } from "../useAreaSize";
import { useElementSize } from "../useElementSize";
import CodeCarousel from "./CodeCarousel";
import CodeComponent from "./CodeComponent";
import RecallComparison from "./RecallComparison";
import { inputField, primaryButton, secondaryButton, textLink } from "./ui";

// Test Memory, mode 1. Three steps:
//
//  1. Memorize (5 minutes). Codes the user has already set (and that fit their
//     current code system), picked at random, one in the middle of the screen with the
//     previous and next beside it at half brightness. Move with the buttons, the
//     left/right arrow keys or a swipe. Each code is picked the first time it is needed,
//     so only the part of the sequence you reach (plus one code ahead, which is what the
//     right-hand neighbor shows) ever exists. There can be at most 1000, and the same
//     code can come up more than once. "Ready to recall" can end this step early.
//  2. Recall. Type a code of up to 3 digits and press Enter: it is placed in the
//     next position. A placed code is drawn as set only if it really is one of the
//     user's set codes, otherwise grayed out (a handy hint, and fine as a cheat).
//     Up to 1000 can be placed. "Finish" ends this step.
//  3. Result. How many placed codes match the shown ones, position by position, and a
//     box that scrolls left and right showing the shown codes with what was typed under them.

type Phase = "idle" | "memorize" | "recall" | "results";

const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// One placed code, drawn as set only if it really is a set code. memo means it is only
// redrawn if its own digits (or its look) change, so placing the 900th code doesn't redraw
// the 899 before it.
const PlacedTile = memo(function PlacedTile({ digits, isSet, size }: { digits: string; isSet: boolean; size: number }) {
  return <CodeComponent digits={digits} isSet={isSet} size={size} showLabel={false} tabbable={false} />;
});

export default function SequenceTest() {
  const { user } = useAuth();
  const { entries } = useCodes();
  const system = user?.codeSystem ?? 1;
  // The codes this test may use: set, and within the current code system.
  const pool = useMemo(() => usableCodes(entries, system), [entries, system]);
  const isSetCode = useMemo(() => {
    const set = new Set(pool);
    return (code: string) => set.has(code);
  }, [pool]);
  const hasSetCodesOutsideSystem = pool.length === 0 && entries.some((entry) => entry.text.trim() !== "");

  const [phase, setPhase] = useState<Phase>("idle");
  // The codes made up so far, and which one is in the middle. Kept together so a move and the
  // making-up of the code beyond it happen as one step.
  const [seq, setSeq] = useState<{ codes: string[]; index: number }>({ codes: [], index: 0 });
  const [placed, setPlaced] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(MEMORIZE_SECONDS);
  const endsAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null); // the placed-codes area, for scrolling it to the newest
  // The round keeps the codes it started with, whatever happens to the user's codes meanwhile.
  const roundPool = useRef<string[]>([]);

  const areaRef = useRef<HTMLDivElement>(null);
  const { width, height } = useAreaSize(areaRef);
  // The placed-codes area only exists during recall, so its width is measured when it appears.
  const [measureGrid, gridSize] = useElementSize<HTMLDivElement>();

  function start() {
    if (pool.length === 0) return;
    roundPool.current = pool;
    setSeq({ codes: extendSequence([], 2, pool), index: 0 }); // the first code and the one beside it
    setPlaced([]);
    setTyped("");
    setSecondsLeft(MEMORIZE_SECONDS);
    endsAt.current = Date.now() + MEMORIZE_SECONDS * 1000;
    setPhase("memorize");
  }

  // Moves to another code (`next` is given the current position and returns the wanted one), keeping
  // it within what exists, and making up the code after it when that is needed.
  function moveTo(next: (current: number) => number) {
    setSeq((s) => {
      const target = Math.max(0, Math.min(next(s.index), s.codes.length - 1, MAX_CODES - 1));
      if (target === s.index) return s;
      return { codes: extendSequence(s.codes, target + 2, roundPool.current), index: target };
    });
  }
  const goTo = (to: number) => moveTo(() => to);
  const move = (step: number) => moveTo((current) => current + step);

  // The memorizing countdown. When it runs out, recall begins.
  useEffect(() => {
    if (phase !== "memorize") return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setPhase("recall");
    }, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  // Left and right arrow keys while memorizing.
  useEffect(() => {
    if (phase !== "memorize") return;
    function onKey(event: KeyboardEvent) {
      const step = KEY_STEP[event.key];
      if (step === undefined) return;
      event.preventDefault();
      move(step);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  // Ready to type as soon as recall begins.
  useEffect(() => {
    if (phase === "recall") inputRef.current?.focus();
  }, [phase]);

  // Keep the newest placed code in view.
  useEffect(() => {
    const grid = gridRef.current;
    if (grid) grid.scrollTop = grid.scrollHeight;
  }, [placed.length]);

  function place(event: FormEvent) {
    event.preventDefault();
    if (typed === "" || placed.length >= MAX_CODES) return;
    const next = [...placed, typed];
    setPlaced(next);
    setTyped("");
    if (next.length >= MAX_CODES) setPhase("results"); // nothing more can be placed
    else inputRef.current?.focus();
  }

  const shown = seq.codes;
  const score = scoreRecall(shown, placed);
  const atFirst = seq.index === 0;
  const atLast = seq.index >= Math.min(shown.length, MAX_CODES) - 1;
  const tileSize = memoryTileSize(width, height);
  const gridTile = gridTileSizeForWidth(Math.max(0, gridSize.width - 8)); // minus the 4px of side room each side

  return (
    <div ref={areaRef} className="flex min-h-0 w-full max-w-md flex-1 flex-col items-center gap-3">
      {phase === "idle" && (
        <>
          <p className="text-center text-sm text-muted">
            You'll see codes you've already set, one at a time, in the middle of the screen. Move through them with the
            arrow buttons, the left and right arrow keys, or a swipe. You have {formatTime(MEMORIZE_SECONDS)} to
            memorize as many as you can, in order. Then you'll type them back, in the same order, and get a score.
          </p>
          {pool.length === 0 && (
            <p className="text-center text-sm text-slate-200">
              {hasSetCodesOutsideSystem
                ? `You have no set codes in your ${system} digit system yet. `
                : "You haven't set any codes yet. "}
              <Link to="/codes/edit" className={textLink}>
                Set some on the Edit tab
              </Link>{" "}
              to play.
            </p>
          )}
          <button type="button" className={primaryButton} disabled={pool.length === 0} onClick={start}>
            Start
          </button>
        </>
      )}

      {phase === "memorize" && (
        <>
          <div className="flex w-full shrink-0 items-baseline justify-between text-base font-semibold text-slate-100">
            <p>
              Code {seq.index + 1} <span className="text-sm font-normal text-muted">of {MAX_CODES} at most</span>
            </p>
            <p className="tabular-nums" aria-label={`${secondsLeft} seconds left`}>
              {formatTime(secondsLeft)}
            </p>
          </div>

          {/* The row sits in the middle of the room that is left. */}
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
            {tileSize > 0 && (
              <CodeCarousel codes={shown} index={seq.index} tileSize={tileSize} onSelect={goTo} />
            )}
          </div>

          <div className="flex w-full shrink-0 gap-3">
            <button type="button" className={secondaryButton} disabled={atFirst} onClick={() => move(-1)}>
              <span aria-hidden="true">←</span>
              <span className="sr-only">Previous code</span>
            </button>
            <button type="button" className={secondaryButton} disabled={atLast} onClick={() => move(1)}>
              <span aria-hidden="true">→</span>
              <span className="sr-only">Next code</span>
            </button>
          </div>
          <button type="button" className={`${primaryButton} min-h-11! shrink-0`} onClick={() => setPhase("recall")}>
            Ready to recall
          </button>
        </>
      )}

      {phase === "recall" && (
        <>
          <div className="flex w-full shrink-0 items-baseline justify-between text-base font-semibold text-slate-100">
            <p>Recall the codes in order</p>
            <p className="tabular-nums text-sm text-muted">
              {placed.length} / {MAX_CODES}
            </p>
          </div>

          <form onSubmit={place} className="flex w-full shrink-0 gap-2">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={typed}
              onChange={(e) => setTyped(e.target.value.replace(/\D/g, "").slice(0, MAX_RECALL_DIGITS))}
              maxLength={MAX_RECALL_DIGITS}
              aria-label={`Type a code of up to ${MAX_RECALL_DIGITS} digits, then press Enter`}
              placeholder="Type a code"
              autoComplete="off"
              autoCorrect="off"
              enterKeyHint="enter"
              className={`${inputField} min-w-0 flex-1 border-slate-600`}
            />
            <button type="submit" className={`${primaryButton} w-auto! shrink-0`} disabled={typed === ""}>
              Place
            </button>
          </form>

          {/* The placed codes, in order, ten to a row. This area scrolls on its own when there are many. */}
          <div
            ref={(el) => {
              gridRef.current = el;
              measureGrid(el);
            }}
            aria-label="Placed codes"
            className="-mx-1 min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto px-1"
          >
            {gridTile > 0 && (
              <div
                className="mx-auto grid"
                style={{ gridTemplateColumns: `repeat(10, ${gridTile}px)`, gap: 3, width: "fit-content" }}
              >
                {placed.map((code, i) => (
                  <PlacedTile key={i} digits={code} isSet={isSetCode(code)} size={gridTile} />
                ))}
              </div>
            )}
          </div>

          <div className="flex w-full shrink-0 gap-3">
            <button
              type="button"
              className={secondaryButton}
              disabled={placed.length === 0}
              onClick={() => setPlaced((p) => p.slice(0, -1))}
            >
              Undo last
            </button>
            <button type="button" className={primaryButton} onClick={() => setPhase("results")}>
              Finish
            </button>
          </div>
        </>
      )}

      {phase === "results" && (
        <>
          <div role="status" className="flex w-full shrink-0 flex-col items-center gap-1">
            <p className="text-lg font-bold text-slate-100">
              Your score:{" "}
              <span className="text-2xl font-extrabold text-accent">{score}</span>{" "}
              <span className="text-lg font-semibold text-slate-300">/ {shown.length}</span>
            </p>
            <p className="text-center text-sm text-muted">
              {score} of the {shown.length} codes shown were in the right place. You placed {placed.length}.
            </p>
          </div>
          <RecallComparison shown={shown} placed={placed} isSet={isSetCode} />
          <p className="shrink-0 text-center text-xs text-muted">
            Scroll sideways to compare. A gray tile in your row isn't one of your set codes.
          </p>
          <button type="button" className={`${primaryButton} shrink-0`} onClick={start}>
            Try again
          </button>
        </>
      )}
    </div>
  );
}
