import { useEffect, useState } from "react";

type Health = { status: string; database: string };

// What the status card can show. Using a union type means TypeScript forces us
// to handle every case when we render.
type Status =
  | { kind: "loading" }
  | { kind: "reachable"; health: Health }
  | { kind: "unreachable" };

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block size-2.5 rounded-full ${ok ? "bg-emerald-400" : "bg-rose-400"}`}
      aria-hidden="true"
    />
  );
}

export default function App() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  // Ask the API how it's doing once, when the page first loads.
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/health", { signal: controller.signal })
      .then((res) => res.json() as Promise<Health>) // 503 also returns JSON
      .then((health) => setStatus({ kind: "reachable", health }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus({ kind: "unreachable" });
      });

    return () => controller.abort(); // cancel if the component goes away
  }, []);

  const serverUp = status.kind === "reachable";
  const databaseUp = status.kind === "reachable" && status.health.database === "up";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-900 px-6 py-10 text-slate-100">
      <h1 className="text-4xl font-bold tracking-tight">Hello</h1>
      <p className="text-center text-slate-400">Something new is on its way.</p>

      <section
        aria-label="System status"
        className="w-full max-w-xs rounded-2xl bg-slate-800 p-5 text-sm"
      >
        {status.kind === "loading" ? (
          <p className="text-slate-400">Checking…</p>
        ) : (
          <ul className="space-y-3">
            <li className="flex items-center justify-between">
              <span>Server</span>
              <span className="flex items-center gap-2">
                <Dot ok={serverUp} />
                {serverUp ? "running" : "unreachable"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Database</span>
              <span className="flex items-center gap-2">
                <Dot ok={databaseUp} />
                {databaseUp ? "connected" : "down"}
              </span>
            </li>
          </ul>
        )}
      </section>
    </main>
  );
}
