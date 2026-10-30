import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth";
import { useCodes } from "../codes";
import { buildTrie, isUniquelyIdentified, normalizeText, type Trie } from "../drill/trie";
import { isFullMatch, nextTyped } from "../drill/typing";
import { drillTileSize } from "../tileSizing";
import { useAreaSize } from "../useAreaSize";
import Celebration from "./Celebration";
import CodeComponent from "./CodeComponent";
import { inputField, primaryButton, secondaryButton, textLink } from "./ui";

// The two drill games, one component. Each round lasts a minute and uses only
// codes that are set and fit the user's current code system.
//
//  - "code-to-text": a code is shown; the user types the text they saved for
//    it. As soon as what's typed can only mean that one code (see
//    drill/trie.ts) it scores.
//  - "text-to-code": a description is shown; the user types the digits of its
//    code. Nothing is guessed from a start: the WHOLE code has to be typed
//    (no trie).
//
// In both, the box only accepts the next correct character, so a wrong key
// simply doesn't appear. On a score, confetti flies out, the full correct
// answer is shown, and a new random item appears.
//
// "Show answer" reveals what has to be typed when the user can't remember it.
// They still have to type it to score, and every item they peeked at is counted
// separately ("Peeked"), at most once per item shown.
//
// Everything is sized to the room available so the screen doesn't scroll: the
// prompt scales with the height, and the answer box in the middle takes
// whatever is left (it scrolls inside itself if a long answer needs more).

export type DrillDirection = "code-to-text" | "text-to-code";

const ROUND_SECONDS = 60;

interface Item {
  code: string;
  /** The saved text as the user wrote it (capital letters kept), whitespace squeezed. For showing. */
  display: string;
  /** What has to be typed: the text lowercased with whitespace squeezed, or the code's digits. */
  target: string;
}

type Phase = "idle" | "running" | "finished";

function pick(items: Item[]): Item {
  return items[Math.floor(Math.random() * items.length)];
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// Everything that differs between the two games.
const games = {
  "code-to-text": {
    inputLabel: "Type the description of the code shown",
    intro: (seconds: number) =>
      `You'll see a code. Type the description you saved for it. As soon as what you've typed can only mean that code, it scores and a new one appears. Stuck? "Show answer" reveals it (you still have to type it, and it's counted as a peek). You have ${seconds} seconds.`,
    target: (code: string, text: string) => normalizeText(text),
    revealed: (item: Item) => item.display,
    correct: (item: Item) => `Code ${item.code}: ${item.display}`,
  },
  "text-to-code": {
    inputLabel: "Type the code for the description shown",
    intro: (seconds: number) =>
      `You'll see a description. Type the digits of its code: all of them, one at a time. A new description appears once the whole code is in. Stuck? "Show answer" reveals it (you still have to type it, and it's counted as a peek). You have ${seconds} seconds.`,
    target: (code: string) => code,
    revealed: (item: Item) => `Code ${item.code}`,
    correct: (item: Item) => `${item.display} is code ${item.code}`,
  },
} as const;

export default function DrillGame({ direction }: { direction: DrillDirection }) {
  const game = games[direction];
  const textToCode = direction === "text-to-code";
  const { user } = useAuth();
  const { entries } = useCodes();
  const system = user?.codeSystem ?? 1;

  const available = useMemo<Item[]>(
    () =>
      entries
        .filter((entry) => entry.code.length <= system)
        .map((entry) => ({
          code: entry.code,
          display: entry.text.replace(/\s+/g, " ").trim(),
          target: game.target(entry.code, entry.text),
        }))
        .filter((item) => item.display !== ""),
    [entries, system, game],
  );
  const hasSetCodesOutsideSystem = entries.some((entry) => entry.text.trim() !== "") && available.length === 0;

  const [phase, setPhase] = useState<Phase>("idle");
  const [pool, setPool] = useState<Item[]>([]);
  const [trie, setTrie] = useState<Trie | null>(null);
  const [current, setCurrent] = useState<Item | null>(null);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [answered, setAnswered] = useState<Item | null>(null); // the item just scored, so its full answer can be shown
  const [bursts, setBursts] = useState(0); // goes up on every score; a new number makes a fresh burst of confetti
  const [revealed, setRevealed] = useState(false); // has "Show answer" been used for the item on screen?
  const [peeks, setPeeks] = useState(0); // how many items this round the answer was revealed for
  const areaRef = useRef<HTMLDivElement>(null);
  const { width, height } = useAreaSize(areaRef);
  const tileSize = drillTileSize(width, height);
  const endsAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function start() {
    if (available.length === 0) return;
    // The round uses a snapshot of the codes taken now.
    setPool(available);
    setTrie(textToCode ? null : buildTrie(available.map((item) => item.target)));
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
    if (phase !== "running" || current === null) return;
    const next = nextTyped(typed, event.target.value, current.target);
    // text-to-code needs the whole code; code-to-text is done as soon as the start can only mean this text.
    const done = textToCode ? isFullMatch(next, current.target) : trie !== null && isUniquelyIdentified(trie, next, current.target);
    if (done) {
      setScore((s) => s + 1);
      setAnswered(current);
      setCurrent(pick(pool)); // may be the same item again; the confetti shows it counted
      setTyped("");
      setBursts((n) => n + 1);
      setRevealed(false); // the next item starts hidden again
    } else {
      setTyped(next);
    }
  }

  // Shows the answer for the item on screen. Counted once per item, however often it's pressed.
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
          <p className="text-center text-sm text-muted">{game.intro(ROUND_SECONDS)}</p>
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

          {/* One box for messages, above the prompt so a phone keyboard doesn't cover it. It shows the revealed answer
              for the item on screen, or else the full correct answer for the one you just got (not when the same
              item comes up again, since that would give its answer away). It keeps a minimum height so the screen
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
                <span className="font-semibold text-indigo-300">Answer:</span> {game.revealed(current)}
              </p>
            ) : (
              answered &&
              current &&
              answered.code !== current.code && (
                <p key={bursts} className="break-words rounded-xl bg-accent/15 px-4 py-2 text-center text-sm text-slate-100">
                  <span className="font-semibold text-accent">Correct!</span> {game.correct(answered)}
                </p>
              )
            )}
          </div>

          {/* Tapping the prompt must not take the keyboard away from the text box. The key makes a new prompt
              (and so a fresh burst of confetti) for every score. */}
          {textToCode ? (
            <div
              key={bursts}
              className={`relative flex min-h-24 w-full max-w-sm flex-1 flex-col rounded-2xl border-2 border-accent bg-tile ${bursts > 0 ? "celebrate-flash" : ""}`}
              style={{ maxHeight: "18rem" }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {/* my-auto centres short text; long text scrolls inside the card. */}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <p className="my-auto break-words text-center text-xl font-semibold text-slate-100">{current?.display}</p>
              </div>
              {bursts > 0 && <Celebration />}
            </div>
          ) : (
            <div
              key={bursts}
              className={`relative shrink-0 ${bursts > 0 ? "celebrate-flash" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
            >
              {current && <CodeComponent digits={current.code} isSet size={tileSize} showLabel={false} />}
              {bursts > 0 && <Celebration />}
            </div>
          )}

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
        aria-label={game.inputLabel}
        aria-hidden={!running}
        tabIndex={running ? 0 : -1}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="done"
        // The code is only digits, so phones can show the number pad.
        inputMode={textToCode ? "numeric" : "text"}
        className={running ? `${inputField} shrink-0 border-slate-600` : "sr-only"}
      />
    </div>
  );
}
