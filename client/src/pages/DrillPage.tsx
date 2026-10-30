import { useState } from "react";
import CodeToTextDrill from "../components/CodeToTextDrill";
import CodesGate from "../components/CodesGate";

type Mode = "code-to-text" | "text-to-code";

const modes: { id: Mode; label: string }[] = [
  { id: "code-to-text", label: "Code → Description" },
  { id: "text-to-code", label: "Description → Code" },
];

// "Drill" sub-tab: practice games. A switch at the top picks the mode.
//  - Code → Description: you see a code and type its description.
//  - Description → Code: the same game the other way around (not built yet).
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
            className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border px-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${
              mode === m.id
                ? "border-indigo-400 bg-indigo-500 text-white"
                : "border-slate-600 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <CodesGate>
        {mode === "code-to-text" ? (
          <CodeToTextDrill />
        ) : (
          <p className="py-6 text-center text-lg text-slate-300">Under construction</p>
        )}
      </CodesGate>
    </section>
  );
}
