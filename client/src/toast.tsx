import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// A small message that pops up at the bottom of the screen and goes away by
// itself after a few seconds (or when tapped). Any screen can call
// useToast().show("..."). It lives above the pages, so a message survives a
// change of page, for example after saving and returning to the Edit screen.

const SHOW_FOR_MS = 4000;

interface ToastContextValue {
  show(message: string): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const nextId = useRef(0);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((message: string) => {
    window.clearTimeout(timer.current);
    nextId.current += 1;
    setToast({ id: nextId.current, message });
    timer.current = window.setTimeout(() => setToast(null), SHOW_FOR_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* The live region is always on the page, so screen readers announce a message when it appears. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {toast && (
          <button
            key={toast.id}
            type="button"
            onClick={dismiss}
            className="pointer-events-auto min-h-11 max-w-sm rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold text-slate-900 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
          >
            {toast.message}
          </button>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside <ToastProvider>");
  return value;
}
