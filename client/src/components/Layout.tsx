import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth";
import { navButton } from "./ui";

// The frame around every screen: the app title, a small account bar, and
// whichever page is currently showing (<Outlet />).
export default function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutFailed, setLogoutFailed] = useState(false);

  async function handleLogout() {
    setLogoutFailed(false);
    try {
      await logout();
      navigate("/");
    } catch {
      setLogoutFailed(true);
    }
  }

  return (
    // The page itself never scrolls: the title and account bar are pinned at the top and only
    // the area below them (<main>) can scroll, if a page really has more than fits.
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-900 text-slate-100">
      {/* The top padding keeps the title clear of the iPhone notch. */}
      <header className="shrink-0 px-6 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] text-center">
        <Link to="/" className="inline-flex min-h-11 items-center rounded-lg px-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300">
          <h1 className="text-3xl font-bold tracking-tight">Memodeum</h1>
        </Link>
        {/* Short screens need every pixel, so the tagline goes away there. */}
        <p className="text-sm text-slate-400 [@media(max-height:640px)]:hidden">Memory trainer</p>
      </header>

      {/* Reserve the bar's height while loading so the page doesn't jump. */}
      <nav aria-label="Account" className="mx-auto flex min-h-11 w-full max-w-5xl shrink-0 flex-wrap items-center justify-center gap-1 px-4">
        {loading ? null : user ? (
          <>
            <span className="max-w-[10rem] truncate px-3 text-sm text-slate-400" title={user.username}>
              {user.username}
            </span>
            <Link to="/codes" className={navButton}>
              Codes
            </Link>
            {user.isAdmin && (
              <Link to="/admin" className={navButton}>
                Admin
              </Link>
            )}
            <button type="button" onClick={handleLogout} className={navButton}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={navButton}>
              Log in
            </Link>
            <Link to="/signup" className={navButton}>
              Sign up
            </Link>
          </>
        )}
      </nav>
      {logoutFailed && (
        <p role="alert" className="shrink-0 px-6 pt-2 text-center text-sm text-rose-300">
          Couldn't log out. Check your connection and try again.
        </p>
      )}

      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-y-auto px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <Outlet />
      </main>
    </div>
  );
}
