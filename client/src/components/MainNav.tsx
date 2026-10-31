import { NavLink } from "react-router";
import { useAuth } from "../auth";

// The main places you can go. One set of links drawn in two spots (Layout.tsx picks which shows):
//   "bottom": a bar along the bottom edge on phones, easy to reach with a thumb.
//   "top":    a row in the title bar from 640px wide up.
// Logged in you get Codes, Practice and About; logged out you get About, Log in and Sign up.

const loggedInLinks = [
  { to: "/codes", label: "Codes" },
  { to: "/practice", label: "Practice" },
  { to: "/about", label: "About" },
];
const loggedOutLinks = [
  { to: "/about", label: "About" },
  { to: "/login", label: "Log in" },
  { to: "/signup", label: "Sign up" },
];

const focus = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand";

export default function MainNav({ placement }: { placement: "top" | "bottom" }) {
  const { user, loading } = useAuth();
  const links = loading ? [] : user ? loggedInLinks : loggedOutLinks;

  if (placement === "top") {
    return (
      <nav aria-label="Main" className="ml-4 hidden items-stretch sm:flex">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `inline-flex items-center border-b-4 px-4 font-display text-xs tracking-wide ${focus} ${
                isActive ? "border-brand text-fg" : "border-transparent text-muted hover:text-fg"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    // The bar's height is reserved while loading so the page doesn't jump.
    <nav aria-label="Main" className="min-h-14 shrink-0 border-t-2 border-line pb-[env(safe-area-inset-bottom)] sm:hidden">
      <div className="grid grid-cols-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex min-h-14 items-center justify-center border-t-4 px-1 text-center font-display text-xs tracking-wide ${focus} ${
                isActive ? "border-brand text-fg" : "border-transparent text-muted active:bg-raised"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
