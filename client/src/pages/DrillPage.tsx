import { useState } from "react";
import DrillGame from "../components/DrillGame";
import CodesGate from "../components/CodesGate";

type Mode = "code-to-text" | "text-to-code";

const modes: { id: Mode; label: string }[] = [
  { id: "code-to-text", label: "Code → Description" },
  { id: "text-to-code", label: "Description → Code" },
];

// "Drill" sub-tab: practice games. A switch at the top picks the mode.
//  - Code → Description: you see a code and type its description.
//  - Description → Code: the same game the other way around, but the whole code has to be typed.
export default function DrillPage() {
  const [mode, setMode] = useState<Mode>("code-to-text");

  return (
    <section aria-label="Drill" className="-mx-1 flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto px-1">
      <div role="group" aria-label="Drill mode" className="flex w-full max-w-sm shrink-0 gap-2">
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

      <CodesGate>
        {/* The key gives each game a fresh start when you switch between them. */}
        <DrillGame key={mode} direction={mode} />
      </CodesGate>
    </section>
  );
}
