import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

// The account button in the corner of the title bar. It opens a small panel with who you are
// signed in as, Admin (admins only) and Log out. It closes when you pick something, press Escape,
// click or tab away, or go to another page.

const itemClass =
  "flex min-h-12 w-full items-center px-4 text-left font-display text-xs tracking-wide text-fg hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand";

interface AccountMenuProps {
  username: string;
  isAdmin: boolean;
  onLogout: () => void;
}

export default function AccountMenu({ username, isAdmin, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  // Going to another page closes the panel.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      // Tabbing out of the panel closes it.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={`Account menu, ${username}`}
        onClick={() => setOpen(!open)}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 border-2 border-line-strong px-2 font-display text-xs tracking-wide hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          open ? "bg-surface" : ""
        }`}
      >
        {/* A plain head-and-shoulders icon: two blocks. */}
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="h-5 w-5 shrink-0 text-brand" fill="currentColor">
          <rect x="6" y="2" width="8" height="8" />
          <rect x="2" y="12" width="16" height="6" />
        </svg>
        <span className="hidden max-w-[8rem] truncate sm:inline">{username}</span>
      </button>

      {open && (
        <div
          id="account-menu"
          className="absolute right-0 top-full z-30 mt-1 w-56 border-2 border-line-strong bg-surface"
        >
          <p className="border-b-2 border-line px-4 py-3 text-xs text-muted">
            Signed in as
            <span className="block truncate text-sm font-semibold text-fg">{username}</span>
          </p>
          {isAdmin && (
            <Link to="/admin" className={itemClass}>
              Admin
            </Link>
          )}
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
