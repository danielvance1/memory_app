import { useState } from "react";
import CodesGate from "../components/CodesGate";
import SequenceTest from "../components/SequenceTest";

type Mode = 1 | 2;

const modes: { id: Mode; label: string }[] = [
  { id: 1, label: "Mode 1" },
  { id: 2, label: "Mode 2" },
];

// "Test Memory" sub-tab of Practice (/practice/test), for testing how many codes you can hold in
// your head. The Practice frame (components/SubTabs.tsx) already sends logged-out visitors to log in. A switch at the top picks the mode.
//  - Mode 1: memorize a sequence of your set codes for five minutes, then type it back.
//  - Mode 2: not built yet.
export default function TestMemoryPage() {
  const [mode, setMode] = useState<Mode>(1);

  return (
    <section
      aria-label="Test Memory"
      className="-mx-1 flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto px-1"
    >
      <div role="group" aria-label="Test Memory mode" className="flex w-full max-w-md shrink-0 gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`inline-flex min-h-11 flex-1 items-center justify-center border-2 px-2 font-display text-xs tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              mode === m.id
                ? "border-accent bg-accent text-ink"
                : "border-line-strong text-fg-dim hover:bg-surface"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 1 ? (
        // Waits for the user's codes: the game is made of them.
        <CodesGate>
          <SequenceTest key="mode-1" />
        </CodesGate>
      ) : (
        <p className="py-6 text-center text-lg text-fg-dim">Under construction</p>
      )}
    </section>
  );
}
