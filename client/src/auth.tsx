import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type User } from "./api";

// Who is logged in, available to every screen through useAuth().
// The truth lives on the server (in the session cookie); this just remembers
// what the server last told us so screens can show the right thing.

interface AuthContextValue {
  /** True until the first answer from the server about who is logged in. */
  loading: boolean;
  user: User | null;
  login(identifier: string, password: string): Promise<void>;
  signup(username: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // When the page first opens, ask the server who we are (the cookie says).
  useEffect(() => {
    const controller = new AbortController();
    api<{ user: User | null }>("/api/auth/me", { signal: controller.signal })
      .then((reply) => setUser(reply.user))
      .catch(() => {
        // Server unreachable: show the logged-out screens rather than hanging.
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const reply = await api<{ user: User }>("/api/auth/login", { method: "POST", body: { identifier, password } });
    setUser(reply.user);
  }, []);

  const signup = useCallback(async (username: string, email: string, password: string) => {
    const reply = await api<{ user: User }>("/api/auth/signup", {
      method: "POST",
      body: { username, email, password },
    });
    setUser(reply.user);
  }, []);

  const logout = useCallback(async () => {
    await api<void>("/api/auth/logout", { method: "POST" });
    setUser(null); // only after the server confirmed, so we never claim "logged out" falsely
  }, []);

  const value = useMemo(() => ({ loading, user, login, signup, logout }), [loading, user, login, signup, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
