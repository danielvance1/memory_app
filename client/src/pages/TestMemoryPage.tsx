import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../auth";
import SequenceTest from "../components/SequenceTest";

type Mode = 1 | 2;

const modes: { id: Mode; label: string }[] = [
  { id: 1, label: "Mode 1" },
  { id: 2, label: "Mode 2" },
];

// "Test Memory": a top-level page (next to Codes in the account bar) for testing how many
// codes you can hold in your head. A switch at the top picks the mode.
//  - Mode 1: memorize a sequence of codes for five minutes, then type it back.
//  - Mode 2: not built yet.
export default function TestMemoryPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>(1);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

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

      {mode === 1 ? (
        <SequenceTest key="mode-1" />
      ) : (
        <p className="py-6 text-center text-lg text-slate-300">Under construction</p>
      )}
    </section>
  );
}
