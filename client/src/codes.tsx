import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

// The logged-in user's codes, available to every screen through useCodes().
// They are loaded from the server once, right after login (or when the page
// opens while logged in), and kept up to date here as the user saves.
//
// A code is "set" when it has text that isn't blank. Codes with no row at all,
// and codes whose row has blank text, are both "not set".

interface CodeRow {
  code: string;
  text: string;
}

interface CodesContextValue {
  /** "loading" until the first answer from the server, "error" if it couldn't be reached. */
  status: "loading" | "ready" | "error";
  /** Try loading again after an error. */
  reload(): void;
  /** True when the code has text that isn't blank. */
  isSet(code: string): boolean;
  /** The saved text for a code, or "" when there is none. */
  getText(code: string): string;
  /** Every row the user has, set or blank, in no particular order. */
  entries: CodeRow[];
  /** Saves text for a code on the server, then updates the screen. Returns the text as saved (trimmed). */
  saveText(code: string, text: string): Promise<string>;
}

const CodesContext = createContext<CodesContextValue | null>(null);

export function CodesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [status, setStatus] = useState<CodesContextValue["status"]>("loading");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0); // bumping this loads again

  // Whenever a different person is logged in (or nobody is), start over, then
  // fetch that person's codes, all of them in one request.
  useEffect(() => {
    setTexts({});
    if (userId === null) {
      setStatus("loading");
      return;
    }

    setStatus("loading");
    const controller = new AbortController();
    api<{ codes: CodeRow[] }>("/api/codes", { signal: controller.signal })
      .then((reply) => {
        setTexts(Object.fromEntries(reply.codes.map((row) => [row.code, row.text])));
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [userId, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const saveText = useCallback(async (code: string, text: string) => {
    const reply = await api<{ code: CodeRow }>(`/api/codes/${code}`, { method: "PUT", body: { text } });
    // Only after the server confirmed, so the screen never shows an unsaved change.
    setTexts((old) => ({ ...old, [reply.code.code]: reply.code.text }));
    return reply.code.text;
  }, []);

  const value = useMemo<CodesContextValue>(
    () => ({
      status,
      reload,
      isSet: (code) => (texts[code] ?? "").trim() !== "",
      getText: (code) => texts[code] ?? "",
      entries: Object.entries(texts).map(([code, text]) => ({ code, text })),
      saveText,
    }),
    [status, reload, texts, saveText],
  );

  return <CodesContext.Provider value={value}>{children}</CodesContext.Provider>;
}

export function useCodes(): CodesContextValue {
  const value = useContext(CodesContext);
  if (!value) throw new Error("useCodes must be used inside <CodesProvider>");
  return value;
}
