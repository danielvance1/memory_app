import { NavLink, Navigate, Outlet } from "react-router";
import { useAuth } from "../auth";

export interface SubTab {
  /** Where the tab goes, relative to the page that holds the tabs ("edit" under /codes). */
  to: string;
  label: string;
}

// The frame for a section with sub-tabs (Codes, Practice): a pinned row of tabs, then whichever
// tab is selected (<Outlet />) filling the rest of the screen. Logged-out visitors are sent to the
// login page. To add a tab: add it to the list passed in and a matching <Route> in App.tsx.
export default function SubTabs({ label, tabs }: { label: string; tabs: SubTab[] }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Pinned: the tabs never move. They only scroll sideways inside themselves if there are ever more than fit. */}
      <nav aria-label={label} className="mb-3 flex shrink-0 overflow-x-auto border-b border-line">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `inline-flex min-h-11 shrink-0 items-center border-b-4 px-4 font-display text-xs tracking-wide focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
                isActive ? "border-brand text-fg" : "border-transparent text-muted hover:text-fg"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {/* Whichever tab is selected fills all the room under the tabs. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
