import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth";
import { useCodes } from "../codes";
import { buildTrie, isUniquelyIdentified, normalizeText, type Trie } from "../drill/trie";
import { nextTyped } from "../drill/typing";
import CodeComponent from "./CodeComponent";
import { inputField, primaryButton, textLink } from "./ui";

// The "code to description" drill. A code is shown; the user types the text
// they saved for it. The box only accepts letters that continue the real
// text, and as soon as what's typed can only mean that one code (see
// drill/trie.ts) it scores and a new random code appears. One round lasts a minute.
//
// Only codes that are set, and fit the user's current code system, are used.

const ROUND_SECONDS = 60;

interface Item {
  code: string;
  /** The saved text, lowercased with whitespace squeezed (what has to be typed). */
  target: string;
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
        .map((entry) => ({ code: entry.code, target: normalizeText(entry.text) }))
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
  const [jiggles, setJiggles] = useState(0); // goes up on every score; used to restart the animation
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
    setJiggles(0);
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
      setCurrent(pick(pool)); // may be the same code again; the jiggle shows it counted
      setTyped("");
      setJiggles((n) => n + 1);
    } else {
      setTyped(next);
    }
  }

  const running = phase === "running";

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5">
      {phase === "idle" && (
        <>
          <p className="text-center text-sm text-muted">
            You'll see a code. Type the description you saved for it. As soon as what you've typed can only mean that
            code, it scores and a new one appears. You have {ROUND_SECONDS} seconds.
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
          <div className="flex w-full items-baseline justify-between text-slate-100">
            <p className="text-lg font-semibold">Score: {score}</p>
            <p className="text-lg font-semibold tabular-nums" aria-label={`${secondsLeft} seconds left`}>
              {formatTime(secondsLeft)}
            </p>
          </div>
          {/* Tapping the tile must not take the keyboard away from the text box. */}
          <div key={jiggles} className={jiggles > 0 ? "animate-jiggle" : ""} onMouseDown={(e) => e.preventDefault()}>
            {current && <CodeComponent digits={current.code} isSet size="min(45vw, 10rem)" showLabel={false} />}
          </div>
        </>
      )}

      {phase === "finished" && (
        <div role="status" className="flex w-full flex-col items-center gap-4">
          <p className="text-xl font-bold text-slate-100">Time's up!</p>
          <p className="text-lg text-slate-100">
            Your score: <span className="font-bold text-accent">{score}</span>
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
        className={running ? `${inputField} border-slate-600` : "sr-only"}
      />
    </div>
  );
}
