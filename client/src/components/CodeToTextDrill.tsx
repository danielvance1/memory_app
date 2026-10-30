import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth";
import { useCodes } from "../codes";
import { buildTrie, isUniquelyIdentified, normalizeText, type Trie } from "../drill/trie";
import { nextTyped } from "../drill/typing";
import { drillTileSize } from "../tileSizing";
import { useAreaSize } from "../useAreaSize";
import Celebration from "./Celebration";
import CodeComponent from "./CodeComponent";
import { inputField, primaryButton, secondaryButton, textLink } from "./ui";

// The "code to description" drill. A code is shown; the user types the text
// they saved for it. The box only accepts letters that continue the real
// text, and as soon as what's typed can only mean that one code (see
// drill/trie.ts) it scores: confetti flies out of the tile, the full correct
// answer is shown, and a new random code appears. One round lasts a minute.
//
// "Show answer" reveals the text for the code on screen when the user can't
// remember it. They still have to type it to score, and every code they peeked
// at is counted separately ("Peeked"), at most once per code shown.
//
// Everything is sized to the room available so the screen doesn't scroll: the
// tile scales with the height, and the answer box in the middle takes
// whatever is left (it scrolls inside itself if a long answer needs more).
//
// Only codes that are set, and fit the user's current code system, are used.

const ROUND_SECONDS = 60;

interface Item {
  code: string;
  /** The saved text, lowercased with whitespace squeezed (what has to be typed). */
  target: string;
  /** The saved text as the user wrote it (capital letters kept), whitespace squeezed. For showing the answer. */
  display: string;
}

type Phase = "idle" | "running" | "finished";

function pick(items: Item[]): Item {
  return items[Math.floor(Math.random() * items.length)];
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function CodeToTextDrill() {
  const { user } = useAuth();
  const { entries } = useCodes();
  const system = user?.codeSystem ?? 1;

  const available = useMemo<Item[]>(
    () =>
      entries
        .filter((entry) => entry.code.length <= system)
        .map((entry) => ({
          code: entry.code,
          target: normalizeText(entry.text),
          display: entry.text.replace(/\s+/g, " ").trim(),
        }))
        .filter((item) => item.target !== ""),
    [entries, system],
  );
  const hasSetCodesOutsideSystem = entries.some((entry) => normalizeText(entry.text) !== "") && available.length === 0;

  const [phase, setPhase] = useState<Phase>("idle");
  const [pool, setPool] = useState<Item[]>([]);
  const [trie, setTrie] = useState<Trie | null>(null);
  const [current, setCurrent] = useState<Item | null>(null);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [answered, setAnswered] = useState<Item | null>(null); // the code just scored, so its full answer can be shown
  const [bursts, setBursts] = useState(0); // goes up on every score; a new number makes a fresh burst of confetti
  const [revealed, setRevealed] = useState(false); // has "Show answer" been used for the code on screen?
  const [peeks, setPeeks] = useState(0); // how many codes this round the answer was revealed for
  const areaRef = useRef<HTMLDivElement>(null);
  const { width, height } = useAreaSize(areaRef);
  const tileSize = drillTileSize(width, height);
  const endsAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function start() {
    if (available.length === 0) return;
    // The round uses a snapshot of the codes taken now.
    setPool(available);
    setTrie(buildTrie(available.map((item) => item.target)));
    setCurrent(pick(available));
    setTyped("");
    setScore(0);
    setAnswered(null);
    setBursts(0);
    setRevealed(false);
    setPeeks(0);
    setSecondsLeft(ROUND_SECONDS);
    endsAt.current = Date.now() + ROUND_SECONDS * 1000;
    setPhase("running");
    // Focus inside the tap itself, so a phone opens its keyboard right away.
    inputRef.current?.focus();
  }

  // The countdown. It measures against the clock rather than counting ticks, so it can't drift.
  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        setPhase("finished");
        inputRef.current?.blur();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (phase !== "running" || current === null || trie === null) return;
    const next = nextTyped(typed, event.target.value, current.target);
    if (isUniquelyIdentified(trie, next, current.target)) {
      setScore((s) => s + 1);
      setAnswered(current);
      setCurrent(pick(pool)); // may be the same code again; the confetti shows it counted
      setTyped("");
      setBursts((n) => n + 1);
      setRevealed(false); // the next code starts hidden again
    } else {
      setTyped(next);
    }
  }

  // Shows the answer for the code on screen. Counted once per code, however often it's pressed.
  function reveal() {
    if (phase !== "running" || revealed) return;
    setRevealed(true);
    setPeeks((n) => n + 1);
  }

  const running = phase === "running";

  return (
    <div ref={areaRef} className="flex min-h-0 w-full max-w-sm flex-1 flex-col items-center gap-3">
      {phase === "idle" && (
        <>
          <p className="text-center text-sm text-muted">
            You'll see a code. Type the description you saved for it. As soon as what you've typed can only mean that
            code, it scores and a new one appears. Stuck? "Show answer" reveals it (you still have to type it, and it's
            counted as a peek). You have {ROUND_SECONDS} seconds.
          </p>
          {available.length === 0 && (
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
          <button type="button" className={primaryButton} disabled={available.length === 0} onClick={start}>
            Start
          </button>
        </>
      )}

      {running && (
        <>
          <div className="flex w-full shrink-0 items-baseline justify-between text-base font-semibold text-slate-100">
            <p>Score: {score}</p>
            <p>Peeked: {peeks}</p>
            <p className="tabular-nums" aria-label={`${secondsLeft} seconds left`}>
              {formatTime(secondsLeft)}
            </p>
          </div>

          {/* One box for messages, above the tile so a phone keyboard doesn't cover it. It shows the revealed answer
              for the code on screen, or else the full correct answer for the code you just got (not when the same
              code comes up again, since that would give its answer away). It keeps a minimum height so the screen
              doesn't jump, and scrolls inside itself when a long answer doesn't fit. */}
          <div
            className="min-h-14 w-full shrink overflow-y-auto"
            aria-live="polite"
            // A soft fade along the bottom edge, so text that is cut off there reads as "there's more, scroll".
            style={{
              maskImage: "linear-gradient(to bottom, black calc(100% - 14px), transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 14px), transparent)",
            }}
          >
            {revealed && current ? (
              <p className="break-words rounded-xl bg-indigo-500/20 px-4 py-2 text-center text-sm text-slate-100">
                <span className="font-semibold text-indigo-300">Answer:</span> {current.display}
              </p>
            ) : (
              answered &&
              current &&
              answered.code !== current.code && (
                <p key={bursts} className="break-words rounded-xl bg-accent/15 px-4 py-2 text-center text-sm text-slate-100">
                  <span className="font-semibold text-accent">Correct!</span> Code {answered.code}: {answered.display}
                </p>
              )
            )}
          </div>

          {/* Tapping the tile must not take the keyboard away from the text box. The key makes a new tile
              (and so a fresh burst of confetti) for every score. */}
          <div
            key={bursts}
            className={`relative shrink-0 ${bursts > 0 ? "celebrate-flash" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
          >
            {current && <CodeComponent digits={current.code} isSet size={tileSize} showLabel={false} />}
            {bursts > 0 && <Celebration />}
          </div>

          {/* Same: pressing this keeps the keyboard open. */}
          <button
            type="button"
            className={`${secondaryButton} min-h-11! shrink-0`}
            disabled={revealed}
            onMouseDown={(e) => e.preventDefault()}
            onClick={reveal}
          >
            {revealed ? "Answer shown" : "Show answer"}
          </button>
        </>
      )}

      {phase === "finished" && (
        <div role="status" className="flex w-full flex-col items-center gap-3">
          <p className="text-xl font-bold text-slate-100">Time's up!</p>
          <p className="text-lg text-slate-100">
            Your score: <span className="font-bold text-accent">{score}</span>
          </p>
          <p className="text-base text-slate-300">
            Answers peeked: <span className="font-bold text-indigo-300">{peeks}</span>
          </p>
          <button type="button" className={primaryButton} onClick={start}>
            Try again
          </button>
        </div>
      )}

      {/* Always on the page (hidden while not playing) so Start can focus it inside the tap, which phones need to open the keyboard. */}
      <input
        ref={inputRef}
        type="text"
        value={typed}
        onChange={handleChange}
        aria-label="Type the description of the code shown"
        aria-hidden={!running}
        tabIndex={running ? 0 : -1}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="done"
        className={running ? `${inputField} shrink-0 border-slate-600` : "sr-only"}
      />
    </div>
  );
}
