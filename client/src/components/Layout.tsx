import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth";
import AccountMenu from "./AccountMenu";
import LogoM from "./LogoM";
import MainNav from "./MainNav";

// True while a text box has the keyboard focus. On a phone the on-screen keyboard takes half the
// screen, so the bottom bar steps aside until you leave the box.
function useTextBoxFocused() {
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const isTextBox = (el: EventTarget | null) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    const onIn = (e: FocusEvent) => setFocused(isTextBox(e.target));
    // Moving from one box straight into another must not flash the bar back.
    const onOut = (e: FocusEvent) => setFocused(isTextBox(e.relatedTarget));
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return focused;
}

// The frame around every screen, top to bottom:
//   the title bar (title, main links from 640px wide up, and the account menu),
//   the page that is showing (<Outlet />),
//   and on phones, the main links as a bar along the bottom.
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutFailed, setLogoutFailed] = useState(false);
  const textBoxFocused = useTextBoxFocused();

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
    // The page itself never scrolls: the title bar and the bottom bar are pinned, and only the area
    // between them (<main>) can scroll, if a page really has more than fits.
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-fg">
      {/* The top padding keeps the title clear of the iPhone notch. "relative z-20" lets the account menu float over the page. */}
      <header className="relative z-20 shrink-0 border-b-2 border-line pt-[max(0.25rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex min-h-14 w-full max-w-5xl items-stretch px-3 sm:px-6">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center self-center px-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          >
            <div>
              {/* The logo's M stands in for the first letter. Screen readers get the real name from the label;
                  the drawn pieces are hidden from them. */}
              <h1 aria-label="Memodeum" className="flex items-center text-2xl sm:text-3xl">
                <LogoM className="mr-[0.03em]" />
                <span aria-hidden="true">emodeum</span>
              </h1>
              {/* Only where there is room; phones and short screens need every pixel. */}
              <p className="hidden text-[0.65rem] uppercase tracking-[0.25em] text-muted sm:block [@media(max-height:640px)]:hidden">
                Memory trainer
              </p>
            </div>
          </Link>
          <MainNav placement="top" />
          <div className="ml-auto flex items-center">
            {user && <AccountMenu username={user.username} isAdmin={user.isAdmin} onLogout={handleLogout} />}
          </div>
        </div>
      </header>
      {logoutFailed && (
        <p role="alert" className="shrink-0 px-6 pt-2 text-center text-sm text-danger">
          Couldn't log out. Check your connection and try again.
        </p>
      )}

      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-y-auto px-6 pb-4 pt-3">
        <Outlet />
      </main>

      {/* "hidden" while typing on a phone, so the keyboard doesn't squeeze the page even smaller. */}
      <div className={textBoxFocused ? "hidden" : "contents"}>
        <MainNav placement="bottom" />
      </div>
    </div>
  );
}
