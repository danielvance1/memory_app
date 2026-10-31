import { NavLink, Navigate, Outlet } from "react-router";
import { useAuth } from "../auth";

// To add a sub-tab: add a line here and a matching <Route> in App.tsx.
const subTabs = [
  { to: "edit", label: "Edit" },
  { to: "all", label: "All Codes" },
  { to: "drill", label: "Drill" },
];

// The frame for everything under /codes: a pinned row of sub-tabs, then whichever
// sub-tab is selected (<Outlet />) filling the rest of the screen.
export default function CodesPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Pinned: the tabs never move. They only scroll sideways inside themselves if there are ever more than fit. */}
      <nav aria-label="Codes sections" className="mb-3 flex shrink-0 overflow-x-auto border-b border-line">
        {subTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `inline-flex min-h-11 shrink-0 items-center border-b-4 px-4 font-display text-xs tracking-wide focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
                isActive
                  ? "border-brand text-fg"
                  : "border-transparent text-muted hover:text-fg"
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
